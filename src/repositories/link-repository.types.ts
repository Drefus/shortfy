import type { Click, Link } from '../domain/link.types.js';

/**
 * Porta de persistência de links e cliques. Toda implementação deve:
 * - lançar AliasTakenError ao salvar um link cujo código já existe;
 * - lançar LinkNotFoundError ao registrar clique para um link inexistente;
 * - devolver cópias, de modo que alterações externas não afetem o armazenamento.
 */
export interface LinkRepository {
  save(link: Link): Promise<void>;
  /** Busca exata (sensível a maiúsculas, pois códigos são base62). */
  findByCode(code: string): Promise<Link | null>;
  existsCode(code: string): Promise<boolean>;
  registerClick(click: Click): Promise<void>;
  /** Cliques do link em ordem cronológica. */
  getClicks(linkId: string): Promise<Click[]>;
  /** Quantidade de cliques do link (0 para link inexistente). */
  countClicks(linkId: string): Promise<number>;
  /** Links mais recentes primeiro, até `limit` itens. */
  listRecent(limit: number): Promise<Link[]>;
}
