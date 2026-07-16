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
// Compact product item for lists.\1

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

export const digitalTriggerSchema = z.union([z.literal(0), z.literal(1)]);

export const updateChannelSchema = z.discriminatedUnion("type", [
  z.object({
    deviceId: z.string().min(1).max(30),
    channelName: z.string().min(1).max(30),
    type: z.enum(["ai", "ao"]),
    index: z.number().int().min(0).max(15),
    min: z.number().optional(),
    max: z.number().optional(),
    mapMin: z.number().optional(),
    mapMax: z.number().optional(),
    notifyMobile: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
    notifySms: z.boolean().optional(),
  }),
  z.object({
    deviceId: z.string().min(1).max(30),
    channelName: z.string().min(1).max(30),
    type: z.enum(["di", "do"]),
    index: z.number().int().min(0).max(15),
    trigger: digitalTriggerSchema.optional(), // 0 = dispara em LOW, 1 = dispara em HIGH
    notifyMobile: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
    notifySms: z.boolean().optional(),
  }),
]);

export type UpdateChannelBody = z.infer<typeof updateChannelSchema>;

export const digitalChannelItemSchema = z.object({
  channelName: z.string().optional(),
  trigger: digitalTriggerSchema.optional(),
  notifyMobile: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
});

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

export const getAllChannelsResponseSchema = z.object({
  ai: z.record(z.string(), channelItemSchema),
  ao: z.record(z.string(), channelItemSchema),
  di: z.record(z.string(), digitalChannelItemSchema),
  do: z.record(z.string(), digitalChannelItemSchema),
});

export const semverRegex = /^\d+\.\d+\.\d+$/;

export const getFirmwareUploadUrlBodySchema = z.object({
  version: z.string().regex(semverRegex, "Versão deve seguir o formato X.Y.Z"),
  extension: z.enum(["bin", "hex", "uf2"]),
});

const logicInputSchema = z.tuple([z.number().int(), z.number()]);

export const logicBlockSchema = z.object({
  id: z.number().int(),
  t: z.number().int(), // BlockType index (io / math / compare / timer)
  in: z.array(logicInputSchema).default([]),
  io: z.tuple([z.number().int(), z.number().int()]).optional(), // [ioType, channel]
  op: z.number().int().optional(), // math/compare op index
  time: z.number().optional(), // redundante, mantido por compat com o firmware
  lg: z.number().int().optional(), // 1=AND, 2=OR, 3=NOT (cosmético, só o app usa)
  // Posição no canvas — o firmware não lê isso, é só pra reconstruir o
  // layout visual ao carregar do backend (ver _deserializeLogic no Flutter,
  // que já suporta x/y quando presentes).
  x: z.number().optional(),
  y: z.number().optional(),
});

export const saveLogicBodySchema = z.object({
  v: z.number().int(),
  blocks: z.array(logicBlockSchema),
});

export const saveLogicResponseSchema = z.object({
  message: z.string(),
  updatedAt: z.string(),
});

export const getLogicResponseSchema = z.object({
  v: z.number().int(),
  blocks: z.array(logicBlockSchema),
  updatedAt: z.string().nullable(),
});

export type SaveLogicBody = z.infer<typeof saveLogicBodySchema>;

export const getLogicForDeviceResponseSchema = z.object({
  v: z.number().int(),
  blocks: z.array(logicBlockSchema),
  updatedAt: z.string().nullable(),
});