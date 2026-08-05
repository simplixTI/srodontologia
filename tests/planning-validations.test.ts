import { describe, it, expect } from 'vitest';
import {
  versionCreateSchema,
  transitionSchema,
  templateSchema,
  templateItemSchema,
  extractTemplateForm,
  checklistItemToggleSchema,
  checklistItemAddSchema,
  commentSchema
} from '../src/lib/validations/planning';

const UUID = '00000000-0000-0000-0000-000000000001';

describe('planning validations', () => {
  describe('versionCreateSchema', () => {
    it('accepts minimal payload', () => {
      const parsed = versionCreateSchema.parse({ case_id: UUID });
      expect(parsed.case_id).toBe(UUID);
    });

    it('rejects non-uuid case_id', () => {
      const res = versionCreateSchema.safeParse({ case_id: 'not-uuid' });
      expect(res.success).toBe(false);
    });

    it('accepts template_id and estimated_delivery_at', () => {
      const parsed = versionCreateSchema.parse({
        case_id: UUID,
        template_id: UUID,
        estimated_delivery_at: '2026-08-10T12:00:00Z'
      });
      expect(parsed.template_id).toBe(UUID);
    });

    it('rejects invalid datetime', () => {
      const res = versionCreateSchema.safeParse({
        case_id: UUID,
        estimated_delivery_at: 'not-a-date'
      });
      expect(res.success).toBe(false);
    });
  });

  describe('transitionSchema', () => {
    it.each(['sent', 'approved', 'changes_requested', 'obsolete'] as const)(
      'accepts %s',
      (target) => {
        const parsed = transitionSchema.parse({ version_id: UUID, target });
        expect(parsed.target).toBe(target);
      }
    );

    it('rejects invalid target', () => {
      const res = transitionSchema.safeParse({ version_id: UUID, target: 'draft' });
      expect(res.success).toBe(false);
    });
  });

  describe('templateSchema', () => {
    it('parses minimal fields', () => {
      const parsed = templateSchema.parse({ name: 'Prótese padrão' });
      expect(parsed.is_active).toBe(true);
      expect(parsed.is_default).toBe(false);
    });

    it('rejects short name', () => {
      const res = templateSchema.safeParse({ name: 'a' });
      expect(res.success).toBe(false);
    });
  });

  describe('extractTemplateForm', () => {
    it('reads is_default checkbox', () => {
      const fd = new FormData();
      fd.set('name', 'Template A');
      fd.set('description', 'Descrição');
      fd.set('is_default', 'on');
      fd.set('is_active', 'on');
      const raw = extractTemplateForm(fd);
      const parsed = templateSchema.parse(raw);
      expect(parsed.is_default).toBe(true);
      expect(parsed.is_active).toBe(true);
    });

    it('defaults is_active true when absent', () => {
      const fd = new FormData();
      fd.set('name', 'Template B');
      const raw = extractTemplateForm(fd);
      const parsed = templateSchema.parse(raw);
      expect(parsed.is_active).toBe(true);
    });
  });

  describe('templateItemSchema', () => {
    it('accepts valid payload', () => {
      const parsed = templateItemSchema.parse({
        template_id: UUID,
        label: 'Verificar oclusão'
      });
      expect(parsed.is_required).toBe(true);
      expect(parsed.position).toBe(0);
    });

    it('coerces position to number', () => {
      const parsed = templateItemSchema.parse({
        template_id: UUID,
        label: 'Test',
        position: '5'
      });
      expect(parsed.position).toBe(5);
    });

    it('rejects too-short label', () => {
      const res = templateItemSchema.safeParse({ template_id: UUID, label: 'a' });
      expect(res.success).toBe(false);
    });
  });

  describe('checklistItemToggleSchema', () => {
    it('parses is_done boolean', () => {
      const parsed = checklistItemToggleSchema.parse({ item_id: UUID, is_done: true });
      expect(parsed.is_done).toBe(true);
    });
  });

  describe('checklistItemAddSchema', () => {
    it('accepts minimal payload', () => {
      const parsed = checklistItemAddSchema.parse({
        planning_version_id: UUID,
        label: 'Item importante'
      });
      expect(parsed.is_required).toBe(true);
    });
  });

  describe('commentSchema', () => {
    it('defaults is_internal true', () => {
      const parsed = commentSchema.parse({
        planning_version_id: UUID,
        body: 'texto'
      });
      expect(parsed.is_internal).toBe(true);
    });

    it('rejects empty body', () => {
      const res = commentSchema.safeParse({
        planning_version_id: UUID,
        body: ''
      });
      expect(res.success).toBe(false);
    });

    it('rejects too-long body', () => {
      const res = commentSchema.safeParse({
        planning_version_id: UUID,
        body: 'x'.repeat(5000)
      });
      expect(res.success).toBe(false);
    });
  });
});
