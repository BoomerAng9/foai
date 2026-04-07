import { redirect } from 'next/navigation';

// /tie/rankings → /rankings (shared canonical board)
// The rankings page remains at /rankings for SEO / existing links,
// but is reachable through the TIE hub navigation.
export default function TIERankingsRedirect() {
  redirect('/rankings');
}
