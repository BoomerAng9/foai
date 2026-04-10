import { redirect } from 'next/navigation';

/**
 * /grading → redirects to /tie/grading (the canonical grading workbench).
 * This ensures perform.foai.cloud/grading works as expected.
 */
export default function GradingRedirect() {
  redirect('/tie/grading');
}
