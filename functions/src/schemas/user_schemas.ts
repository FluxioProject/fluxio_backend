// src/schemas/user_schemas.ts
import { z } from "zod";

export const deviceSchema = z.object({
  name: z.string(),
  deviceId: z.string(),
  createdAt: z.number().nullable(),
});

export const loginBodySchema = z.object({
  email: z
    .string()
    .email()
    .min(5, "E-mail muito curto")
    .max(120, "E-mail muito longo"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
});

export const userInfoSchema = z.object({
  name: z
    .string()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
  email: z
    .string()
    .email()
    .min(5, "E-mail muito curto")
    .max(120, "E-mail muito longo"),
});

export const mqttConfigSchema = z.object({
  host: z.string(),
  ports: z.array(z.string()),
  user: z.string(),
  pass: z.string(),
});

export const loginResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    name: z.string(),
    email: z.string(),
  }),
  devices: z.array(
    z.object({
      name: z.string(),
      deviceId: z.string(),
      createdAt: z.number().nullable(),
    })
  ),
  mqtt: mqttConfigSchema,
});


export const registerBodySchema = z.object({
  email: z
    .string()
    .email()
    .min(5, "E-mail muito curto")
    .max(120, "E-mail muito longo"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
  name: z
    .string()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
});

// Tipos inferidos
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const updateUserNameBodySchema = z.object({
  name: z
    .string()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),
});

export const updateUserResponseSchema = z.object({
  message: z.string(),
  user: userInfoSchema, // reutiliza name + email
});

export type UpdateUserNameBody = z.infer<
  typeof updateUserNameBodySchema
>;

export const saveFCMToken = z.object({
  deviceids: z.array(z.string().max(30).min(1)),
  fcmtoken: z.string().max(200).min(1),
});

export type SaveFCMToken = z.infer<
  typeof saveFCMToken
>;

export const getCredentialsFirebase = z.object({
    x4r1: z.string().min(1),   // apikey
    x4r2: z.string().min(1),   // appId
    x4r3: z.string().min(1),   // messagingSenderId
    x4r4: z.string().min(1),   // projectId
    x4r5: z.string().min(1),   // storageBucket
    x4r6: z.string().min(1),   // databaseURL
});
