// src/app.ts
import fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { userRoutes } from "./routes/user_routes";
import { productRoutes } from "./routes/product_routes";
import { verifyApiKeyPublic } from "./auth/tokens";

export function buildApp() {
  const app = fastify({
    logger: true,
    requestTimeout: 10_000,
    ajv: {
      customOptions: {
        // Important: Ajv should not validate schemas because they are Zod schemas.
        validateSchema: false,
      },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.register(cors, {
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  });

  app.addHook("preHandler", verifyApiKeyPublic as any);

  // Wire Zod into Fastify.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(rateLimit, {
    max: 80,
    timeWindow: "1 minute",
  });

  app.register(fastifyCookie);

  app.addContentTypeParser("application/json", {}, (req, body: any, done) => {
    // Support the legacy { body: <json> } payload format.
    if (body && typeof body === "object" && "body" in body) {
      return done(null, (body as any).body);
    }

    // Use regular JSON payloads directly.
    done(null, body);
  });

  app.register(userRoutes, { prefix: "/users" });
  app.register(productRoutes, { prefix: "/devices" });

  return app;
}
