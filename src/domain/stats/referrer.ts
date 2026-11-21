export const DIRECT_REFERRER = 'direto';

/**
 * Reduz um cabeçalho Referer ao hostname de origem. Acessos sem referer, com
 * referer malformado ou com protocolo não http(s) contam como "direto".
 */
export function normalizeReferrer(referrer: string | null | undefined): string {
  const valor = referrer?.trim();
  if (!valor) {
    return DIRECT_REFERRER;
  }
  try {
    const url = new URL(valor);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return DIRECT_REFERRER;
    }
    return url.hostname;
  } catch {
    return DIRECT_REFERRER;
  }
}
