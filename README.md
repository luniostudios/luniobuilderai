# Foundry

LUNIO Builder is a TypeScript Next.js App Router application. NextAuth handles Google sign-in, and each user's projects, generated HTML, CMS collections, and chat history are stored in Supabase. The builder uses the Gemini API to create complete HTML pages and revise them through persistent chat.

## Setup

1. Copy `.env.example` to `.env.local` and provide the Google OAuth, Supabase, and Gemini API values.
2. In Google Cloud Console, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Install dependencies and start Next.js:

```bash
npm install
npm run dev
```

For existing Supabase projects, rerun `supabase/schema.sql` to create the Auth.js adapter tables and add the app tables, publishing columns, and CMS data column. Add `next_auth` to the exposed schemas in Supabase Project Settings under API so the adapter can access its tables.

Create `NEXTAUTH_SECRET` and `INTEGRATION_ENCRYPTION_KEY` with `openssl rand -base64 32`. Keep the integration encryption key stable; changing it makes stored provider keys unreadable. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), set `GEMINI_API_KEY`, and optionally choose a model in `GEMINI_MODEL` (defaults to `gemini-3.6-flash`). Free-tier availability is subject to Google's current model access and usage limits. Use the Supabase project URL and service-role key for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep all API keys server-side; do not expose them as `NEXT_PUBLIC_` variables.

## Published Site Services

Apply `supabase/migrations/20261013000001_site_visitor_services.sql` to an existing database, or rerun `supabase/schema.sql` for a new installation. Set `SUPABASE_ANON_KEY` to the Supabase project's public anon key (server-side only in this app), enable Supabase Auth email/password sign-up, and configure its SMTP provider and redirect allow-list for `https://*.sites.your-domain.com/auth/callback`.

Choose a dedicated site base domain such as `sites.your-domain.com`. Point a wildcard DNS record (`*.sites.your-domain.com`) at the same Next.js deployment, configure wildcard TLS there, then set both `SITE_BASE_DOMAIN` and `NEXT_PUBLIC_SITE_BASE_DOMAIN` to that hostname without a scheme. Published projects are served at `https://<published-slug>.sites.your-domain.com`; each site receives an isolated origin for visitor sessions. Generate `SITE_SESSION_SECRET` with `openssl rand -base64 32` and keep it stable.

For store payments, enable Stripe Connect Express for the platform and set `STRIPE_SECRET_KEY`. Configure a Connect webhook at `/api/stripe/connect-webhook` for connected-account events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `charge.refunded`; set its signing secret as `STRIPE_CONNECT_WEBHOOK_SECRET`. Owners then onboard their merchant accounts and manage products in project settings. Set `STORE_SHIPPING_COUNTRIES` to the comma-separated two-letter country codes the store can ship to. Taxes, fulfillment, and legal requirements remain the merchant's responsibility.

Newsletter signup and unsubscribe handling use the built-in subscriber database. To send campaigns, owners connect a Resend API key in project settings and use a sender address from a verified Resend domain. Campaigns go only to active subscribers, include one-click unsubscribe links, are limited to 1,000 recipients and three sends per hour per site, and are recorded in project settings. Owners can export subscriber data as CSV.

Screenshot rendering uses a local Chrome/Chromium binary in development (`CHROME_EXECUTABLE_PATH`). In production, `@sparticuz/chromium-min` requires `CHROMIUM_PACK_URL` to point to a hosted Chromium pack tarball that matches the deployment architecture. Screenshot endpoints render scripts disabled and allow only Unsplash images and Google Fonts network resources.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

Project, chat, and message API handlers validate the NextAuth session and scope each database operation to its Google user ID. Each chat turn saves the user's prompt, the assistant's response, revised HTML, and generated CMS data. The CMS tab manages collections and records; generated HTML can bind repeated items with `data-cms-list`, `data-cms-item`, and `data-cms-field` attributes. The sandboxed preview and published site render saved CMS records.

Server-side integrations include Unsplash photo search and Resend campaign delivery. Project keys are encrypted in `project_integrations` and are never included in chat history or generated HTML. Apply the corresponding Supabase migrations before using them. Public site routes expose only the required photo results and newsletter submission flows, never provider keys.
