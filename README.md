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

Screenshot rendering uses a local Chrome/Chromium binary in development (`CHROME_EXECUTABLE_PATH`). In production, `@sparticuz/chromium-min` requires `CHROMIUM_PACK_URL` to point to a hosted Chromium pack tarball that matches the deployment architecture. Screenshot endpoints render scripts disabled and allow only Unsplash images and Google Fonts network resources.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

Project, chat, and message API handlers validate the NextAuth session and scope each database operation to its Google user ID. Each chat turn saves the user's prompt, the assistant's response, revised HTML, and generated CMS data. The CMS tab manages collections and records; generated HTML can bind repeated items with `data-cms-list`, `data-cms-item`, and `data-cms-field` attributes. The sandboxed preview and published site render saved CMS records.

The first server-side site integration is Unsplash photo search. Users connect an Unsplash Access Key through the builder's API integrations panel; keys are encrypted in `project_integrations`, never included in chat history or generated HTML. Apply `supabase/migrations/20261011000003_project_api_integrations.sql` before using it. The public proxy exposes search results only, not the provider key.
