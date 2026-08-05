import { describe, it, expect } from 'vitest';
import {
  stageSchema,
  advanceCardSchema,
  updatePrioritySchema,
  technicianSchema,
  skillSchema,
  extractStageForm,
  extractTechnicianForm,
  CARD_PRIORITIES,
  TECH_STATUSES,
  SKILL_LEVELS
} from '../src/lib/validations/production';

describe('production validations', () => {
  describe('stageSchema', () => {
    it('accepts valid stage payload', () => {
      const parsed = stageSchema.parse({
        name: 'Modelagem',
        slug: 'modeling',
        color: '#3B82F6',
        position: 10,
        sla_hours: 48,
        is_terminal: false,
        is_rework: false,
        is_initial: false,
        is_active: true
      });
      expect(parsed.slug).toBe('modeling');
      expect(parsed.color).toBe('#3B82F6');
    });

    it('rejects invalid slug', () => {
      const res = stageSchema.safeParse({
        name: 'ok',
        slug: 'INVALID SPACE',
        color: '#000000',
        position: 0
      });
      expect(res.success).toBe(false);
    });

    it('rejects invalid hex color', () => {
      const res = stageSchema.safeParse({
        name: 'ok',
        slug: 'ok',
        color: 'not-a-color',
        position: 0
      });
      expect(res.success).toBe(false);
    });

    it('coerces position to int', () => {
      const parsed = stageSchema.parse({
        name: 'ok',
        slug: 'ok',
        color: '#111111',
        position: '5'
      });
      expect(parsed.position).toBe(5);
    });
  });

  describe('advanceCardSchema', () => {
    it('requires valid uuids', () => {
      const res = advanceCardSchema.safeParse({
        card_id: 'not-uuid',
        to_stage_id: 'also-not-uuid'
      });
      expect(res.success).toBe(false);
    });

    it('accepts minimal payload', () => {
      const parsed = advanceCardSchema.parse({
        card_id: '00000000-0000-0000-0000-000000000001',
        to_stage_id: '00000000-0000-0000-0000-000000000002'
      });
      expect(parsed.is_rework).toBe(false);
    });
  });

  describe('updatePrioritySchema', () => {
    it.each(CARD_PRIORITIES)('accepts priority %s', (p) => {
      const parsed = updatePrioritySchema.parse({
        card_id: '00000000-0000-0000-0000-000000000001',
        priority: p
      });
      expect(parsed.priority).toBe(p);
    });

    it('rejects invalid priority', () => {
      const res = updatePrioritySchema.safeParse({
        card_id: '00000000-0000-0000-0000-000000000001',
        priority: 'super_urgent'
      });
      expect(res.success).toBe(false);
    });
  });

  describe('technicianSchema', () => {
    it('applies defaults', () => {
      const parsed = technicianSchema.parse({
        profile_id: '00000000-0000-0000-0000-000000000001'
      });
      expect(parsed.status).toBe('active');
      expect(parsed.weekly_hours).toBe(40);
    });

    it.each(TECH_STATUSES)('accepts status %s', (s) => {
      const parsed = technicianSchema.parse({
        profile_id: '00000000-0000-0000-0000-000000000001',
        status: s
      });
      expect(parsed.status).toBe(s);
    });

    it('caps weekly_hours at 80', () => {
      const res = technicianSchema.safeParse({
        profile_id: '00000000-0000-0000-0000-000000000001',
        weekly_hours: 200
      });
      expect(res.success).toBe(false);
    });
  });

  describe('skillSchema', () => {
    it.each(SKILL_LEVELS)('accepts level %s', (l) => {
      const parsed = skillSchema.parse({
        technician_id: '00000000-0000-0000-0000-000000000001',
        skill: 'CAD',
        level: l
      });
      expect(parsed.level).toBe(l);
    });

    it('rejects too-short skill name', () => {
      const res = skillSchema.safeParse({
        technician_id: '00000000-0000-0000-0000-000000000001',
        skill: 'a',
        level: 'expert'
      });
      expect(res.success).toBe(false);
    });
  });

  describe('extractStageForm', () => {
    it('parses FormData with boolean flags', () => {
      const fd = new FormData();
      fd.set('name', 'Fresagem');
      fd.set('slug', 'fresagem');
      fd.set('color', '#111111');
      fd.set('position', '20');
      fd.set('is_terminal', 'on');
      fd.set('is_active', 'on');
      const raw = extractStageForm(fd);
      const parsed = stageSchema.parse(raw);
      expect(parsed.is_terminal).toBe(true);
      expect(parsed.is_active).toBe(true);
      expect(parsed.position).toBe(20);
    });

    it('defaults is_active to true when absent', () => {
      const fd = new FormData();
      fd.set('name', 'Ok');
      fd.set('slug', 'ok');
      const raw = extractStageForm(fd);
      const parsed = stageSchema.parse(raw);
      expect(parsed.is_active).toBe(true);
    });
  });

  describe('extractTechnicianForm', () => {
    it('parses FormData with defaults', () => {
      const fd = new FormData();
      fd.set('profile_id', '00000000-0000-0000-0000-000000000001');
      fd.set('specialty', 'Ceramista');
      fd.set('weekly_hours', '30');
      const raw = extractTechnicianForm(fd);
      const parsed = technicianSchema.parse(raw);
      expect(parsed.specialty).toBe('Ceramista');
      expect(parsed.weekly_hours).toBe(30);
      expect(parsed.status).toBe('active');
    });
  });
});
