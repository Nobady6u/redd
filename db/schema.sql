CREATE TABLE IF NOT EXISTS businesses (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, whatsapp_phone_number_id TEXT UNIQUE, city TEXT, timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS auto_reply_rules (id BIGSERIAL PRIMARY KEY, phone_number_id TEXT NOT NULL, reply_text TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT false, priority INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS message_events (id BIGSERIAL PRIMARY KEY, whatsapp_message_id TEXT UNIQUE, business_id BIGINT REFERENCES businesses(id), sender TEXT, body TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT now());

ALTER TABLE message_events ADD COLUMN IF NOT EXISTS phone_number_id TEXT;
CREATE INDEX IF NOT EXISTS message_events_received_idx ON message_events(received_at);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE message_events ADD COLUMN IF NOT EXISTS phone_number_id TEXT;
CREATE INDEX IF NOT EXISTS message_events_received_idx ON message_events(received_at DESC);

-- Keep one rule per WhatsApp number to avoid conflicting replies.
DELETE FROM auto_reply_rules a USING auto_reply_rules b WHERE a.phone_number_id=b.phone_number_id AND a.id<b.id;
CREATE UNIQUE INDEX IF NOT EXISTS auto_reply_rules_phone_unique ON auto_reply_rules(phone_number_id);
