import { LinkExpiredError } from './errors.js';
import type { Link } from './link.types.js';

/** Relógio injetável: devolve o instante atual. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/**
 * Um link expira no instante exato de `expiresAt`. Links sem data de
 * expiração nunca expiram.
 */
export function isExpired(link: Pick<Link, 'expiresAt'>, now: Date): boolean {
  if (link.expiresAt === undefined) {
    return false;
  }
  return now.getTime() >= link.expiresAt.getTime();
}

/** Lança LinkExpiredError quando o link já expirou em `now`. */
export function assertNotExpired(link: Pick<Link, 'code' | 'expiresAt'>, now: Date): void {
  if (isExpired(link, now)) {
    throw new LinkExpiredError(link.code);
  }
}
