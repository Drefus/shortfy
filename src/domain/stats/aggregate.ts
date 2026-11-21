import type { Click, Device } from '../link.types.js';
import { DEVICES } from './user-agent.js';

export const STATS_WINDOW_DAYS = 7;
export const TOP_REFERRERS_LIMIT = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DailyCount {
  /** Dia no formato AAAA-MM-DD, em UTC. */
  date: string;
  count: number;
}

export interface RankedCount {
  label: string;
  count: number;
}

export interface ClickStats {
  total: number;
  /** Últimos 7 dias (UTC) terminando em `agora`, em ordem cronológica, incluindo zeros. */
  clicksPerDay: DailyCount[];
  /** Até 5 referers mais frequentes; empates ordenados alfabeticamente. */
  topReferrers: RankedCount[];
  byDevice: Record<Device, number>;
  /** Navegadores do mais para o menos frequente; empates ordenados alfabeticamente. */
  byBrowser: RankedCount[];
  lastClickAt: Date | null;
}

function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastDays(now: Date, days: number): Map<string, number> {
  const hoje = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dias = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset--) {
    dias.set(toUtcDay(new Date(hoje - offset * MS_PER_DAY)), 0);
  }
  return dias;
}

function rank(values: Iterable<string>): RankedCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Resume os cliques de um link em `agora`. Função pura: não depende do relógio do sistema. */
export function aggregateClicks(clicks: readonly Click[], now: Date): ClickStats {
  const porDia = lastDays(now, STATS_WINDOW_DAYS);
  const byDevice = Object.fromEntries(DEVICES.map((d) => [d, 0])) as Record<Device, number>;
  let lastClickAt: Date | null = null;

  for (const click of clicks) {
    const dia = toUtcDay(click.timestamp);
    const atual = porDia.get(dia);
    if (atual !== undefined) {
      porDia.set(dia, atual + 1);
    }
    byDevice[click.device] += 1;
    if (lastClickAt === null || click.timestamp > lastClickAt) {
      lastClickAt = click.timestamp;
    }
  }

  return {
    total: clicks.length,
    clicksPerDay: [...porDia].map(([date, count]) => ({ date, count })),
    topReferrers: rank(clicks.map((c) => c.referrer)).slice(0, TOP_REFERRERS_LIMIT),
    byDevice,
    byBrowser: rank(clicks.map((c) => c.browser)),
    lastClickAt,
  };
}
