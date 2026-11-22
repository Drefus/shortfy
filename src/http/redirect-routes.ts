import { Router } from 'express';
import type { LinkService } from '../services/link-service.js';
import { asyncHandler } from './async-handler.js';

/** Acesso ao link curto. Deve ser registrado depois das demais rotas, pois captura /:code. */
export function redirectRoutes(service: LinkService): Router {
  const router = Router();

  router.get(
    '/:code',
    asyncHandler(async (req, res) => {
      const destino = await service.resolve(req.params.code ?? '', {
        referrer: req.get('referer'),
        userAgent: req.get('user-agent'),
      });
      res.redirect(302, destino);
    }),
  );

  return router;
}
