/**
 * Os "links recentes" são guardados por navegador, num cookie com os códigos
 * criados ali (não há contas de usuário). O cookie não precisa ser assinado:
 * conhecer um código não dá acesso a nada além do próprio link, que já é público.
 */
export const RECENT_LINKS_COOKIE = 'shortfy_recentes';
/** Quantos códigos o cookie guarda: cabe com folga nos ~4 KB de um cookie. */
export const MAX_SAVED_CODES = 100;
/** O cookie expira em um ano sem novos links. */
export const RECENT_LINKS_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** Mesmo formato aceito para códigos e apelidos; descarta valores adulterados. */
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;
/** Separador válido em cookies que nunca aparece num código. */
const SEPARATOR = '.';

/** Lê os códigos do cabeçalho Cookie, do mais recente para o mais antigo. */
export function readRecentCodes(cookieHeader: string | undefined): string[] {
  const par = (cookieHeader ?? '')
    .split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${RECENT_LINKS_COOKIE}=`));
  if (!par) {
    return [];
  }
  const valor = par.slice(RECENT_LINKS_COOKIE.length + 1);
  const codigos = valor.split(SEPARATOR).filter((codigo) => CODE_PATTERN.test(codigo));
  return [...new Set(codigos)].slice(0, MAX_SAVED_CODES);
}

/** Coloca o código no início da lista, sem repetir e respeitando o limite. */
export function addRecentCode(codes: readonly string[], code: string): string[] {
  return [code, ...codes.filter((existente) => existente !== code)].slice(0, MAX_SAVED_CODES);
}

/** Valor do cookie para a lista de códigos. */
export function serializeRecentCodes(codes: readonly string[]): string {
  return codes.join(SEPARATOR);
}
