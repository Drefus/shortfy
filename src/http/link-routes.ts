import { Router, type RequestHandler } from 'express';
import { InvalidAliasError, InvalidExpirationError, InvalidUrlError } from '../domain/errors.js';
import type { Link } from '../domain/link.types.js';
import type { CreateLinkInput, LinkService } from '../services/link-service.js';
import { asyncHandler } from './async-handler.js';

export interface LinkRoutesOptions {
  service: LinkService;
  baseUrl: string;
  /** Middleware aplicado apenas à criação de links (ex.: rate limit). */
  createLimiter?: RequestHandler;
}

function isBlank(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

/** Converte o corpo da requisição na entrada do serviço; campos opcionais vazios são ignorados. */
function parseCreateBody(body: unknown): CreateLinkInput {
  const { url, alias, expiresAt } = (body ?? {}) as Record<string, unknown>;

  if (typeof url !== 'string') {
    throw new InvalidUrlError('A URL é obrigatória.');
  }
  const input: CreateLinkInput = { url };

  if (!isBlank(alias)) {
    if (typeof alias !== 'string') {
      throw new InvalidAliasError('O alias deve ser um texto.');
    }
    input.alias = alias;
  }
  if (!isBlank(expiresAt)) {
    if (typeof expiresAt !== 'string') {
      throw new InvalidExpirationError('A data de expiração deve ser uma data ISO 8601.');
    }
    input.expiresAt = new Date(expiresAt);
  }
  return input;
}

export function linkRoutes({ service, baseUrl, createLimiter }: LinkRoutesOptions): Router {
  const router = Router();
  const base = baseUrl.replace(/\/+$/, '');
  const shortUrl = (link: Link): string => `${base}/${link.code}`;
  const limiters = createLimiter ? [createLimiter] : [];

  router.post(
    '/api/links',
    ...limiters,
    asyncHandler(async (req, res) => {
      const link = await service.createLink(parseCreateBody(req.body));
      res.status(201).json({
        code: link.code,
        shortUrl: shortUrl(link),
        originalUrl: link.originalUrl,
        expiresAt: link.expiresAt ?? null,
      });
    }),
  );

  router.get(
    '/api/links/:code/stats',
    asyncHandler(async (req, res) => {
      const { link, stats } = await service.getStats(req.params.code ?? '');
      res.json({
        code: link.code,
        shortUrl: shortUrl(link),
        originalUrl: link.originalUrl,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt ?? null,
        stats,
      });
    }),
  );

  return router;
}
