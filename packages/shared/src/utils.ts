import { ZodSchema } from 'zod';

export const parseOrThrow = <T>(schema: ZodSchema<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '));
  }

  return parsed.data;
};
