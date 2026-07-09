// src/routes/user_routes.ts
import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { verifyToken } from "../auth/tokens";
import * as UserSchemas from "../schemas/user_schemas";
import * as UserService from "../services/user_service";
import { saveFCMToken } from "../services/fcm_token_service";

export async function userRoutes(app: FastifyInstance) {
  // login
  app.post(
    "/login",
    {
      schema: {
        body: UserSchemas.loginBodySchema,
        response: {
          200: UserSchemas.loginResponseSchema,
          400: z.string(),
          401: z.string(),
          403: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
          500: z.string(),
          504: z.string(),
        },
      },
    },
    (request, reply) => {
      return UserService.loginUserService(request, reply);
    }
  );

  // save-fcm-token
  app.post(
    "/save-fcm-token",
    {
      preHandler: verifyToken as any,
      schema: {
        body: UserSchemas.saveFCMToken,
        response: {
          200: z.string(),
          400: z.string(),
          401: z.string(),
          403: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
          500: z.string(),
          504: z.string(),
        },
      },
    },
    (request: FastifyRequest<{ Body: UserSchemas.SaveFCMToken }>, reply) => {
      const { userId } = request as FastifyRequest & { userId?: string };

      if (!userId) {
        reply.status(401).send("Acesso negado. Faça o login novamente.");
        return;
      }

      return saveFCMToken(
        userId,
        request.body.deviceids,
        request.body.fcmtoken,
      );
    }
  );

  // Register account.
  app.post(
    "/register",
    {
      schema: {
        body: UserSchemas.registerBodySchema,
        response: {
          200: z.string(),
          400: z.string(),
          500: z.string(),
        },
      },
    },
    (
      request: FastifyRequest<{ Body: UserSchemas.RegisterBody }>,
      reply
    ) => {
      return UserService.registerUserService(request, reply);
    }
  );

  // Delete account.
  app.delete(
    "/delete_own_account",
    {
      preHandler: verifyToken as any,
      schema: {
        response: {
          200: z.string(),
          401: z.string(),
          500: z.string(),
        },
      },
    },
    (request, reply) => {
      return UserService.deleteOwnUserService(request, reply);
    }
  );

  // logout
  app.post(
    "/logout",
    {
      preHandler: verifyToken as any,
      schema: {
        response: {
          200: z.string(),
          401: z.string(),
          500: z.string(),
        },
      },
    },
    (request, reply) => {
      return UserService.logoutUserService(request, reply);
    }
  );

  // Login persistence.
  app.get(
    "/persist",
    {
      preHandler: verifyToken as any,
      schema: {
        response: {
          200: UserSchemas.loginResponseSchema,
          401: z.string(),
          403: z.object({
            message: z.string(),
            error: z.string().optional(),
            clientIp: z.string().optional(),
            allowCidrs: z.array(z.string()).optional(),
          }),
          500: z.string(),
        },
      },
    },
    (request: FastifyRequest, reply) => {
      return UserService.persistLoginService(request, reply);
    }
  );

  // Get Firebase credentials (x3r9m2).
  app.get(
    "/x3r9m2",
    {
      preHandler: verifyToken as any,
      schema: {
        response: {
          200: UserSchemas.getCredentialsFirebase,
          401: z.string(),
          403:  z.string(),
          500: z.string(),
        },
      },
    },
    (request: FastifyRequest, reply) => {
      return UserService.getCredentialsFirebase();
    }
  );

  // Edit the user's name.
  app.patch<{ Body: z.infer<typeof UserSchemas.updateUserNameBodySchema> }>(
    "/edit",
    {
      preHandler: verifyToken as any,
      schema: {
        body: UserSchemas.updateUserNameBodySchema,
        response: {
          200: UserSchemas.updateUserResponseSchema,
          400: z.string(),
          401: z.string(),
          500: z.string(),
        },
      },
    },
    (request, reply) => {
      return UserService.updateUserNameService(request, reply);
    }
  );
}
