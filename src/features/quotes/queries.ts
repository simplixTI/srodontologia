import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Quote } from './types';

export type QuoteItem = {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  sort_order: number;
};

export async function listCaseQuotes(caseId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Quote[];
}

export async function listQuoteItems(quoteIds: string[]) {
  if (quoteIds.length === 0) return new Map<string, QuoteItem[]>();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('quote_items')
    .select('*')
    .in('quote_id', quoteIds)
    .order('sort_order');
  if (error) throw new Error(error.message);

  const map = new Map<string, QuoteItem[]>();
  for (const it of (data ?? []) as QuoteItem[]) {
    const arr = map.get(it.quote_id) ?? [];
    arr.push(it);
    map.set(it.quote_id, arr);
  }
  return map;
}
