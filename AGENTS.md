# AGENTS.md

## Project Overview

This repository contains the Firebase Cloud Functions backend for the TCC project. The functions app is implemented with Fastify, TypeScript, Zod schemas, Firebase Admin, Firestore, Firebase Auth, Cloud Storage, and Firebase Cloud Messaging.

The deployed HTTPS entrypoint is `api` in `functions/src/index.ts`. Fastify routes are registered under `/users` and `/devices`.

## Development Commands

Run commands from `functions/` unless noted otherwise:

```sh
npm install
npm run build
npm run serve
npm run deploy
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`:

```sh
npm.cmd run build
npm.cmd run serve
```

## Code Guidelines

- Keep comments and documentation in English.
- Keep API response text stable unless the frontend contract is being updated too.
- Prefer existing service, route, and schema patterns before adding new abstractions.
- Validate request payloads with Zod schemas in `functions/src/schemas`.
- Keep Firestore write paths explicit and avoid broad recursive deletes.
- Run `npm.cmd run build` or `npm run build` before handing off changes.

## Notification Behavior

Mobile push notifications are sent from `functions/src/services/notification_service.ts`.

Each device has a Firestore-backed notification cooldown using `devices/{deviceid}.lastMobileNotificationAt`. This prevents repeated FCM sends for the same device within the configured cooldown window.
