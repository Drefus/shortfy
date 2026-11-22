import { randomUUID } from 'node:crypto';
import { validateAlias } from '../domain/alias.js';
import { generateCode } from '../domain/code.js';
import {
  AliasTakenError,
  CodeGenerationError,
  InvalidExpirationError,
  LinkNotFoundError,
} from '../domain/errors.js';
import { assertNotExpired, systemClock, type Clock } from '../domain/expiration.js';
import type { Link } from '../domain/link.types.js';
import { aggregateClicks, type ClickStats } from '../domain/stats/aggregate.js';
import { normalizeReferrer } from '../domain/stats/referrer.js';
import { parseUserAgent } from '../domain/stats/user-agent.js';
import { parseTargetUrl } from '../domain/url-normalization.js';
import type { LinkRepository } from '../repositories/link-repository.types.js';

export const MAX_CODE_ATTEMPTS = 5;

export interface LinkServiceDeps {
  repository: LinkRepository;
  clock?: Clock;
  generateCode?: () => string;
  generateId?: () => string;
  /** Domínio do próprio encurtador, para impedir links que apontem para ele. */
  shortenerHost?: string;
  /** Fuso (IANA) usado para agrupar os cliques por dia nas estatísticas. */
  statsTimeZone?: string;
}

export interface CreateLinkInput {
  url: string;
  alias?: string;
  expiresAt?: Date;
}

/** Dados da requisição de acesso usados para registrar o clique. */
export interface ClickRequestInfo {
  referrer?: string | null;
  userAgent?: string | null;
}

/** Link com o total de cliques, para listagens. */
export interface LinkSummary {
  link: Link;
  totalClicks: number;
}

export interface LinkStats {
  link: Link;
  stats: ClickStats;
}

export class LinkService {
  private readonly repository: LinkRepository;
  private readonly clock: Clock;
  private readonly generateCode: () => string;
  private readonly generateId: () => string;
  private readonly shortenerHost: string | undefined;
  private readonly statsTimeZone: string;

  constructor(deps: LinkServiceDeps) {
    this.repository = deps.repository;
    this.clock = deps.clock ?? systemClock;
    this.generateCode = deps.generateCode ?? (() => generateCode());
    this.generateId = deps.generateId ?? randomUUID;
    this.shortenerHost = deps.shortenerHost;
    this.statsTimeZone = deps.statsTimeZone ?? 'UTC';
  }

  /**
   * Normaliza e valida a URL, e salva o link com o alias informado ou com um
   * código gerado (tentando novamente em caso de colisão).
   */
  async createLink(input: CreateLinkInput): Promise<Link> {
    const originalUrl = parseTargetUrl(input.url, { shortenerHost: this.shortenerHost });
    const now = this.clock();
    this.assertValidExpiration(input.expiresAt, now);

    const code =
      input.alias !== undefined
        ? await this.reserveAlias(input.alias)
        : await this.generateFreeCode();

    const link: Link = {
      id: this.generateId(),
      code,
      originalUrl,
      createdAt: now,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    };
    await this.repository.save(link);
    return link;
  }

  /** Devolve a URL de destino e registra o clique. */
  async resolve(code: string, request: ClickRequestInfo = {}): Promise<string> {
    const link = await this.findLink(code);
    const now = this.clock();
    assertNotExpired(link, now);

    const { device, browser } = parseUserAgent(request.userAgent);
    await this.repository.registerClick({
      linkId: link.id,
      timestamp: now,
      referrer: normalizeReferrer(request.referrer),
      device,
      browser,
    });
    return link.originalUrl;
  }

  /** Estatísticas agregadas do link; disponíveis mesmo depois de expirado. */
  async getStats(code: string): Promise<LinkStats> {
    const link = await this.findLink(code);
    const clicks = await this.repository.getClicks(link.id);
    return { link, stats: aggregateClicks(clicks, this.clock(), this.statsTimeZone) };
  }

  /** Busca o link pelo código; lança LinkNotFoundError quando não existe. */
  async getLink(code: string): Promise<Link> {
    return this.findLink(code);
  }

  /**
   * Busca vários links pelos códigos, com o total de cliques de cada um, na mesma
   * ordem dos códigos e ignorando os que não existem.
   */
  async findLinkSummaries(codes: readonly string[]): Promise<LinkSummary[]> {
    const links = await Promise.all(codes.map((code) => this.repository.findByCode(code)));
    const existentes = links.filter((link): link is Link => link !== null);
    return Promise.all(
      existentes.map(async (link) => ({
        link,
        totalClicks: await this.repository.countClicks(link.id),
      })),
    );
  }

  private async findLink(code: string): Promise<Link> {
    const link = await this.repository.findByCode(code);
    if (!link) {
      throw new LinkNotFoundError(code);
    }
    return link;
  }

  private assertValidExpiration(expiresAt: Date | undefined, now: Date): void {
    if (expiresAt === undefined) {
      return;
    }
    if (Number.isNaN(expiresAt.getTime())) {
      throw new InvalidExpirationError('A data de expiração é inválida.');
    }
    if (expiresAt.getTime() <= now.getTime()) {
      throw new InvalidExpirationError('A data de expiração deve estar no futuro.');
    }
  }

  private async reserveAlias(input: string): Promise<string> {
    const alias = validateAlias(input);
    if (await this.repository.existsCode(alias)) {
      throw new AliasTakenError(alias);
    }
    return alias;
  }

  private async generateFreeCode(): Promise<string> {
    for (let tentativa = 0; tentativa < MAX_CODE_ATTEMPTS; tentativa++) {
      const code = this.generateCode();
      if (!(await this.repository.existsCode(code))) {
        return code;
      }
    }
    throw new CodeGenerationError(MAX_CODE_ATTEMPTS);
  }
}
