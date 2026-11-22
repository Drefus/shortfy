import { Router, type RequestHandler } from 'express';
import type { LinkService } from '../services/link-service.js';
import { asyncHandler } from './async-handler.js';
import { parseCreateLinkBody } from './create-link-input.js';
import { shortUrlFor } from './view-helpers.js';

export interface LinkRoutesOptions {
  service: LinkService;
  baseUrl: string;
  /** Middleware aplicado apenas à criação de links (ex.: rate limit). */
  createLimiter?: RequestHandler;
}

export function linkRoutes({ service, baseUrl, createLimiter }: LinkRoutesOptions): Router {
  const router = Router();
  const limiters = createLimiter ? [createLimiter] : [];

  router.post(
    '/api/links',
    ...limiters,
    asyncHandler(async (req, res) => {
      const link = await service.createLink(parseCreateLinkBody(req.body));
      res.status(201).json({
        code: link.code,
        shortUrl: shortUrlFor(baseUrl, link.code),
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
        shortUrl: shortUrlFor(baseUrl, link.code),
        originalUrl: link.originalUrl,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt ?? null,
        stats,
      });
    }),
  );

  return router;
}
