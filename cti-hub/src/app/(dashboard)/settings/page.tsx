import { redirect } from 'next/navigation';

/** Settings absorbed into Circuit Box per 2026-04-08 directive. */
export default function SettingsRedirect() {
  redirect('/circuit-box');
}
