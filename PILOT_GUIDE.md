# RADD — Controlled Pilot Guide

## Scope
RADD is an experimental WhatsApp FAQ auto-reply service. It matches incoming text against a business-provided FAQ. It is not generative AI and should not be marketed as such.

## Pilot setup
1. Add a business in the RADD Admin dashboard.
2. Keep its status pending until its WhatsApp Phone Number ID is verified.
3. Add one FAQ entry per pair of lines in this format:
   ```
   سؤال: ما ساعات العمل؟
   جواب: نعمل يومياً من 9 صباحاً إلى 8 مساءً.
   سؤال: أين موقعكم؟
   جواب: غزة — (أدخل العنوان المعتمد).
   ```
4. Keep fallback reply enabled and appropriate.
5. Activate the business only after credentials, webhook subscription and test messaging are verified.

## Acceptance tests (with a test WhatsApp sender)
- Meta webhook verification succeeds with the configured verify token.
- Send a known FAQ question; confirm the correct reply is delivered and logged.
- Send an unrelated question; confirm fallback is sent.
- Send the same message ID twice; confirm only one reply.
- Confirm paused/pending businesses do not auto-reply.
- Confirm Meta send failure is logged.
- Send a photo/voice/other non-text message; verify current behavior is documented (currently non-text messages are skipped).
- Confirm the admin dashboard is accessible only with the admin key.
- Confirm no secrets appear in source control, public pages or logs.

## Operational safeguards
- Do not onboard paying customers until the end-to-end tests and security review are complete.
- Rotate previously exposed credentials before live use.
- Free database availability/expiry and backup/restore must be reviewed before relying on it.
- Provide customers with privacy notice, data-retention policy and a way to request deletion.
- Keep the pilot limited to a consenting test business and low volume.

## Current limitations
- FAQ matching is deterministic keyword overlap, not an AI-generated answer.
- Only incoming text messages are processed. Non-text messages are currently ignored.
- Billing/subscriptions, automated onboarding and multi-branch management are not production-ready.
