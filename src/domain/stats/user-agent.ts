import type { Device } from '../link.types.js';

export const DEVICES: readonly Device[] = ['desktop', 'mobile', 'tablet', 'bot'];
export const OTHER_BROWSER = 'Outro';

export interface UserAgentInfo {
  device: Device;
  browser: string;
}

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|curl|wget|python-requests/i;
const TABLET_PATTERN = /ipad|tablet|kindle|silk|android(?!.*mobile)/i;
const MOBILE_PATTERN = /mobi|iphone|ipod|windows phone/i;

/** A ordem importa: Edge, Opera e Samsung também anunciam "Chrome" e "Safari". */
const BROWSER_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ['Edge', /edg(e|a|ios)?\//i],
  ['Opera', /opr\/|opera/i],
  ['Samsung Internet', /samsungbrowser/i],
  ['Firefox', /firefox|fxios/i],
  ['Chrome', /chrome|crios/i],
  ['Safari', /safari/i],
];

function detectDevice(ua: string): Device {
  if (ua.length === 0 || BOT_PATTERN.test(ua)) return 'bot';
  if (TABLET_PATTERN.test(ua)) return 'tablet';
  if (MOBILE_PATTERN.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  const encontrado = BROWSER_PATTERNS.find(([, pattern]) => pattern.test(ua));
  return encontrado ? encontrado[0] : OTHER_BROWSER;
}

/**
 * Classifica um User-Agent em dispositivo e navegador usando expressões
 * regulares simples. User-Agent ausente é tratado como bot.
 */
export function parseUserAgent(ua: string | null | undefined): UserAgentInfo {
  const valor = ua?.trim() ?? '';
  return { device: detectDevice(valor), browser: detectBrowser(valor) };
}
