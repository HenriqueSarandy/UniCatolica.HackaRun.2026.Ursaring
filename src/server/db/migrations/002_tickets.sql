CREATE TABLE tickets (
  id            TEXT PRIMARY KEY,                 -- ex.: "BO-7K3F" (curto, legível)
  session_id    TEXT NOT NULL,                    -- referência lógica a sessions.id
  point_id      TEXT NOT NULL,                    -- local de origem (QR)
  category      TEXT NOT NULL DEFAULT 'outro',    -- TicketCategory
  text          TEXT,                             -- digitado
  transcript    TEXT,                             -- fala transcrita
  photo_file    TEXT,                             -- nome do arquivo em uploads/
  status        TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','assumido','concluido')),
  assigned_to   TEXT,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','alta')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  assumed_at    TEXT,
  closed_at     TEXT
);
CREATE INDEX idx_tickets_status ON tickets(status, created_at);
CREATE INDEX idx_tickets_session ON tickets(session_id, created_at);
