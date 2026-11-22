import { AliasTakenError, LinkNotFoundError } from '../domain/errors.js';
import type { Click, Link } from '../domain/link.types.js';
import type { LinkRepository } from './link-repository.types.js';

function copyLink(link: Link): Link {
  return {
    ...link,
    createdAt: new Date(link.createdAt),
    ...(link.expiresAt ? { expiresAt: new Date(link.expiresAt) } : {}),
  };
}

function copyClick(click: Click): Click {
  return { ...click, timestamp: new Date(click.timestamp) };
}

/** Implementação em memória, usada em desenvolvimento, testes e CI (STORAGE=memory). */
export class InMemoryLinkRepository implements LinkRepository {
  /** Map preserva a ordem de inserção, usada como desempate em listRecent. */
  private readonly linksByCode = new Map<string, Link>();
  private readonly clicksByLinkId = new Map<string, Click[]>();

  async save(link: Link): Promise<void> {
    if (this.linksByCode.has(link.code)) {
      throw new AliasTakenError(link.code);
    }
    this.linksByCode.set(link.code, copyLink(link));
    this.clicksByLinkId.set(link.id, []);
  }

  async findByCode(code: string): Promise<Link | null> {
    const link = this.linksByCode.get(code);
    return link ? copyLink(link) : null;
  }

  async existsCode(code: string): Promise<boolean> {
    return this.linksByCode.has(code);
  }

  async registerClick(click: Click): Promise<void> {
    const clicks = this.clicksByLinkId.get(click.linkId);
    if (!clicks) {
      throw new LinkNotFoundError(click.linkId);
    }
    clicks.push(copyClick(click));
  }

  async getClicks(linkId: string): Promise<Click[]> {
    const clicks = this.clicksByLinkId.get(linkId) ?? [];
    return clicks.map(copyClick).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async countClicks(linkId: string): Promise<number> {
    return this.clicksByLinkId.get(linkId)?.length ?? 0;
  }

  async listRecent(limit: number): Promise<Link[]> {
    if (limit <= 0) {
      return [];
    }
    return [...this.linksByCode.values()]
      .map((link, ordem) => ({ link, ordem }))
      .sort((a, b) => b.link.createdAt.getTime() - a.link.createdAt.getTime() || b.ordem - a.ordem)
      .slice(0, limit)
      .map(({ link }) => copyLink(link));
  }
}
