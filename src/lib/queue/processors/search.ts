import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { JobProcessor } from '../types';

type SearchReindexPayload = {
  entity_type: 'case' | 'message' | 'patient' | 'dentist' | 'clinic';
  entity_id: string;
};

export const processSearchReindex: JobProcessor<SearchReindexPayload> = async (job) => {
  const admin = createSupabaseAdminClient();
  const { entity_type, entity_id } = job.payload;
  if (!entity_type || !entity_id) throw new Error('search_reindex payload invalid');

  const snapshot = await buildSnapshot(admin, entity_type, entity_id);
  if (!snapshot) return { skipped: true };

  await admin.from('search_index').upsert(
    {
      organization_id: job.organization_id,
      entity_type,
      entity_id,
      title: snapshot.title,
      content: snapshot.content,
      metadata: snapshot.metadata ?? {}
    },
    { onConflict: 'entity_type,entity_id' }
  );

  return { indexed: true };
};

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function buildSnapshot(
  admin: AdminClient,
  type: SearchReindexPayload['entity_type'],
  id: string
): Promise<{ title: string; content: string; metadata?: Record<string, unknown> } | null> {
  switch (type) {
    case 'case': {
      const { data } = await admin
        .from('cases')
        .select('case_number, title, clinical_description, material, shade, dentist_notes')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        title: `${data.case_number} · ${data.title}`,
        content: [data.clinical_description, data.material, data.shade, data.dentist_notes]
          .filter(Boolean)
          .join(' \n '),
        metadata: { case_number: data.case_number }
      };
    }
    case 'message': {
      const { data } = await admin
        .from('case_messages')
        .select('message, case_id')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        title: 'Mensagem',
        content: data.message,
        metadata: { case_id: data.case_id }
      };
    }
    case 'patient': {
      const { data } = await admin
        .from('patients')
        .select('full_name, external_ref, notes')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        title: data.full_name,
        content: [data.external_ref, data.notes].filter(Boolean).join(' '),
        metadata: {}
      };
    }
    case 'dentist': {
      const { data } = await admin
        .from('dentists')
        .select('full_name, cro_number, email, phone')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        title: data.full_name,
        content: [data.cro_number, data.email, data.phone].filter(Boolean).join(' '),
        metadata: {}
      };
    }
    case 'clinic': {
      const { data } = await admin
        .from('clinics')
        .select('trade_name, legal_name, city, state')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        title: data.trade_name,
        content: [data.legal_name, data.city, data.state].filter(Boolean).join(' '),
        metadata: {}
      };
    }
    default:
      return null;
  }
}
