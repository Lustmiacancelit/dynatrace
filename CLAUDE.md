# DQL Builder — dynatrace.flowlog.dev

## Purpose
AI-powered DQL query builder for Dynatrace, hosted at dynatrace.flowlog.dev.
Users type natural language and get back executable DQL queries.

## Stack
- Next.js 14 App Router
- Anthropic SDK (claude-sonnet-4-20250514)
- Dynatrace Platform API (NL2DQL, DQL execute, DQL explain)
- Tailwind CSS
- TypeScript

## Key Files
- `lib/dynatrace.ts` — all Dynatrace API calls
- `lib/claude.ts` — Claude fallback for DQL generation
- `app/api/dql-generate/route.ts` — POST { prompt } → { dql }
- `app/api/dql-execute/route.ts` — POST { query } → { results }
- `app/api/dql-explain/route.ts` — POST { query } → { explanation }
- `components/DQLChat.tsx` — main chat interface
- `components/DQLEditor.tsx` — editable DQL code block
- `components/ResultsTable.tsx` — query results display
- `components/ExplanationPanel.tsx` — plain English explanation panel

## Environment Variables (.env.local)
```
ANTHROPIC_API_KEY=your_anthropic_key
DYNATRACE_ENV_URL=https://<your-tenant>.live.dynatrace.com
DYNATRACE_TOKEN=your_platform_token
```

## Dynatrace Token Scopes Required
```
davis-copilot:nl2dql:execute
davis-copilot:dql2nl:execute
storage:logs:read
storage:metrics:read
storage:spans:read
storage:events:read
storage:bizevents:read
mcp-gateway:servers:read
mcp-gateway:servers:invoke
```

## DQL Generation Flow
1. User types natural language prompt in chat
2. Call Dynatrace NL2DQL API first (primary)
3. If Dynatrace fails → fall back to Claude with DQL expert system prompt
4. Show generated query in editable DQLEditor component
5. User can click Run → shows ResultsTable
6. User can click Explain → shows ExplanationPanel

## Notes
- All API calls go through Next.js API routes (never expose tokens client-side)
- DQL editor is a plain textarea with monospace styling (no heavy deps)
- Results table handles both metrics and logs response shapes
- Claude fallback uses a detailed DQL system prompt with examples
