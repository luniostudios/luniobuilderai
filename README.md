# Foundry

LUNIO Builder is a TypeScript Next.js App Router application. NextAuth handles Google sign-in, and each user's projects, generated HTML, and chat history are stored in Supabase. The builder uses the Gemini API to create complete HTML pages and revise them through persistent chat.

## Setup

1. Copy `.env.example` to `.env.local` and provide the Google OAuth, Supabase, and Gemini API values.
2. In Google Cloud Console, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Install dependencies and start Next.js:

```bash
npm install
npm run dev
```

For existing Supabase projects, rerun `supabase/schema.sql` to create the Auth.js adapter tables and add the app tables and publishing columns. Add `next_auth` to the exposed schemas in Supabase Project Settings under API so the adapter can access its tables.

Create `NEXTAUTH_SECRET` with `openssl rand -base64 32`. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), set `GEMINI_API_KEY`, and optionally choose a model in `GEMINI_MODEL` (defaults to `gemini-3.6-flash`). Free-tier availability is subject to Google's current model access and usage limits. Use the Supabase project URL and service-role key for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep all API keys server-side; do not expose them as `NEXT_PUBLIC_` variables.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

Project, chat, and message API handlers validate the NextAuth session and scope each database operation to its Google user ID. Each chat turn saves the user's prompt, the assistant's response, and the revised HTML. The sandboxed preview updates after each successful generation.
