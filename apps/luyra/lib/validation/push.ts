import { z } from "zod";

const endpointSchema = z
  .string()
  .trim()
  .min(1, "Push endpoint is required")
  .max(4096, "Push endpoint is too long")
  .url("Push endpoint must be a valid URL")
  .refine((value) => value.startsWith("https://"), "Push endpoint must use HTTPS");

export const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  p256dh: z.string().trim().min(1, "p256dh key is required").max(1024),
  auth: z.string().trim().min(1, "auth key is required").max(1024),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
