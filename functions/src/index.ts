import { onRequest } from "firebase-functions/v2/https";
import { buildApp } from "./app";

const app = buildApp();

export const api = onRequest(
  {
    secrets: ["PUBLIC_API_KEY"],
  },
  async (req, res) => {
    await app.ready();
    app.server.emit("request", req, res);
  }
);