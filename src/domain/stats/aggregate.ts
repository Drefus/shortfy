import type { Click, Device } from '../link.types.js';
import { DEVICES } from './user-agent.js';

export const STATS_WINDOW_DAYS = 7;
export const TOP_REFERRERS_LIMIT = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DailyCount {
  /** Dia no formato AAAA-MM-DD, no fuso usado na agregação. */
  date: string;
  count: number;
}

export interface RankedCount {
  label: string;
  count: number;
}

export interface ClickStats {
  total: number;
  /** Últimos 7 dias terminando em `agora`, em ordem cronológica, incluindo zeros. */
  clicksPerDay: DailyCount[];
  /** Até 5 referers mais frequentes; empates ordenados alfabeticamente. */
  topReferrers: RankedCount[];
  byDevice: Record<Device, number>;
  /** Navegadores do mais para o menos frequente; empates ordenados alfabeticamente. */
  byBrowser: RankedCount[];
  lastClickAt: Date | null;
}

/** Formata um instante como dia "AAAA-MM-DD" no fuso informado (en-CA usa esse formato). */
function dayFormatter(timeZone: string): (date: Date) => string {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return (date) => format.format(date);
}

/** Os `days` dias terminando no dia de `today` ("AAAA-MM-DD"), todos com contagem zero. */
function lastDays(today: string, days: number): Map<string, number> {
  const [ano, mes, dia] = today.split('-').map(Number);
  const hoje = Date.UTC(ano!, mes! - 1, dia);
  const dias = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset--) {
    dias.set(new Date(hoje - offset * MS_PER_DAY).toISOString().slice(0, 10), 0);
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

/**
 * Resume os cliques de um link em `agora`. Os dias da série diária seguem o
 * fuso `timeZone` (IANA, ex.: "America/Sao_Paulo"). Função pura: não depende
 * do relógio nem do fuso do sistema.
 */
export function aggregateClicks(clicks: readonly Click[], now: Date, timeZone = 'UTC'): ClickStats {
  const toDay = dayFormatter(timeZone);
  const porDia = lastDays(toDay(now), STATS_WINDOW_DAYS);
  const byDevice = Object.fromEntries(DEVICES.map((d) => [d, 0])) as Record<Device, number>;
  let lastClickAt: Date | null = null;

  for (const click of clicks) {
    const dia = toDay(click.timestamp);
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
