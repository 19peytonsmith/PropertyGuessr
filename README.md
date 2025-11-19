# PropertyGuessr

PropertyGuessr is a small Next.js web app that turns browsing property listings into a guessing game: players try to guess listing prices and compete on leaderboards. It's built with Next.js (React), Material UI, Bootstrap, Tailwind, and some lightweight components, both internally-made and externally-sourced. The repository contains the web frontend and a minimal API route used by the app.

## Production Site

Now officially released at [https://propertyguessr.vercel.app](https://propertyguessr.vercel.app/)!

## Quick overview

- Framework: Next.js (app router)
- Language: TypeScript + React
- Dev server: port 3000
- Scripts available: `dev`, `build`, `start`, `lint` (see `package.json`)

## Prerequisites

- Docker & Docker Compose (for the Docker workflow)
- or Node.js (v18+ recommended) and npm if you prefer to run locally

## Run with Docker Compose (recommended for development)

1. From the repository root (the folder that contains `docker-compose.yml`) run in PowerShell:

```powershell
docker-compose up --build
```

2. Open http://localhost:3000 in your browser.

3. To stop and remove containers:

```powershell
docker-compose down
```

Notes:

- The compose file mounts the `propertyguessr/` subfolder into the container so the container sees the app's `package.json`. If you edited compose or Dockerfile, make sure the service's `volumes` points at `./propertyguessr/:/app`.

## Run locally without Docker

1. Change into the app folder and install dependencies:

```powershell
cd .\propertyguessr
npm ci
```

2. Start the dev server:

```powershell
npm run dev
```

3. Build for production and start:

```powershell
npm run build
npm start
```

## Useful scripts

- npm run dev — start Next.js in development (turbopack)
- npm run build — build for production
- npm start — run the production server
- npm run lint — run eslint

## Troubleshooting

- ENOENT for `/app/package.json` during `docker-compose up`: this usually means the container's `/app` was overwritten by a bind mount that doesn't contain `package.json`. Ensure `docker-compose.yml` has the service volume set to `./propertyguessr/:/app` (not `./:/app`).
- If you see file-watching problems on Windows, enable polling: the compose file already sets `WATCHPACK_POLLING=true` in development.

## Contributing

Contributions are welcome. Open an issue or submit a pull request for fixes and features.
