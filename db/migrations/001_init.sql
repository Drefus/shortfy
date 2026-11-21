-- 001_init: tabelas de links encurtados e de cliques.

CREATE TABLE IF NOT EXISTS links (
  id           UUID        PRIMARY KEY,
  code         VARCHAR(30) NOT NULL,
  original_url TEXT        NOT NULL CHECK (char_length(original_url) <= 2048),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NULL
);

-- Códigos são base62 e, portanto, sensíveis a maiúsculas: a unicidade é exata.
CREATE UNIQUE INDEX IF NOT EXISTS links_code_key ON links (code);
CREATE INDEX IF NOT EXISTS links_created_at_idx ON links (created_at DESC);

CREATE TABLE IF NOT EXISTS clicks (
  id          BIGSERIAL   PRIMARY KEY,
  link_id     UUID        NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer    TEXT        NOT NULL DEFAULT 'direto',
  device      TEXT        NOT NULL CHECK (device IN ('desktop', 'mobile', 'tablet', 'bot')),
  browser     TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS clicks_link_id_occurred_at_idx ON clicks (link_id, occurred_at);
