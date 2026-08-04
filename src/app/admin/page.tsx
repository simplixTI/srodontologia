import { redirect } from 'next/navigation';

// /admin is a legacy entry point that now sends users into the SR HUB flow.
// force-dynamic prevents the CDN from caching a stale redirect response.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminEntryRedirect() {
  redirect('/login');
}
