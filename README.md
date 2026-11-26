# رَدّ (RADD)

Arabic-first WhatsApp customer support automation for small businesses. The project is currently an MVP in development; do not advertise as fully operational until Meta Cloud API, database, security, and end-to-end tests are complete.

## Architecture
- Node.js HTTP server (no Express) and PostgreSQL (Render)
- WhatsApp Cloud API webhook
- Admin dashboard at `/admin` with API under `/api/admin/*`
- Public landing page at `/`

## Required environment variables
Configure these in the Render service settings; do not commit or share secrets.
- `PORT`: provided by Render
- `DATABASE_URL`: Render PostgreSQL internal connection URL
- `WHATSAPP_TOKEN`: Meta access token
- `PHONE_NUMBER_ID`: WhatsApp Cloud API phone number ID used by the current sending integration
- `WEBHOOK_VERIFY_TOKEN`: private webhook verification phrase
- `META_APP_SECRET`: Meta app secret for webhook signature validation (required before production)
- `ADMIN_KEY`: strong random secret for dashboard/API authorization; rotate if exposed
- `GRAPH_API_VERSION`: supported Graph API version

## Deployment / checks
- Deploy on Render from the main branch.
- Check `/health`; this reports whether DB and WhatsApp configuration are present, not whether integration is fully validated.
- Verify Meta webhook GET handshake and signed POST events with a test business/number before production.
- Test message deduplication, inactive-business handling, rule toggles, and fallback response.
- Back up and migrate the database before production; the current free Render DB is temporary and not appropriate for production.

## Current limitations / launch checklist
- Production database plan and backups are not yet established.
- Meta Business verification, Cloud API number configuration, webhook subscription, and signature-secret configuration need validation.
- Admin key must be high entropy and stored only in Render environment variables.
- Add per-business knowledge-base configuration, keyword/intent routing, conversation management, privacy/retention controls, billing, and onboarding before launch.
- Test mobile layout, accessibility, and end-to-end API behavior.

## Pricing draft
Starter 149 SAR/month; Professional 299 SAR/month; Chains 999 SAR/month. These are draft prices and the site currently indicates service setup is in progress.
