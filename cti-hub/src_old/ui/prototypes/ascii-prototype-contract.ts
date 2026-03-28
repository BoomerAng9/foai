import { z } from "zod";

export const AsciiPrototypeSchema = z.object({
  taskId: z.string().min(1),
  screenName: z.string().min(1),
  assumptions: z.array(z.string()).min(1),
  asciiBody: z.string().min(1),
  revision: z.number().int().min(1),
  approved: z.boolean()
});

export type AsciiPrototype = z.infer<typeof AsciiPrototypeSchema>;
