export interface Link {
  slug: string;
  targetUrl: string;
  createdAt: Date;
}

export interface Click {
  slug: string;
  occurredAt: Date;
  /** Domínio de origem do clique, ou null quando o acesso foi direto. */
  referrer: string | null;
}
