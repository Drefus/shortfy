import { Router, type Request, type RequestHandler, type Response } from 'express';
import {
  AliasTakenError,
  InvalidAliasError,
  InvalidExpirationError,
  InvalidUrlError,
  LinkNotFoundError,
} from '../domain/errors.js';
import type { Link } from '../domain/link.types.js';
import { DEVICES } from '../domain/stats/user-agent.js';
import type { LinkService } from '../services/link-service.js';
import { asyncHandler } from './async-handler.js';
import { parseCreateLinkBody } from './create-link-input.js';
import { toHttpError } from './error-handler.js';
import {
  addRecentCode,
  readRecentCodes,
  RECENT_LINKS_COOKIE,
  RECENT_LINKS_MAX_AGE_MS,
  serializeRecentCodes,
} from './recent-links-cookie.js';
import { deviceLabel, formatDay, shortUrlFor } from './view-helpers.js';

export interface PageRoutesOptions {
  service: LinkService;
  baseUrl: string;
  /** Middleware aplicado apenas ao envio do formulário (ex.: rate limit). */
  createLimiter?: RequestHandler;
}

type FormField = 'url' | 'alias' | 'expiresAt';

interface HomeState {
  created?: Link | null;
  values?: Partial<Record<FormField, string>>;
  errors?: Partial<Record<FormField, string>>;
}

/** Campo do formulário ao qual o erro se refere; null para erros que não são de validação. */
function formFieldFor(error: unknown): FormField | null {
  if (error instanceof InvalidUrlError) return 'url';
  if (error instanceof InvalidAliasError || error instanceof AliasTakenError) return 'alias';
  if (error instanceof InvalidExpirationError) return 'expiresAt';
  return null;
}

function formValues(body: unknown): Partial<Record<FormField, string>> {
  const campos = (body ?? {}) as Record<string, unknown>;
  const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '');
  return { url: texto(campos.url), alias: texto(campos.alias), expiresAt: texto(campos.expiresAt) };
}

export function pageRoutes({ service, baseUrl, createLimiter }: PageRoutesOptions): Router {
  const router = Router();
  const limiters = createLimiter ? [createLimiter] : [];

  const toView = (link: Link) => ({
    ...link,
    shortUrl: shortUrlFor(baseUrl, link.code),
    statsPath: `/stats/${encodeURIComponent(link.code)}`,
  });

  /** Links recentes deste navegador, lidos do cookie (não há contas de usuário). */
  async function renderHome(
    req: Request,
    res: Response,
    status: number,
    state: HomeState,
  ): Promise<void> {
    const recent = await service.findLinkSummaries(readRecentCodes(req.headers.cookie));
    res.status(status).render('home', {
      title: 'Shortfy',
      created: state.created ? toView(state.created) : null,
      values: state.values ?? {},
      errors: state.errors ?? {},
      recent: recent.map(({ link, totalClicks }) => ({ ...toView(link), totalClicks })),
    });
  }

  async function findCreated(code: unknown): Promise<Link | null> {
    if (typeof code !== 'string' || code === '') {
      return null;
    }
    try {
      return await service.getLink(code);
    } catch (error) {
      if (error instanceof LinkNotFoundError) return null;
      throw error;
    }
  }

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      await renderHome(req, res, 200, { created: await findCreated(req.query.criado) });
    }),
  );

  // POST → redirect → GET: recarregar a página de resultado não reenvia o formulário.
  router.post(
    '/',
    ...limiters,
    asyncHandler(async (req, res) => {
      try {
        const link = await service.createLink(parseCreateLinkBody(req.body));
        const codes = addRecentCode(readRecentCodes(req.headers.cookie), link.code);
        res.cookie(RECENT_LINKS_COOKIE, serializeRecentCodes(codes), {
          httpOnly: true,
          sameSite: 'lax',
          secure: req.secure,
          maxAge: RECENT_LINKS_MAX_AGE_MS,
        });
        res.redirect(303, `/?criado=${encodeURIComponent(link.code)}`);
      } catch (error) {
        const field = formFieldFor(error);
        if (field === null || !(error instanceof Error)) {
          throw error;
        }
        await renderHome(req, res, toHttpError(error).status, {
          values: formValues(req.body),
          errors: { [field]: error.message },
        });
      }
    }),
  );

  router.get(
    '/stats/:code',
    asyncHandler(async (req, res) => {
      const { link, stats } = await service.getStats(req.params.code ?? '');
      res.render('stats', {
        title: `Estatísticas de /${link.code} — Shortfy`,
        link: toView(link),
        stats,
        chart: {
          labels: stats.clicksPerDay.map((dia) => formatDay(dia.date)),
          values: stats.clicksPerDay.map((dia) => dia.count),
        },
        devices: DEVICES.map((device) => ({
          label: deviceLabel(device),
          count: stats.byDevice[device],
        })),
      });
    }),
  );

  return router;
}
