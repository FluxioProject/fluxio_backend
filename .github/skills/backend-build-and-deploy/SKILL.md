---
name: backend-build-and-deploy
description: "Build, lint, emulate, inspect logs, and deploy the Fluxio Firebase Functions backend. Use when: compiling TypeScript, running the local Functions emulator, deploying backend changes, or checking Firebase function logs."
argument-hint: "Optional: 'serve', 'deploy', 'logs', or 'lint'"
---

# Backend Build and Deploy

## When to Use

- Install backend dependencies
- Compile TypeScript
- Run ESLint
- Start the Firebase Functions emulator
- Deploy Cloud Functions
- Read Firebase Functions logs

## Commands

```bash
cd functions

# Install dependencies
npm install

# Compile TypeScript into lib/
npm run build

# Lint TypeScript and JavaScript files
npm run lint

# Local emulator
npm run serve

# Deploy Functions
npm run deploy

# Firebase Functions logs
npm run logs
```

## Environment Setup

```bash
cp .env.example .env
```

Set `PUBLIC_API_KEY` in `.env` to the same shared key used by the Flutter clients and ESP32 firmware.

For deployed Functions, configure the same key in the runtime environment before deploying.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `PUBLIC_API_KEY` rejected | Client and backend keys differ | Update `.env`, deployed env, and client `.env.json` files together |
| Emulator starts but routes fail | TypeScript build is stale | Run `npm run build` again |
| Deploy fails on Node version | Wrong local Node.js version | Use Node.js 22 |
| Firebase permission error | CLI is not logged in or wrong project | Run `firebase login` and verify `.firebaserc` |
| Zod/Fastify validation error | Schema and service response differ | Update `src/schemas/` and route response declarations |

## Safety Rules

- Do not commit `.env`.
- Do not paste real API keys into source files or documentation.
- Do not rename API routes without updating ESP32 firmware, Flutter mobile, and Flutter web.
