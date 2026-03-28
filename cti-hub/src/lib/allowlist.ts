/**
 * Owner allowlist — only these emails can access CTI HUB.
 * Everyone else gets denied even with a valid Firebase account.
 */
export const ALLOWED_EMAILS = [
  'bpo@achievemor.io',
  'jarrett.risher@gmail.com',
];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}
