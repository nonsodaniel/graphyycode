# GraphyyCode — Codebase Visualiser

Understand any GitHub repository in minutes. Visualise dependency graphs, folder trees, and call graphs instantly.

---

## Features

- **Dependency graph** — interactive node graph of file imports and exports built with ReactFlow
- **Folder tree** — expandable file tree with role heuristics (page, layout, schema, test, etc.)
- **File explainer** — per-file metadata: language, role, import/export count, file size
- **Analysis history** — dashboard showing all past analyses with status and pagination
- **Follow feed** — social activity timeline of users you follow
- **Screenshot & share** — export graph as PNG, share to Twitter/LinkedIn/Facebook or copy link
- **Admin dashboard** — user management, role assignment, analysis stats, audit log
- **Guest trial limit** — anonymous users get 3 free analyses before being prompted to sign in
- **PWA + offline** — installable app, service worker caches static assets and previous analyses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Components | shadcn/ui (custom), Lucide icons |
| Graph | ReactFlow |
| Animation | Framer Motion |
| Auth | NextAuth v5 (Google OAuth) |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Cache | localforage (IndexedDB) |
| Unit tests | Vitest + jsdom |
| E2E tests | Playwright |
| API mocking | MSW |
| CI | GitHub Actions |

---

## Project Structure

```
.
├── app/                    # Next.js App Router pages and API routes
│   ├── admin/              # Admin dashboard UI
│   ├── api/                # REST API handlers
│   │   ├── admin/          # User, analysis, audit-log admin APIs
│   │   ├── analyse/        # Submit analysis request
│   │   ├── analysis/[id]/  # Fetch analysis result
│   │   ├── auth/           # NextAuth route handler
│   │   ├── dashboard/      # History API
│   │   ├── feed/           # Activity feed API
│   │   ├── follow/         # Follow user
│   │   ├── screenshots/    # Save and list screenshots
│   │   └── unfollow/       # Unfollow user
│   ├── auth/               # Sign-in page
│   ├── dashboard/          # Analysis history page
│   ├── feed/               # Social feed page
│   ├── offline/            # PWA offline fallback page
│   └── visualiser/         # Graph visualiser page
├── components/
│   ├── landing/            # Landing page sections (Hero, Features, Demo, etc.)
│   ├── shared/             # Global components (OfflineBanner, ServiceWorkerRegistrar)
│   ├── ui/                 # Base UI components (Button, Input, Badge, Card)
│   └── visualiser/         # Graph, FileTree, ExplainPanel, ScreenshotButton
├── hooks/                  # Custom React hooks
├── lib/                    # Shared utilities
│   ├── auth.ts             # NextAuth configuration
│   ├── cache.ts            # IndexedDB cache helpers (localforage)
│   ├── db.ts               # Prisma singleton client
│   ├── github.ts           # GitHub URL parser and API client
│   ├── graph-builder.ts    # Dependency graph builder
│   ├── guest.ts            # Guest usage limit logic
│   ├── rbac.ts             # Role-based access control helpers
│   ├── time.ts             # Pure timeAgo utility
│   └── utils.ts            # cn() class name utility
├── prisma/
│   └── schema.prisma       # Database schema (12 models)
├── public/
│   ├── manifest.webmanifest# PWA manifest
│   └── sw.js               # Service worker
├── tests/
│   ├── e2e/                # Playwright end-to-end tests
│   ├── unit/               # Vitest unit tests
│   └── setup.ts            # Test environment setup
├── types/
│   └── next-auth.d.ts      # NextAuth session type augmentation
├── worker/
│   └── index.ts            # Background analysis worker
├── middleware.ts            # Route protection middleware
├── next.config.ts           # Next.js configuration
├── playwright.config.ts     # Playwright configuration
├── prisma.config.ts         # Prisma 7 datasource configuration
└── vitest.config.ts         # Vitest configuration
```

---

## Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/graphyycode"

# NextAuth
AUTH_SECRET="your-nextauth-secret-min-32-chars"
AUTH_URL="http://localhost:3000"

# Google OAuth (create at console.cloud.google.com)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# GitHub API token (optional, increases rate limits)
GITHUB_TOKEN="ghp_yourtoken"

# Admin account (auto-promoted to ADMIN role on first sign-in)
ADMIN_EMAIL="admin@example.com"

# Guest trial limit (default: 3)
GUEST_LIMIT="3"
```

---

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/nonsodaniel/graphyycode.git
cd graphyycode

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 4. Run database migrations
pnpm prisma migrate deploy

# 5. Generate Prisma client
pnpm prisma generate

# 6. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm worker` | Run the background analysis worker |
| `pnpm prisma studio` | Open Prisma Studio database browser |
| `pnpm prisma migrate dev` | Create and apply a new migration |

