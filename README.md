# TCC Backend

Firebase Cloud Functions backend for the TCC project.

## Stack

- Firebase Functions v2
- Fastify
- TypeScript
- Zod
- Firebase Admin SDK
- Firestore
- Firebase Auth
- Firebase Cloud Messaging
- Cloud Storage signed URLs

## Project Structure

```text
functions/
  src/
    app.ts                 Fastify app setup
    index.ts               Firebase Functions HTTPS entrypoint
    firebaseAdmin.ts       Firebase Admin singleton setup
    auth/                  Auth and API key middleware
    routes/                Fastify route definitions
    schemas/               Zod request/response schemas
    services/              Business logic
```

## Requirements

- Node.js 22
- Firebase CLI
- Access to the Firebase project configured in `.firebaserc`

## Setup

```sh
cd functions
npm install
```

## Build

```sh
npm run build
```

If PowerShell blocks `npm.ps1`, run:

```sh
npm.cmd run build
```

## Run Locally

```sh
npm run serve
```

This builds the TypeScript project and starts the Firebase Functions emulator.

## Deploy

```sh
npm run deploy
```

## Notes

- All routes require the public `x-api-key` header, except CORS preflight requests.
- Authenticated user routes use the `__session` cookie.
- Mobile notification sends are rate-limited per device through Firestore to avoid repeated push bursts.
