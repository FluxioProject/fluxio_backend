# Fluxio Backend

Firebase Cloud Functions backend for the Fluxio IoT platform. It exposes a Fastify API for user sessions, device ownership, channel configuration, MQTT credentials, firmware upload coordination, and mobile push notification support.

## Features

- Firebase Authentication session handling with secure cookies
- Public API key gate through the `x-api-key` header
- Device registration, editing, deletion, and channel configuration
- MQTT credential lookup for registered devices
- Firmware upload URL generation and firmware commit metadata
- FCM token storage and push notification dispatch
- Zod schemas for request and response validation
- Rate limiting, CORS, multipart support, and Firebase Functions deployment

## Requirements

- Node.js 22
- Firebase CLI
- A Firebase project with Authentication, Firestore, Storage, and Cloud Functions enabled

## Configuration

The public API key is read from an environment variable and must match the value used by the Flutter clients and ESP32 firmware:

```bash
PUBLIC_API_KEY=replace_with_shared_fluxio_api_key
```

For local development, copy `.env.example` to `.env`. The `.env` file is ignored by Git.

For deployed Firebase Functions, set the same value in the runtime environment before deploying.

## Development

```bash
cd functions
npm install
npm run build
```

Run the local emulator:

```bash
npm run serve
```

Deploy the functions:

```bash
npm run deploy
```

## API Surface

Base function: `/api`

- `/users/login`
- `/users/register`
- `/users/logout`
- `/users/persist`
- `/users/edit`
- `/users/delete_own_account`
- `/users/save-fcm-token`
- `/devices/create`
- `/devices/mqtt`
- `/devices/get-all-channels`
- `/devices/update-channel`
- `/devices/edit-device/:deviceId`
- `/devices/delete-device/:deviceId`
- `/devices/:deviceId/firmware/get-upload-url`
- `/devices/:deviceId/firmware/commit`

## Security Notes

Do not commit real API keys, Firebase service credentials, or local environment files. Rotate `PUBLIC_API_KEY` whenever it has been exposed in source control, logs, screenshots, or builds outside the intended environment.
