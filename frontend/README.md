# KnowledgeOS Frontend

React + TypeScript + Vite SPA for the KnowledgeOS document knowledge base.

## Run (development)

```powershell
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to `http://localhost:8080`, so start the Spring Boot backend first. No CORS changes are needed in the backend.

## Modes

| Mode | How | Behavior |
| --- | --- | --- |
| Real API | `VITE_ENABLE_MOCKS=false` (default) | All requests hit the backend; failures surface as error banners with retry. Nothing is ever fabricated. |
| Demo | set `VITE_ENABLE_MOCKS=true` in `.env.development.local` | Canned documents/answers served from `src/mocks/mockBackend.ts`; "Demo mode" indicator shows in the sidebar. |

## Env vars

Copy `.env.example` to `.env.development.local` and adjust:

- `VITE_API_BASE_URL` — API base path (default `/api`, relies on the Vite proxy)
- `VITE_ENABLE_MOCKS` — `true` to use the demo mock layer

## Scripts

- `npm run dev` — dev server on :5173
- `npm run build` — type-check then production build
- `npm run lint` — ESLint
- `npm run preview` — serve the production build

## Structure

```
src/
  api/        typed client, endpoint modules, mock/real selection
  mocks/      demo-mode data source (implements the same interfaces)
  hooks/      TanStack Query wrappers per feature
  components/ layout, ui primitives, documents, chat
  pages/      DocumentsPage, DocumentDetailPage, ChatPage
```
