import { z } from 'zod';

import { badRequest } from './errors.js';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid email'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(500),
});

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid email'),
  role: z.enum(['viewer', 'editor']),
});

/** Parse with a zod schema; on failure throw a 400 with field-level details. */
export function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw badRequest('Validation failed', details);
  }
  return result.data;
}
