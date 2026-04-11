/**
 * Client delivery schedule and format preferences.
 * Set during onboarding (Stepper), stored on podcaster_users row.
 */

export type DeliveryInterval = 'daily' | 'weekly' | 'per_episode' | 'custom';
export type DocumentFormat = 'study' | 'commercial' | 'both';
export type NotificationChannel = 'email' | 'dashboard' | 'webhook';

export interface DeliveryPreferences {
  interval: DeliveryInterval;
  deliveryTime: string;
  timezone: string;
  emailDelivery: boolean;
  emailAddress: string;
  format: DocumentFormat;
  notificationChannels: NotificationChannel[];
  customCron?: string;
}

export const DEFAULT_PREFERENCES: DeliveryPreferences = {
  interval: 'daily',
  deliveryTime: '05:00',
  timezone: 'America/New_York',
  emailDelivery: true,
  emailAddress: '',
  format: 'both',
  notificationChannels: ['email', 'dashboard'],
};

export function validatePreferences(prefs: Partial<DeliveryPreferences>): string[] {
  const errors: string[] = [];

  if (prefs.deliveryTime && !/^\d{2}:\d{2}$/.test(prefs.deliveryTime)) {
    errors.push('deliveryTime must be HH:MM format');
  }

  if (prefs.emailDelivery && !prefs.emailAddress) {
    errors.push('emailAddress required when emailDelivery is true');
  }

  if (prefs.interval === 'custom' && !prefs.customCron) {
    errors.push('customCron required when interval is custom');
  }

  return errors;
}
