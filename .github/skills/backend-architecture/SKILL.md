---
name: backend-architecture
description: "Explains the Fluxio backend architecture, Fastify route layout, Firebase Admin usage, authentication flow, device/channel services, firmware upload flow, and push notification path. Use when: tracing API behavior, adding routes, debugging auth, or changing backend contracts."
---

# Backend Architecture

## Module Map

| Area | File(s) | Responsibility |
|---|---|---|
| Firebase entry | `functions/src/index.ts` | Exports the HTTPS Function |
| App factory | `functions/src/app.ts` | Builds Fastify app, registers plugins, API key hook, routes |
| Firebase Admin | `functions/src/firebaseAdmin.ts` | Central Admin SDK initialization |
| Auth helpers | `functions/src/auth/tokens.ts` | Public API key validation and Firebase token verification |
| User routes | `functions/src/routes/user_routes.ts` | Login, register, logout, persist, edit, delete, FCM token routes |
| Device routes | `functions/src/routes/product_routes.ts` | Device CRUD, MQTT credentials, channel config, firmware, alerts |
| Schemas | `functions/src/schemas/` | Zod request/response validation contracts |
| Services | `functions/src/services/` | Firestore/Auth/Storage/FCM business logic |

## Request Flow

```
Client or ESP32
  -> Firebase HTTPS Function
  -> Fastify app from buildApp()
  -> global verifyApiKeyPublic hook checks x-api-key
  -> route-specific verifyToken hook when required
  -> Zod request validation
  -> service function
  -> Firebase Admin SDK
  -> Zod response validation
```

## Main Contracts

- All clients must send the shared public key through `x-api-key`.
- Authenticated Flutter routes also rely on the session/token handled by `verifyToken`.
- ESP32 uses unauthenticated device-facing routes such as MQTT credential lookup, channel fetch, and notification POSTs.
- Device channel data must stay compatible with the firmware's four AI, four DI, four AO, and four DO channel model.
- Firmware update flow returns upload/read metadata consumed by Flutter and OTA metadata consumed by the ESP32.

## Adding a Route

1. Add or update the Zod schema in `functions/src/schemas/`.
2. Add a service function in `functions/src/services/`.
3. Register the Fastify route in `functions/src/routes/`.
4. Use `verifyToken` for user-owned operations.
5. Keep response schemas explicit for success and expected error statuses.
6. Build with `npm run build` and lint with `npm run lint`.

## Data Ownership

- User operations should derive user identity from verified auth context, not from untrusted request bodies.
- Device ownership checks belong in service functions before mutating Firestore or Storage state.
- FCM token storage links users, devices, and push tokens so alert notifications can target mobile clients.

## Firmware Upload Flow

```
Flutter client
  -> POST /devices/:deviceId/firmware/get-upload-url
  -> upload binary to signed Storage URL
  -> POST /devices/:deviceId/firmware/commit
  -> backend stores firmware version/read URL metadata
  -> ESP32 receives OTA metadata through its control path
```

## Do Not Change Without Understanding

- `verifyApiKeyPublic` is a global hook in `app.ts`; removing it exposes every route.
- Route response schemas are part of the client contract.
- The ESP32 firmware and Flutter clients depend on current endpoint names.
- Firebase Admin should remain centralized in `firebaseAdmin.ts`.
