export interface Link {
  id: string;
  /** Código curto usado na URL encurtada (gerado ou alias personalizado). */
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt?: Date;
}

export type Device = 'desktop' | 'mobile' | 'tablet' | 'bot';

export interface Click {
  linkId: string;
  timestamp: Date;
  /** Hostname de origem do clique, ou "direto" quando não há referer. */
  referrer: string;
  device: Device;
  browser: string;
}
