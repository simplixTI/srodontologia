import { describe, it, expect } from 'vitest';
import {
  calendarEventSchema,
  extractCalendarForm,
  CALENDAR_EVENT_KINDS
} from '../src/lib/validations/calendar';
import {
  fileTagSchema,
  fileCollectionSchema,
  extractFileTagForm,
  extractCollectionForm,
  tagAssignSchema,
  collectionAddSchema
} from '../src/lib/validations/dam';

const UUID = '00000000-0000-0000-0000-000000000001';

describe('Calendar validations', () => {
  it('accepts valid event', () => {
    const parsed = calendarEventSchema.parse({
      kind: 'meeting',
      title: 'Reunião com dentista',
      start_at: '2026-08-05T10:00:00',
      end_at: '2026-08-05T11:00:00',
      color: '#3B82F6'
    });
    expect(parsed.kind).toBe('meeting');
    expect(parsed.all_day).toBe(false);
  });

  it('rejects end_at before start_at', () => {
    expect(
      calendarEventSchema.safeParse({
        kind: 'meeting',
        title: 'Test',
        start_at: '2026-08-05T14:00:00',
        end_at: '2026-08-05T10:00:00',
        color: '#3B82F6'
      }).success
    ).toBe(false);
  });

  it.each(CALENDAR_EVENT_KINDS)('accepts kind %s', (k) => {
    const parsed = calendarEventSchema.parse({
      kind: k,
      title: 'Ev',
      start_at: '2026-08-05T10:00:00',
      end_at: '2026-08-05T11:00:00'
    });
    expect(parsed.kind).toBe(k);
  });

  it('extractCalendarForm reads all_day checkbox', () => {
    const fd = new FormData();
    fd.set('title', 'Ev');
    fd.set('start_at', '2026-08-05T10:00');
    fd.set('end_at', '2026-08-05T11:00');
    fd.set('all_day', 'on');
    const raw = extractCalendarForm(fd);
    const parsed = calendarEventSchema.parse(raw);
    expect(parsed.all_day).toBe(true);
  });

  it('rejects invalid color', () => {
    expect(
      calendarEventSchema.safeParse({
        kind: 'other',
        title: 'x',
        start_at: '2026-08-05T10:00:00',
        end_at: '2026-08-05T11:00:00',
        color: 'blue'
      }).success
    ).toBe(false);
  });
});

describe('DAM validations', () => {
  it('fileTagSchema accepts minimal', () => {
    const parsed = fileTagSchema.parse({ name: 'urgente' });
    expect(parsed.color).toBe('#6B7280');
  });

  it('fileTagSchema rejects empty name', () => {
    expect(fileTagSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('extractFileTagForm builds valid', () => {
    const fd = new FormData();
    fd.set('name', 'raio-x');
    fd.set('color', '#FF0000');
    const parsed = fileTagSchema.parse(extractFileTagForm(fd));
    expect(parsed.color).toBe('#FF0000');
  });

  it('fileCollectionSchema accepts minimal', () => {
    const parsed = fileCollectionSchema.parse({ name: 'Antes/Depois' });
    expect(parsed.is_shared).toBe(true);
  });

  it('extractCollectionForm defaults is_shared true', () => {
    const fd = new FormData();
    fd.set('name', 'coleção teste');
    const parsed = fileCollectionSchema.parse(extractCollectionForm(fd));
    expect(parsed.is_shared).toBe(true);
  });

  it('tagAssignSchema requires two uuids', () => {
    expect(tagAssignSchema.safeParse({ file_id: 'x', tag_id: UUID }).success).toBe(false);
    expect(tagAssignSchema.parse({ file_id: UUID, tag_id: UUID }).file_id).toBe(UUID);
  });

  it('collectionAddSchema requires two uuids', () => {
    expect(collectionAddSchema.parse({ collection_id: UUID, file_id: UUID }).file_id).toBe(UUID);
  });
});
