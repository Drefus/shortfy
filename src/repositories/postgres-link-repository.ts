import type { Pool } from 'pg';
import { AliasTakenError, LinkNotFoundError } from '../domain/errors.js';
import type { Click, Device, Link } from '../domain/link.types.js';
import type { LinkRepository } from './link-repository.types.js';

/** Códigos de erro do PostgreSQL usados para traduzir falhas em erros de domínio. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

interface LinkRow {
  id: string;
  code: string;
  original_url: string;
  created_at: Date;
  expires_at: Date | null;
}

interface ClickRow {
  link_id: string;
  occurred_at: Date;
  referrer: string;
  device: Device;
  browser: string;
}

function pgErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    code: row.code,
    originalUrl: row.original_url,
    createdAt: row.created_at,
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
  };
}

function toClick(row: ClickRow): Click {
  return {
    linkId: row.link_id,
    timestamp: row.occurred_at,
    referrer: row.referrer,
    device: row.device,
    browser: row.browser,
  };
}

/** Implementação sobre PostgreSQL (STORAGE=postgres), compatível com o Neon. */
export class PostgresLinkRepository implements LinkRepository {
  constructor(private readonly pool: Pool) {}

  async save(link: Link): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO links (id, code, original_url, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [link.id, link.code, link.originalUrl, link.createdAt, link.expiresAt ?? null],
      );
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
        throw new AliasTakenError(link.code);
      }
      throw error;
    }
  }

  async findByCode(code: string): Promise<Link | null> {
    const { rows } = await this.pool.query<LinkRow>(
      `SELECT id, code, original_url, created_at, expires_at FROM links WHERE code = $1`,
      [code],
    );
    return rows[0] ? toLink(rows[0]) : null;
  }

  async existsCode(code: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`SELECT 1 FROM links WHERE code = $1`, [code]);
    return (rowCount ?? 0) > 0;
  }

  async registerClick(click: Click): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO clicks (link_id, occurred_at, referrer, device, browser)
         VALUES ($1, $2, $3, $4, $5)`,
        [click.linkId, click.timestamp, click.referrer, click.device, click.browser],
      );
    } catch (error) {
      const code = pgErrorCode(error);
      if (code === PG_FOREIGN_KEY_VIOLATION || code === PG_INVALID_TEXT_REPRESENTATION) {
        throw new LinkNotFoundError(click.linkId);
      }
      throw error;
    }
  }

  async getClicks(linkId: string): Promise<Click[]> {
    try {
      const { rows } = await this.pool.query<ClickRow>(
        `SELECT link_id, occurred_at, referrer, device, browser
           FROM clicks WHERE link_id = $1 ORDER BY occurred_at ASC, id ASC`,
        [linkId],
      );
      return rows.map(toClick);
    } catch (error) {
      if (pgErrorCode(error) === PG_INVALID_TEXT_REPRESENTATION) {
        return [];
      }
      throw error;
    }
  }

  async listRecent(limit: number): Promise<Link[]> {
    if (limit <= 0) {
      return [];
    }
    const { rows } = await this.pool.query<LinkRow>(
      `SELECT id, code, original_url, created_at, expires_at
         FROM links ORDER BY created_at DESC, id DESC LIMIT $1`,
      [limit],
    );
    return rows.map(toLink);
  }
}
