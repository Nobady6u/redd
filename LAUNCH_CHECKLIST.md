# RADD Launch Checklist

Last reviewed: 2026-11-27

This is the release gate for moving RADD from its current MVP to a paid, customer-facing service. A deployed web page is not the same as a production-ready WhatsApp service.

## Verified in the connected project

- [x] Main Render web service deploys from GitHub main.
- [x] Admin dashboard was rebuilt and deployed to the main service.
- [x] The latest successful application startup logged RADD listening and Database schema checked.
- [x] Admin API exposes authentication, business, knowledge, fallback-rule, message-log, and stats endpoints.
- [x] Public copy now describes a FAQ-based auto-reply MVP and says subscriptions are not currently available.

## Must complete before real customer traffic

### 1. Secrets and access
- [ ] Rotate ADMIN_KEY because an earlier value was exposed in chat; update it only in Render environment settings.
- [ ] Rotate the Meta access token and webhook verification token if they were exposed.
- [ ] Rotate the database password/connection URL if it was exposed; update Render service environment without committing it.
- [ ] Confirm META_APP_SECRET is configured and webhook signature validation is active in production.
- [ ] Add rate limiting and an operational alert path for repeated authentication failures.

### 2. WhatsApp / Meta
- [ ] Confirm the Meta app mode and business/account permissions.
- [ ] Confirm the WhatsApp Business Account and sending phone number are approved and usable.
- [ ] Configure the production webhook URL and verify-token handshake.
- [ ] Subscribe the app to required WhatsApp webhook fields.
- [ ] Send a real inbound message and verify exactly one reply is delivered.
- [ ] Test duplicate webhook delivery, inactive businesses, unknown questions, failed Meta sends, and non-text messages.
- [ ] Confirm Graph API errors are visible to the operator.

### 3. Database and hosting
- [ ] Move off the temporary Free PostgreSQL plan before production. Current database is Free and scheduled to expire on 2026-12-26.
- [ ] Take a backup and rehearse restore before migrating or upgrading.
- [ ] Confirm database backups, retention, and recovery expectations.
- [ ] Choose a paid web-service plan or explicitly accept the limitations of a sleeping/free service.
- [ ] Remove or label unused duplicate Render services only after confirming they are not serving traffic.

### 4. Product and security
- [ ] Add a privacy notice and terms covering WhatsApp messages, retention, deletion, and customer support.
- [ ] Define who can access customer message logs and how long logs are retained.
- [ ] Add a safe way to correct a business phone-number ID and profile fields.
- [ ] Add a clear manual handoff path when the FAQ matcher cannot confidently answer.
- [ ] Test Arabic FAQ matching against representative real questions and ambiguous wording.
- [ ] Do not market generative AI, branch management, advanced reporting, or paid subscriptions until implemented and tested.

### 5. Commercial launch
- [ ] Define and test plan limits, onboarding, support, cancellation, and refund policy.
- [ ] Implement payment collection and subscription status before accepting paid orders.
- [ ] Run a pilot with one consenting business and a small set of test customers.
- [ ] Obtain explicit business approval before enabling automated replies on its live number.

## Current release decision

**Status: MVP / controlled pilot only. Not cleared for paid public launch.**

Remaining blockers: Meta end-to-end verification, secret rotation, and migration away from the expiring Free database. Do not invite customers to rely on the service until these gates are checked.
