# WhatsAppPilot

A separate Cloudflare Workers + D1 + Queues admin panel for the official WhatsApp Business Platform Cloud API. This project is independent of BotPilot.

## Included
- Admin login protected by Cloudflare Worker secrets
- Contact management with explicit opt-in tracking
- Campaign creation using approved WhatsApp message templates
- Queue-based delivery with a conservative per-message delay
- Delivery status webhook endpoint
- Basic campaign statistics and audit logging
- CSV import endpoint and dashboard
- No WhatsApp Web session scraping, QR session hijacking, or unofficial libraries

## Important
Only message people who have clearly opted in to receive WhatsApp messages from your business. Honor opt-outs immediately. Outside the customer-service window, business-initiated messages must use an approved template. Meta limits, quality ratings, template approval and number eligibility control actual throughput; 100,000/day is a target, not a guaranteed capacity.

## Deploy overview
1. Create a Cloudflare D1 database named `whatsapp-pilot-db`.
2. Create a Cloudflare Queue named `whatsapp-pilot-send`.
3. Update `wrangler.toml` with your D1 database ID.
4. Install Wrangler and run `npm install`.
5. Run `npm run db:init` to apply `schema.sql` to the configured D1 database.
6. Set secrets:
   - `npx wrangler secret put ADMIN_PASSWORD`
   - `npx wrangler secret put SESSION_SECRET` (use a long random value)
   - `npx wrangler secret put WHATSAPP_ACCESS_TOKEN`
   - `npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID`
   - `npx wrangler secret put WHATSAPP_VERIFY_TOKEN`
7. Run `npm run deploy`.
8. In Meta Developer settings, set the webhook URL to `https://YOUR-WORKER-URL/webhook`, subscribe to `messages`, and use the same `WHATSAPP_VERIFY_TOKEN`.
9. Open the Worker URL and sign in with username `admin` and your configured admin password.

## Cloudflare resources
Queue binding in `wrangler.toml` must point to the queue you create. Configure a dead-letter queue later for production. Never commit access tokens, passwords, customer data, or a real database ID.

## API
- `GET /api/health`
- `GET /api/contacts`
- `POST /api/contacts`
- `POST /api/contacts/import` (JSON array)
- `POST /api/campaigns`
- `GET /api/campaigns`
- `POST /api/campaigns/:id/queue`
- `GET /webhook` (Meta verification)
- `POST /webhook` (delivery updates and opt-out keywords)

This is a first deployable foundation, not a claim of production certification. Review the deployment checklist and test with a small, consenting audience before scaling.