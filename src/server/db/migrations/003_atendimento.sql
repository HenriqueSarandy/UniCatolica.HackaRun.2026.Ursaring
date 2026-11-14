-- TechSpec 05: reclamações, resolução, feedback, setor e linha do tempo.
ALTER TABLE tickets ADD COLUMN kind TEXT NOT NULL DEFAULT 'ajuda' CHECK (kind IN ('ajuda','reclamacao','sugestao'));
ALTER TABLE tickets ADD COLUMN team TEXT NOT NULL DEFAULT 'sac' CHECK (team IN ('seguranca','sac','manutencao','limpeza'));
ALTER TABLE tickets ADD COLUMN contact TEXT;
ALTER TABLE tickets ADD COLUMN resolution_code TEXT CHECK (resolution_code IS NULL OR resolution_code IN ('resolvido','encaminhado','nao_localizado','improcedente'));
ALTER TABLE tickets ADD COLUMN resolution_note TEXT;
ALTER TABLE tickets ADD COLUMN escalated_at TEXT;
ALTER TABLE tickets ADD COLUMN reopened_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tickets ADD COLUMN rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
ALTER TABLE tickets ADD COLUMN feedback_text TEXT;

CREATE TABLE ticket_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  at        TEXT NOT NULL,
  actor     TEXT NOT NULL,          -- nome da equipe, "visitante" ou "sistema"
  type      TEXT NOT NULL,          -- criado|assumido|nota|escalado|transferido|concluido|reaberto|avaliado
  note      TEXT
);
CREATE INDEX idx_ticket_events_ticket ON ticket_events(ticket_id, at);
