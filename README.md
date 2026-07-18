# monochrome-admin-ui

React/Vite admin portal for **admin-api-server** — platform operators manage LLM
providers & assignments, organizations, global/org instructions, and system config.

Part of the [bouc.io AI platform](../../../documentation/getting-started/README.md#ai-assistant-platform).

## Features

- Manage LLM providers and per-phase model assignments
- Manage organizations and global/org-level instructions
- Requires an admin-portal role (see `admin-api-server` roles)
- Keycloak SSO auth, or `stub` mode for local dev
- Built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- A running `admin-api-server` (see its README)

## Setup & Run

```sh
npm install
cp .env.example .env      # then edit values
npm run dev               # dev server at http://localhost:8080
```

## Build & Test

```sh
npm run build             # production build -> dist/
npm run build:dev         # dev-mode build
npm run preview           # preview the production build
npm run lint              # ESLint
npm run test              # Vitest
```

## Environment

All config is via `VITE_*` variables — see [`.env.example`](./.env.example) for the
full list (backend API URL, Keycloak SSO, identity-provider mode, dev tokens).

## Project structure

- `src/pages/` — top-level pages
- `src/components/` — UI components
- `src/context/` — auth / theme / language providers
- `src/hooks/` — custom hooks
- `src/lib/` — API utilities

## License

[Elastic License 2.0](./LICENSE) — source-available; not OSI open source.
