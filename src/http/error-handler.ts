import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import {
  AliasTakenError,
  CodeGenerationError,
  InvalidAliasError,
  InvalidExpirationError,
  InvalidUrlError,
  LinkExpiredError,
  LinkNotFoundError,
} from '../domain/errors.js';

export interface HttpError {
  status: number;
  message: string;
}

const INTERNAL_ERROR: HttpError = { status: 500, message: 'Erro interno do servidor.' };

const STATUS_BY_ERROR: ReadonlyArray<[new (...args: never[]) => Error, number]> = [
  [InvalidUrlError, 400],
  [InvalidAliasError, 400],
  [InvalidExpirationError, 400],
  [LinkNotFoundError, 404],
  [AliasTakenError, 409],
  [LinkExpiredError, 410],
  [CodeGenerationError, 503],
];

function isJsonParseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { type?: unknown }).type === 'entity.parse.failed'
  );
}

/** Traduz erros de domínio para status HTTP; erros desconhecidos viram 500 sem expor detalhes. */
export function toHttpError(error: unknown): HttpError {
  if (isJsonParseError(error)) {
    return { status: 400, message: 'O corpo da requisição não é um JSON válido.' };
  }
  const mapeado = STATUS_BY_ERROR.find(([tipo]) => error instanceof tipo);
  if (mapeado && error instanceof Error) {
    return { status: mapeado[1], message: error.message };
  }
  return INTERNAL_ERROR;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Rotas /api respondem JSON; as demais (acesso ao link curto) respondem uma página HTML. */
function sendError(req: Request, res: Response, { status, message }: HttpError): void {
  if (req.path.startsWith('/api/')) {
    res.status(status).json({ error: message });
    return;
  }
  res
    .status(status)
    .type('html')
    .send(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Shortfy</title></head>` +
        `<body><h1>${status}</h1><p>${escapeHtml(message)}</p><a href="/">Voltar ao início</a></body></html>`,
    );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const httpError = toHttpError(error);
  if (httpError.status === 500) {
    console.error(error);
  }
  sendError(req, res, httpError);
};

/** Rotas inexistentes seguem o mesmo formato de resposta de erro. */
export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(req, res, { status: 404, message: 'Página não encontrada.' });
};
