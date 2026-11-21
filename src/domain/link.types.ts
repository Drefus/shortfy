export interface Link {
  id: string;
  /** Código curto usado na URL encurtada (gerado ou alias personalizado). */
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Click {
  code: string;
  occurredAt: Date;
  /** Domínio de origem do clique, ou null quando o acesso foi direto. */
  referrer: string | null;
}
