# Overview

Web Time Machine is a web application that lets users explore how any website has changed over the last 10 years by querying the Internet Archive's Wayback Machine CDX API. Users enter a URL, and the app fetches archived snapshots grouped by year, displaying them in an interactive timeline with an iframe-based preview viewer.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management; `useMutation` for the search POST request
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS and class-variance-authority
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Pages**: Home page (URL search + timeline + snapshot viewer) and a 404 Not Found page

## Backend
- **Framework**: Express 5 running on Node.js with TypeScript (via tsx)
- **Architecture**: Single HTTP server created with `http.createServer`, routes registered in `server/routes.ts`
- **API**: One endpoint — `POST /api/wayback/search` — accepts a URL, queries the Wayback Machine CDX API, and returns grouped snapshot data
- **Storage**: `MemStorage` class in `server/storage.ts` (currently empty/unused — no database tables are defined yet)
- **Dev Server**: Vite dev server middleware is attached for HMR during development; production serves static built files from `dist/public`

## Shared Code
- `shared/schema.ts` contains Zod validation schemas and TypeScript interfaces shared between client and server (e.g., `WaybackSnapshot`, `YearGroup`, `WaybackResponse`)
- No database tables are defined in the schema — only Zod types for API request/response shapes

## Database
- Drizzle ORM is configured with PostgreSQL dialect (`drizzle.config.ts`) pointing to `DATABASE_URL`
- The schema file (`shared/schema.ts`) currently has no Drizzle table definitions — only Zod schemas
- `connect-pg-simple` is included as a dependency (for session storage) but not actively used
- Use `npm run db:push` to push schema changes to the database when tables are added

## Build System
- **Dev**: `tsx server/index.ts` runs the server with Vite middleware for hot reloading
- **Build**: Custom `script/build.ts` that runs Vite build for client assets and esbuild for server code, outputting to `dist/`
- **Production**: `node dist/index.cjs` serves the built app

## Key Design Decisions
1. **No authentication** — The app is a simple public tool with no user accounts
2. **Proxy pattern for Wayback Machine** — The server proxies CDX API requests to avoid CORS issues and to parse/transform the response into a structured format
3. **In-memory storage** — No persistent data storage is needed for the core feature; the storage interface exists as a placeholder
4. **Shared schema** — Types and validation are shared between client and server to ensure consistency
5. **iframe preview** — Archived pages are displayed in an iframe pointing to `web.archive.org` URLs

# External Dependencies

## Third-Party APIs
- **Internet Archive Wayback Machine CDX API** (`web.archive.org/cdx/search/cdx`) — Used to search for archived snapshots of websites. No API key required. Rate limiting may apply from Archive.org's side.

## Database
- **PostgreSQL** — Configured via `DATABASE_URL` environment variable. Required by Drizzle config but no tables are currently defined.

## Key npm Packages
- `express` v5 — HTTP server
- `drizzle-orm` + `drizzle-kit` — ORM and migration tooling for PostgreSQL
- `zod` + `drizzle-zod` — Schema validation
- `@tanstack/react-query` — Client-side data fetching
- `react-hook-form` — Form management
- `wouter` — Client-side routing
- `shadcn/ui` components (Radix UI + Tailwind CSS)
- `vite` — Frontend build tool and dev server
- `esbuild` — Server bundling for production