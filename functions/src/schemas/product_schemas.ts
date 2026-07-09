// src/schemas/product_schemas.ts
import { z } from "zod";

export const createProductBodySchema = z.object({
  name: z
    .string()
    .min(1, "Nome do produto é obrigatório.")
    .max(120, "Nome do produto deve ter no máximo 120 caracteres."),
  deviceId: z
    .string()
    .min(1, "deviceId é obrigatório.")
    .max(120, "deviceId deve ter no máximo 120 caracteres."),
});

// Successful create response.
export const createProductResponseSchema = z.object({
  message: z.string(),
});

export type CreateProductBody = z.infer<typeof createProductBodySchema>;

// Compact product item for lists.
export const productListItemSchema = z.object({
  id: z.string(),
  name: z.string().max(120),
});

// GET /products response.
export const listProductsResponseSchema = z.object({
  products: z.array(productListItemSchema),
});

export const updateProductBodySchema = z.object({
  name: z
    .string()
    .min(1, "Nome do produto é obrigatório.")
    .max(120, "Nome do produto deve ter no máximo 120 caracteres.")
    .optional(),
});

export const updateProductResponseSchema = z.object({
  message: z.string(),
});

export const deleteProductResponseSchema = z.object({
  message: z.string(),
});

export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;

export const updateDeviceBodySchema = z.object({
  name: z
    .string()
    .min(2, "Nome muito curto")
    .max(120, "Nome muito longo"),
});

export const updateDeviceResponseSchema = z.object({
  message: z.string(),
});

export type UpdateDeviceBody = z.infer<typeof updateDeviceBodySchema>;

export const deleteDeviceResponseSchema = z.object({
  message: z.string(),
});

export const mqttCredentialsResponseSchema = z.object({
  mqtt: z.object({
    host: z.string(),
    port: z.union([z.number(), z.string(), z.array(z.string())]),
    user: z.string(),
    pass: z.string(),
  }),
});

export const getFirmwareUploadUrlResponseSchema = z.object({
  uploadUrl: z.string(),
  path: z.string(),
  version: z.string(),
});

export const commitFirmwareBodySchema = z.object({
  path: z.string(),
  sha256: z.string(),
  size: z.number(),
  version: z.string(),
});

export const sendNotification = z.object({
  deviceid: z.string().min(1).max(30),
  message: z.string().max(50).min(1),
});

export type SendNotificationBody = z.infer<typeof sendNotification>;

export const updateChannelSchema = z.object({
  deviceId: z.string().min(1).max(30),
  channelName: z.string().min(1).max(30),
  type: z.enum(["ai", "ao", "di", "do"]),
  index: z.number().int().min(0).max(15),

  min: z.number().optional(),
  max: z.number().optional(),

  mapMin: z.number().optional(),
  mapMax: z.number().optional(),

  notifyMobile: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
});

export type UpdateChannelBody = z.infer<typeof updateChannelSchema>;

export const updateChannelResponseSchema = z.object({
  message: z.string(),
});

// schemas/product_schemas.ts
export const getChannelSchema = z.object({
  deviceId: z.string().min(1),
  type: z.enum(["ai", "ao", "di", "do"]),
  index: z.coerce.number().int().min(0).max(15),
});

export const getChannelResponseSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  notifyMobile: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  channelName: z.string().optional(),
});


export const getAllChannelsSchema = z.object({
  deviceId: z.string().min(1),
});
export const channelItemSchema = z.object({
  mapMin: z.number().optional(),
  mapMax: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  notifyMobile: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  channelName: z.string().optional(),
});

export const digitalChannelItemSchema = z.object({
  notifyMobile: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  channelName: z.string().optional(),
});

export const getAllChannelsResponseSchema = z.object({
  ai: z.record(z.string(), channelItemSchema),
  ao: z.record(z.string(), channelItemSchema),
  di: z.record(z.string(), digitalChannelItemSchema),
  do: z.record(z.string(), digitalChannelItemSchema),
});