---

## Background Worker

The analysis worker polls the database for `PENDING` analyses and processes them:

1. Fetches the GitHub file tree (recursive) using the GitHub API
2. Downloads file contents for analysable extensions (`.ts`, `.tsx`, `.js`, `.py`, etc.)
3. Builds a dependency graph using import/export extraction
4. Stores the `GraphArtifact` in the database
5. Updates the analysis status to `COMPLETED` or `FAILED`

```bash
# Build and run the worker in a separate terminal
pnpm tsc --project tsconfig.json && pnpm worker
```

In production, run the worker as a separate process or container alongside the Next.js app.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyse` | Submit a GitHub repo for analysis |
| `GET` | `/api/analysis/:id` | Get analysis result and graph artifact |
| `GET` | `/api/dashboard/history` | Paginated analysis history (auth required) |
| `GET` | `/api/feed` | Activity feed from followed users (auth required) |
| `POST` | `/api/follow` | Follow a user (auth required) |
| `POST` | `/api/unfollow` | Unfollow a user (auth required) |
| `POST` | `/api/screenshots` | Save a screenshot (auth required) |
| `GET` | `/api/screenshots` | List user screenshots (auth required) |
| `GET` | `/api/admin/users` | List all users (admin only) |
| `PATCH` | `/api/admin/users/:id` | Update user role (admin only) |
| `GET` | `/api/admin/analyses` | All analyses with stats (admin only) |
| `GET` | `/api/admin/audit-logs` | Audit log entries (admin only) |

---

## Database Schema

Key models in `prisma/schema.prisma`:

- **User** — GitHub/Google OAuth user with `role: USER | ADMIN`
- **Repo** — GitHub repository metadata
- **Analysis** — Analysis request with `status: PENDING | PROCESSING | COMPLETED | FAILED`
- **GraphArtifact** — Computed nodes, edges, fileTree, fileRoles (JSON)
- **Follow** — User follow relationships
- **ActivityEvent** — Feed events (ANALYSE, SCREENSHOT, etc.)
- **AuditLog** — Admin action log
- **GuestUsage** — Anonymous user trial tracking (by deviceId + IP)
- **Screenshot** — Saved graph screenshots with shareToken

---

## Authentication

Sign in with Google OAuth. The first account matching `ADMIN_EMAIL` in the environment is automatically promoted to the `ADMIN` role.

Guest users (not signed in) can analyse up to 3 repositories. After that, they are prompted to sign in.

---

## PWA and Offline Support

GraphyyCode is a Progressive Web App:

- **Install** — Browsers will prompt to install the app on mobile and desktop
- **Offline caching** — The service worker caches static assets and previously loaded analyses
- **Offline page** — When a navigate request fails offline, users are shown `/offline` with cached content links
- **IndexedDB** — Analysis artifacts and dashboard history are cached locally using `localforage`

---

## Testing

### Unit tests (Vitest)

```bash
pnpm test
```

Tests are in `tests/unit/` and cover:

- `cn()` utility (`utils.test.ts`)
- Prisma schema structure (`schema.test.ts`)
- Guest usage limit logic (`guest-limit.test.ts`)
- Dependency graph builder (`graph-builder.test.ts`)
- RBAC helpers (`rbac.test.ts`)
- `timeAgo()` relative time formatter (`time.test.ts`)
- GitHub URL parser (`github.test.ts`)

### End-to-end tests (Playwright)

```bash
pnpm test:e2e
```

Tests are in `tests/e2e/` and cover:

- Landing page rendering, navigation, mobile menu (`landing.spec.ts`)
- Guest limit flow and visualiser navigation (`guest-limit.spec.ts`)
- Offline page rendering and content (`offline.spec.ts`)

---

## CI/CD

GitHub Actions runs on every push to `main`:

1. **Lint and typecheck** — ESLint + TypeScript
2. **Unit tests** — Vitest
3. **E2E tests** — Playwright on Desktop Chrome + Mobile Chrome

See `.github/workflows/ci.yml`.

---

## Deployment

### Vercel (recommended)

1. Import the repository at [vercel.com](https://vercel.com)
2. Add all environment variables from `.env` in the Vercel dashboard
3. Deploy — Vercel handles Next.js automatically

### Docker / self-hosted

```bash
pnpm build
pnpm start
```

The background worker must be run separately alongside the web process.

---

## Design Principles

- **No gradients, no neon** — Black background (`#0B0B0C`), white text, single blue accent (`#3B82F6`)
- **Minimal UI** — Clean, readable, professional
- **Mobile-first** — Responsive tabs on small screens, 3-panel layout on desktop
- **Accessible** — Reduced motion support (`prefers-reduced-motion`), semantic HTML

---

## License

MIT
