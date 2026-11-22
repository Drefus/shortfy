import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** O Express 4 não captura rejeições de handlers async: este wrapper as envia ao next(). */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
