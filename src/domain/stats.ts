import type { Click } from './link.types.js';

export interface DailyCount {
  /** Data no formato AAAA-MM-DD (UTC). */
  date: string;
  count: number;
}

export interface ReferrerCount {
  referrer: string;
  count: number;
}

export const DIRECT_REFERRER = '(direto)';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Conta cliques por dia (UTC) nos últimos `days` dias terminando em `today`,
 * incluindo dias sem cliques com contagem zero, em ordem cronológica.
 */
export function clicksPerDay(clicks: readonly Click[], today: Date, days: number): DailyCount[] {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError('A quantidade de dias deve ser um inteiro positivo.');
  }

  const counts = new Map<string, number>();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let offset = days - 1; offset >= 0; offset--) {
    counts.set(toUtcDateKey(new Date(end - offset * MS_PER_DAY)), 0);
  }

  for (const click of clicks) {
    const key = toUtcDateKey(click.occurredAt);
    const current = counts.get(key);
    if (current !== undefined) {
      counts.set(key, current + 1);
    }
  }

  return [...counts].map(([date, count]) => ({ date, count }));
}

/** Agrupa cliques por domínio de origem, do mais frequente para o menos frequente. */
export function clicksByReferrer(clicks: readonly Click[]): ReferrerCount[] {
  const counts = new Map<string, number>();
  for (const click of clicks) {
    const key = click.referrer ?? DIRECT_REFERRER;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count || a.referrer.localeCompare(b.referrer));
}

/**
 * Extrai o domínio de um cabeçalho Referer. Devolve null para ausente,
 * inválido ou não-http(s).
 */
export function parseReferrer(header: string | undefined | null): string | null {
  if (!header) {
    return null;
  }
  try {
    const url = new URL(header);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.hostname;
  } catch {
    return null;
  }
}
