import { redirect } from 'next/navigation';

// /admin is a legacy entry point that now sends users into the SR HUB flow.
export default function AdminEntryRedirect() {
  redirect('/login');
}
