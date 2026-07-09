// src/routes/product_routes.ts
import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { verifyToken } from "../auth/tokens";
import * as ProductSchemas from "../schemas/product_schemas";
import * as ProductService from "../services/product_service";
import { sendNotification } from "../services/notification_service";

export async function productRoutes(app: FastifyInstance) {
  // Create a new product.
  app.post(
    "/create",
    {
      preHandler: verifyToken as any,
      schema: {
        body: ProductSchemas.createProductBodySchema,
        response: {
          200: ProductSchemas.createProductResponseSchema,
          400: z.any(),
          401: z.string(),
          403: z.string(),
          500: z.string(),
        },
      },
    },
    (request: FastifyRequest<{ Body: ProductSchemas.CreateProductBody }>, reply) => {
      return ProductService.createProductService(request, reply);
    }
  );

  // Send a mobile push notification.
  app.post(
    "/send-notification",
    {
      schema: {
        body: ProductSchemas.sendNotification,
        response: {
          200: z.object({
            message: z.string(),
          }),
          400: z.object({ message: z.string() }),
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },

      },
    },
    (request: FastifyRequest<{ Body: ProductSchemas.SendNotificationBody }>, reply) => {
      return sendNotification(request.body.deviceid, request.body.message);
    }
  );

  // Get device MQTT credentials.
  app.get(
    "/mqtt",
    {
      schema: {
        querystring: z.object({
          deviceId: z.string(),
        }),
        response: {
          200: ProductSchemas.mqttCredentialsResponseSchema,
          400: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    (request, reply) => {
      return ProductService.getMqttCredentialsService(request, reply);
    }
  );

  // Edit the device name.
  app.patch(
    "/edit-device/:deviceId",
    {
      preHandler: verifyToken as any,
      schema: {
        params: z.object({
          deviceId: z.string(),
        }),
        body: ProductSchemas.updateDeviceBodySchema,
        response: {
          200: ProductSchemas.updateDeviceResponseSchema,
          400: z.string(),
          401: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    (
      request: FastifyRequest<{
        Params: { deviceId: string };
        Body: ProductSchemas.UpdateDeviceBody;
      }>,
      reply
    ) => {
      return ProductService.updateDeviceNameService(request, reply);
    }
  );

  // Update a device channel.
  app.patch(
    "/update-channel",
    {
      preHandler: verifyToken as any,
      schema: {
        body: ProductSchemas.updateChannelSchema,
        response: {
          200: ProductSchemas.updateChannelResponseSchema,
          400: z.string(),
          401: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    (
      request: FastifyRequest<{ Body: ProductSchemas.UpdateChannelBody }>,
      reply
    ) => {
      return ProductService.updateChannelService(request, reply);
    }
  );

  // Get all device channels.
  app.get(
    "/get-all-channels",
    {
      schema: {
        querystring: ProductSchemas.getAllChannelsSchema,
        response: {
          200: ProductSchemas.getAllChannelsResponseSchema,
          400: z.string(),
          401: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    (
      request: FastifyRequest<{
        Querystring: {
          deviceId: string;
        };
      }>,
      reply
    ) => {
      return ProductService.getAllChannelsService(request, reply);
    }
  );

  // Delete a device.
  app.delete(
    "/delete-device/:deviceId",
    {
      preHandler: verifyToken as any,
      schema: {
        params: z.object({
          deviceId: z.string(),
        }),
        response: {
          200: ProductSchemas.deleteDeviceResponseSchema,
          401: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    (
      request: FastifyRequest<{
        Params: { deviceId: string };
      }>,
      reply
    ) => {
      return ProductService.deleteDeviceService(request, reply);
    }
  );

  // Upload device firmware.
  app.post(
    "/:deviceId/firmware/get-upload-url",
    {
      preHandler: verifyToken as any,
      schema: {
        params: z.object({ deviceId: z.string() }),
        response: {
          200: ProductSchemas.getFirmwareUploadUrlResponseSchema,
          401: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    ProductService.getFirmwareUploadUrlService
  );

  // Commit firmware metadata.
  app.post(
    "/:deviceId/firmware/commit",
    {
      preHandler: verifyToken as any,
      schema: {
        params: z.object({ deviceId: z.string() }),
        body: ProductSchemas.commitFirmwareBodySchema,
        response: {
          200: z.object({
            readUrl: z.string(),
            version: z.string(),
          }),
          401: z.string(),
          404: z.string(),
          500: z.string(),
        },
      },
    },
    ProductService.commitFirmwareService
  );
}
