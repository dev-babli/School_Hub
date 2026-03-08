import { redirect } from 'next/navigation';

export default function ModernLoginRedirect() {
  redirect('/auth/login');
}

