CREATE TABLE IF NOT EXISTS businesses (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, whatsapp_phone_number_id TEXT UNIQUE, city TEXT, timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS auto_reply_rules (id BIGSERIAL PRIMARY KEY, phone_number_id TEXT NOT NULL, reply_text TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT false, priority INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS message_events (id BIGSERIAL PRIMARY KEY, whatsapp_message_id TEXT UNIQUE, business_id BIGINT REFERENCES businesses(id), sender TEXT, body TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT now());

ALTER TABLE message_events ADD COLUMN IF NOT EXISTS phone_number_id TEXT;
CREATE INDEX IF NOT EXISTS message_events_received_idx ON message_events(received_at);
