# Web Time Machine

Explore how any website has changed over the last 10 years using the Internet Archive's Wayback Machine.

## Features

- **URL Search** — Enter any website URL to find archived snapshots from the past decade.
- **Interactive Timeline** — Browse snapshots organized by year, with expandable year groups showing individual capture dates.
- **Snapshot Preview** — View archived versions of websites directly in an embedded viewer, or open them on the Wayback Machine.
- **Messaging Evolution Analysis** — Automatically picks one representative snapshot per year, fetches the actual page content, and compares how the site's title, description, headings, and key phrases evolved over time. Highlights the biggest messaging shift between any two consecutive years.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack React Query, React Hook Form
- **Backend:** Express 5, Node.js, TypeScript
- **API:** Internet Archive Wayback Machine CDX API (no API key required)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

### Production Build

```bash
npm run build
node dist/index.cjs
```

## How It Works

1. A user enters a URL in the search bar.
2. The backend queries the Wayback Machine CDX API for HTML snapshots from the last 10 years.
3. Results are grouped by year and displayed in an interactive timeline.
4. Clicking a snapshot loads the archived page in an embedded iframe viewer.
5. The **Messaging Evolution** feature fetches one snapshot per year, extracts key content (page title, meta description, headings), and identifies the biggest messaging shift across the timeline.

## Project Structure

```
client/                  # Frontend (React + Vite)
  src/
    components/          # Reusable UI components
    pages/               # Page components (Home, 404)
    hooks/               # Custom React hooks
    lib/                 # Utilities and query client
server/                  # Backend (Express)
  routes.ts              # API endpoints
  index.ts               # Server entry point
shared/                  # Shared types and schemas
  schema.ts              # Zod schemas and TypeScript interfaces
```

## API Endpoints

| Method | Path                     | Description                                                    |
|--------|--------------------------|----------------------------------------------------------------|
| POST   | `/api/wayback/search`    | Search for archived snapshots of a URL                         |
| POST   | `/api/wayback/evolution` | Analyze messaging evolution across yearly snapshots            |

## License

MIT
