import { redirect } from 'next/navigation';

export default function ModernLoginRedirect() {
  redirect('/admin/dashboard');
}

