import type { Device } from '../domain/link.types.js';

/** Fuso usado para exibir datas nas páginas (o servidor roda em UTC). */
export const DISPLAY_TIME_ZONE = 'America/Sao_Paulo';

const DEVICE_LABELS: Record<Device, string> = {
  desktop: 'Computador',
  mobile: 'Celular',
  tablet: 'Tablet',
  bot: 'Robô',
};

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: DISPLAY_TIME_ZONE,
});

export function shortUrlFor(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${code}`;
}

export function deviceLabel(device: Device): string {
  return DEVICE_LABELS[device];
}

/** Data e hora no formato brasileiro; "—" quando não há data. */
export function formatDateTime(date: Date | null | undefined): string {
  return date ? dateTimeFormat.format(date) : '—';
}

/** Converte um dia "AAAA-MM-DD" para "DD/MM", usado no eixo do gráfico. */
export function formatDay(isoDay: string): string {
  const [, mes, dia] = isoDay.split('-');
  return `${dia}/${mes}`;
}
