import { z } from 'zod';

export const fileTagSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280')
});
export type FileTagInput = z.infer<typeof fileTagSchema>;

export function extractFileTagForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    color: fd.get('color') || '#6B7280'
  };
}

export const fileCollectionSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  is_shared: z.coerce.boolean().default(true)
});
export type FileCollectionInput = z.infer<typeof fileCollectionSchema>;

export function extractCollectionForm(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get('name'),
    description: fd.get('description'),
    color: fd.get('color') || '#3B82F6',
    is_shared: fd.get('is_shared') !== 'off' && fd.get('is_shared') !== 'false'
  };
}

export const tagAssignSchema = z.object({
  file_id: z.string().uuid(),
  tag_id: z.string().uuid()
});

export const collectionAddSchema = z.object({
  collection_id: z.string().uuid(),
  file_id: z.string().uuid()
});
