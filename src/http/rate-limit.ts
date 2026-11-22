import type { RequestHandler } from 'express';
import { systemClock, type Clock } from '../domain/expiration.js';

export interface RateLimitOptions {
  /** Máximo de requisições permitidas por chave dentro da janela. */
  limit: number;
  windowMs: number;
  clock?: Clock;
}

interface Window {
  startedAt: number;
  count: number;
}

/** Limitador de janela fixa em memória: cada chave tem até `limit` requisições por janela. */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();
  private readonly clock: Clock;

  constructor(private readonly options: RateLimitOptions) {
    this.clock = options.clock ?? systemClock;
  }

  /** Consome uma requisição da chave; devolve false quando o limite já foi atingido. */
  tryConsume(key: string): boolean {
    const now = this.clock().getTime();
    const atual = this.windows.get(key);

    if (!atual || now - atual.startedAt >= this.options.windowMs) {
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (atual.count >= this.options.limit) {
      return false;
    }
    atual.count += 1;
    return true;
  }
}

/** Middleware que responde 429 quando o IP excede o limite. */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const limiter = new FixedWindowRateLimiter(options);
  return (req, res, next) => {
    if (limiter.tryConsume(req.ip ?? 'desconhecido')) {
      next();
      return;
    }
    res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
  };
}
