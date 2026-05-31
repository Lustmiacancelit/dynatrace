# Dynatrace DQL Builder

AI-assisted DQL query builder for Dynatrace, with approval-only customer access.

## Local development

```powershell
npm install
npm run dev
```

The app runs on [http://localhost:3009](http://localhost:3009).

## Required environment variables

Keep these in `.env.local` locally and in Vercel project settings for production:

```env
ANTHROPIC_API_KEY=
DYNATRACE_ENV_URL=https://bjk48181.live.dynatrace.com
DYNATRACE_TOKEN=
DYNATRACE_PLATFORM_TOKEN=
RESEND_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_SECRET=
ADMIN_PASSWORD=Mi@99fabfep$$&&
NEXT_PUBLIC_APP_URL=https://dynatrace.flowlog.dev
```

`support@flowlog.dev` must be verified in Resend before production emails can be sent from that address.

`DYNATRACE_TOKEN` is the classic API token used for metrics, entities, and problems. `DYNATRACE_PLATFORM_TOKEN` must be a Dynatrace Platform/OAuth bearer token with Grail DQL permissions, including log bucket access such as `storage:logs:read`, for in-app DQL execution.

## Supabase setup

Create a Supabase project, then run [supabase-schema.sql](./supabase-schema.sql) in the SQL editor.

The app uses the service-role key only from server-side route handlers. Do not expose it in the browser.

## Access flow

- Customers request access from the landing page.
- Admin notices are emailed to `fabio.almeida@pinvestcapital.com` and `support@flowlog.dev`.
- Admins sign in at `/login` with the shared admin password.
- Admins approve requests at `/admin`.
- Approved customers receive a one-time login link by email.
- Users can log out from the dashboard navigation.

## Admins

These emails always have admin rights:

- `fabio.almeida@pinvestcapital.com`
- `support@flowlog.dev`
