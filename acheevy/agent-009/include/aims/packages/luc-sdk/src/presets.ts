/**
 * LUC SDK - Industry Presets
 *
 * Pre-configured service buckets and plans for common industries.
 * Developers can use these as starting points or create custom configurations.
 *
 * For hosted version: LUC.plugmein.cloud
 * For open source: npm install @plugmein/luc-sdk
 */

import { LUCConfig, ServiceBucket, LUCPlan } from './types';

// ─────────────────────────────────────────────────────────────
// Configuration Builder
// ─────────────────────────────────────────────────────────────

export interface ConfigBuilder<K extends string = string> {
  services: Record<K, ServiceBucket<K>>;
  plans: Record<string, LUCPlan<K>>;
  defaultPlanId: string;
  warningThreshold: number;
  criticalThreshold: number;
}

/**
 * Create a custom LUC configuration from scratch
 */
export function createConfig<K extends string>(
  options: Partial<ConfigBuilder<K>> & {
    services: Record<K, ServiceBucket<K>>;
    plans: Record<string, LUCPlan<K>>;
  }
): LUCConfig<K> {
  return {
    services: options.services,
    plans: options.plans,
    defaultPlanId: options.defaultPlanId || Object.keys(options.plans)[0],
    warningThreshold: options.warningThreshold ?? 0.8,
    criticalThreshold: options.criticalThreshold ?? 0.9,
  };
}

/**
 * Helper to define a service bucket
 */
export function defineService<K extends string>(
  key: K,
  name: string,
  unit: string,
  overageRate: number,
  description?: string
): ServiceBucket<K> {
  return { key, name, unit, overageRate, description };
}

/**
 * Helper to define a plan
 */
export function definePlan<K extends string>(
  id: string,
  name: string,
  monthlyPrice: number,
  overageThreshold: number,
  quotas: Record<K, number>
): LUCPlan<K> {
  return { id, name, monthlyPrice, overageThreshold, quotas };
}

// ─────────────────────────────────────────────────────────────
// Real Estate Industry Preset
// ─────────────────────────────────────────────────────────────

export type RealEstateServiceKey =
  | 'property_listings'
  | 'photo_uploads'
  | 'virtual_tours'
  | 'lead_captures'
  | 'crm_contacts'
  | 'email_sends'
  | 'sms_messages'
  | 'ai_valuations'
  | 'market_reports'
  | 'storage_gb';

export const REAL_ESTATE_PRESET: LUCConfig<RealEstateServiceKey> = createConfig({
  services: {
    property_listings: defineService('property_listings', 'Property Listings', 'listing', 0.50, 'Active property listings'),
    photo_uploads: defineService('photo_uploads', 'Photo Uploads', 'photo', 0.01, 'Property photos'),
    virtual_tours: defineService('virtual_tours', 'Virtual Tours', 'tour', 2.00, '3D/360 virtual tours'),
    lead_captures: defineService('lead_captures', 'Lead Captures', 'lead', 0.10, 'Captured buyer/seller leads'),
    crm_contacts: defineService('crm_contacts', 'CRM Contacts', 'contact', 0.02, 'CRM contact records'),
    email_sends: defineService('email_sends', 'Email Sends', 'email', 0.001, 'Outbound emails'),
    sms_messages: defineService('sms_messages', 'SMS Messages', 'message', 0.02, 'Text message notifications'),
    ai_valuations: defineService('ai_valuations', 'AI Valuations', 'valuation', 0.25, 'AI property valuations'),
    market_reports: defineService('market_reports', 'Market Reports', 'report', 0.50, 'Generated market reports'),
    storage_gb: defineService('storage_gb', 'Storage', 'GB', 0.025, 'File and media storage'),
  },
  plans: {
    agent_starter: definePlan('agent_starter', 'Agent Starter', 29, 0.1, {
      property_listings: 25,
      photo_uploads: 500,
      virtual_tours: 5,
      lead_captures: 100,
      crm_contacts: 500,
      email_sends: 1000,
      sms_messages: 100,
      ai_valuations: 20,
      market_reports: 10,
      storage_gb: 5,
    }),
    agent_pro: definePlan('agent_pro', 'Agent Pro', 79, 0.2, {
      property_listings: 100,
      photo_uploads: 2000,
      virtual_tours: 25,
      lead_captures: 500,
      crm_contacts: 2500,
      email_sends: 5000,
      sms_messages: 500,
      ai_valuations: 100,
      market_reports: 50,
      storage_gb: 25,
    }),
    brokerage: definePlan('brokerage', 'Brokerage', 299, 0.3, {
      property_listings: 500,
      photo_uploads: 10000,
      virtual_tours: 100,
      lead_captures: 2500,
      crm_contacts: 10000,
      email_sends: 25000,
      sms_messages: 2500,
      ai_valuations: 500,
      market_reports: 250,
      storage_gb: 100,
    }),
  },
  defaultPlanId: 'agent_starter',
});

// ─────────────────────────────────────────────────────────────
// SaaS / API Business Preset
// ─────────────────────────────────────────────────────────────

export type SaaSServiceKey =
  | 'api_calls'
  | 'active_users'
  | 'storage_gb'
  | 'bandwidth_gb'
  | 'compute_hours'
  | 'database_queries'
  | 'webhooks'
  | 'integrations'
  | 'support_tickets';

export const SAAS_PRESET: LUCConfig<SaaSServiceKey> = createConfig({
  services: {
    api_calls: defineService('api_calls', 'API Calls', 'call', 0.0001, 'API requests'),
    active_users: defineService('active_users', 'Active Users', 'user', 1.00, 'Monthly active users'),
    storage_gb: defineService('storage_gb', 'Storage', 'GB', 0.025, 'Data storage'),
    bandwidth_gb: defineService('bandwidth_gb', 'Bandwidth', 'GB', 0.05, 'Data transfer'),
    compute_hours: defineService('compute_hours', 'Compute', 'hour', 0.05, 'Server compute time'),
    database_queries: defineService('database_queries', 'DB Queries', 'query', 0.00001, 'Database operations'),
    webhooks: defineService('webhooks', 'Webhooks', 'webhook', 0.001, 'Webhook deliveries'),
    integrations: defineService('integrations', 'Integrations', 'integration', 5.00, 'Active integrations'),
    support_tickets: defineService('support_tickets', 'Support Tickets', 'ticket', 2.00, 'Support requests'),
  },
  plans: {
    free: definePlan('free', 'Free', 0, 0, {
      api_calls: 1000,
      active_users: 5,
      storage_gb: 1,
      bandwidth_gb: 5,
      compute_hours: 10,
      database_queries: 10000,
      webhooks: 100,
      integrations: 2,
      support_tickets: 5,
    }),
    startup: definePlan('startup', 'Startup', 49, 0.1, {
      api_calls: 100000,
      active_users: 50,
      storage_gb: 10,
      bandwidth_gb: 50,
      compute_hours: 100,
      database_queries: 100000,
      webhooks: 1000,
      integrations: 10,
      support_tickets: 25,
    }),
    business: definePlan('business', 'Business', 199, 0.25, {
      api_calls: 1000000,
      active_users: 500,
      storage_gb: 100,
      bandwidth_gb: 500,
      compute_hours: 1000,
      database_queries: 1000000,
      webhooks: 10000,
      integrations: 50,
      support_tickets: 100,
    }),
    enterprise: definePlan('enterprise', 'Enterprise', 999, 0.5, {
      api_calls: 10000000,
      active_users: 5000,
      storage_gb: 1000,
      bandwidth_gb: 5000,
      compute_hours: 10000,
      database_queries: 10000000,
      webhooks: 100000,
      integrations: 999,
      support_tickets: 999,
    }),
  },
  defaultPlanId: 'free',
});

// ─────────────────────────────────────────────────────────────
// AI / ML Platform Preset
// ─────────────────────────────────────────────────────────────

export type AIServiceKey =
  | 'llm_tokens'
  | 'image_generations'
  | 'embeddings'
  | 'fine_tuning_hours'
  | 'model_deployments'
  | 'inference_calls'
  | 'vector_storage'
  | 'audio_minutes'
  | 'video_minutes';

export const AI_PLATFORM_PRESET: LUCConfig<AIServiceKey> = createConfig({
  services: {
    llm_tokens: defineService('llm_tokens', 'LLM Tokens', 'K tokens', 0.002, 'Language model tokens'),
    image_generations: defineService('image_generations', 'Image Gen', 'image', 0.02, 'AI image generations'),
    embeddings: defineService('embeddings', 'Embeddings', 'K tokens', 0.0001, 'Vector embeddings'),
    fine_tuning_hours: defineService('fine_tuning_hours', 'Fine-tuning', 'hour', 5.00, 'Model fine-tuning'),
    model_deployments: defineService('model_deployments', 'Deployments', 'model', 10.00, 'Deployed models'),
    inference_calls: defineService('inference_calls', 'Inference', 'call', 0.001, 'Model inference calls'),
    vector_storage: defineService('vector_storage', 'Vector DB', 'GB', 0.10, 'Vector database storage'),
    audio_minutes: defineService('audio_minutes', 'Audio', 'minute', 0.006, 'Audio processing'),
    video_minutes: defineService('video_minutes', 'Video', 'minute', 0.05, 'Video processing'),
  },
  plans: {
    hobbyist: definePlan('hobbyist', 'Hobbyist', 0, 0, {
      llm_tokens: 100,
      image_generations: 50,
      embeddings: 100,
      fine_tuning_hours: 0,
      model_deployments: 0,
      inference_calls: 1000,
      vector_storage: 0.5,
      audio_minutes: 30,
      video_minutes: 5,
    }),
    builder: definePlan('builder', 'Builder', 29, 0.1, {
      llm_tokens: 1000,
      image_generations: 500,
      embeddings: 1000,
      fine_tuning_hours: 5,
      model_deployments: 2,
      inference_calls: 10000,
      vector_storage: 5,
      audio_minutes: 300,
      video_minutes: 60,
    }),
    professional: definePlan('professional', 'Professional', 99, 0.25, {
      llm_tokens: 5000,
      image_generations: 2500,
      embeddings: 5000,
      fine_tuning_hours: 25,
      model_deployments: 10,
      inference_calls: 100000,
      vector_storage: 25,
      audio_minutes: 1500,
      video_minutes: 300,
    }),
    scale: definePlan('scale', 'Scale', 499, 0.5, {
      llm_tokens: 50000,
      image_generations: 25000,
      embeddings: 50000,
      fine_tuning_hours: 250,
      model_deployments: 100,
      inference_calls: 1000000,
      vector_storage: 250,
      audio_minutes: 15000,
      video_minutes: 3000,
    }),
  },
  defaultPlanId: 'hobbyist',
});

// ─────────────────────────────────────────────────────────────
// E-Commerce Preset
// ─────────────────────────────────────────────────────────────

export type ECommerceServiceKey =
  | 'products'
  | 'orders'
  | 'customers'
  | 'inventory_updates'
  | 'shipping_labels'
  | 'payment_transactions'
  | 'email_notifications'
  | 'storage_gb'
  | 'analytics_events';

export const ECOMMERCE_PRESET: LUCConfig<ECommerceServiceKey> = createConfig({
  services: {
    products: defineService('products', 'Products', 'product', 0.05, 'Product catalog items'),
    orders: defineService('orders', 'Orders', 'order', 0.10, 'Processed orders'),
    customers: defineService('customers', 'Customers', 'customer', 0.02, 'Customer records'),
    inventory_updates: defineService('inventory_updates', 'Inventory Sync', 'update', 0.001, 'Inventory updates'),
    shipping_labels: defineService('shipping_labels', 'Shipping Labels', 'label', 0.15, 'Generated shipping labels'),
    payment_transactions: defineService('payment_transactions', 'Transactions', 'transaction', 0.05, 'Payment transactions'),
    email_notifications: defineService('email_notifications', 'Email Notifications', 'email', 0.001, 'Order emails'),
    storage_gb: defineService('storage_gb', 'Storage', 'GB', 0.025, 'Product images and files'),
    analytics_events: defineService('analytics_events', 'Analytics', 'event', 0.0001, 'Analytics tracking'),
  },
  plans: {
    starter: definePlan('starter', 'Starter', 29, 0.1, {
      products: 100,
      orders: 100,
      customers: 500,
      inventory_updates: 1000,
      shipping_labels: 100,
      payment_transactions: 100,
      email_notifications: 500,
      storage_gb: 5,
      analytics_events: 10000,
    }),
    growth: definePlan('growth', 'Growth', 79, 0.2, {
      products: 1000,
      orders: 1000,
      customers: 5000,
      inventory_updates: 10000,
      shipping_labels: 1000,
      payment_transactions: 1000,
      email_notifications: 5000,
      storage_gb: 25,
      analytics_events: 100000,
    }),
    scale: definePlan('scale', 'Scale', 249, 0.3, {
      products: 10000,
      orders: 10000,
      customers: 50000,
      inventory_updates: 100000,
      shipping_labels: 10000,
      payment_transactions: 10000,
      email_notifications: 50000,
      storage_gb: 100,
      analytics_events: 1000000,
    }),
  },
  defaultPlanId: 'starter',
});

// ─────────────────────────────────────────────────────────────
// Healthcare / Telehealth Preset
// ─────────────────────────────────────────────────────────────

export type HealthcareServiceKey =
  | 'patient_records'
  | 'appointments'
  | 'video_consultations'
  | 'prescriptions'
  | 'lab_results'
  | 'secure_messages'
  | 'document_storage_gb'
  | 'insurance_claims'
  | 'compliance_audits';

export const HEALTHCARE_PRESET: LUCConfig<HealthcareServiceKey> = createConfig({
  services: {
    patient_records: defineService('patient_records', 'Patient Records', 'record', 0.50, 'Patient EHR records'),
    appointments: defineService('appointments', 'Appointments', 'appointment', 0.25, 'Scheduled appointments'),
    video_consultations: defineService('video_consultations', 'Video Consults', 'minute', 0.05, 'Telehealth video minutes'),
    prescriptions: defineService('prescriptions', 'Prescriptions', 'prescription', 0.30, 'E-prescriptions'),
    lab_results: defineService('lab_results', 'Lab Results', 'result', 0.20, 'Lab result processing'),
    secure_messages: defineService('secure_messages', 'Secure Messages', 'message', 0.02, 'HIPAA-compliant messages'),
    document_storage_gb: defineService('document_storage_gb', 'Document Storage', 'GB', 0.10, 'Medical document storage'),
    insurance_claims: defineService('insurance_claims', 'Insurance Claims', 'claim', 1.00, 'Insurance claim submissions'),
    compliance_audits: defineService('compliance_audits', 'Compliance Audits', 'audit', 5.00, 'Compliance audit reports'),
  },
  plans: {
    solo_practice: definePlan('solo_practice', 'Solo Practice', 99, 0.1, {
      patient_records: 500,
      appointments: 200,
      video_consultations: 500,
      prescriptions: 200,
      lab_results: 100,
      secure_messages: 1000,
      document_storage_gb: 10,
      insurance_claims: 200,
      compliance_audits: 4,
    }),
    clinic: definePlan('clinic', 'Clinic', 299, 0.2, {
      patient_records: 2500,
      appointments: 1000,
      video_consultations: 2500,
      prescriptions: 1000,
      lab_results: 500,
      secure_messages: 5000,
      document_storage_gb: 50,
      insurance_claims: 1000,
      compliance_audits: 12,
    }),
    hospital: definePlan('hospital', 'Hospital', 999, 0.3, {
      patient_records: 25000,
      appointments: 10000,
      video_consultations: 25000,
      prescriptions: 10000,
      lab_results: 5000,
      secure_messages: 50000,
      document_storage_gb: 500,
      insurance_claims: 10000,
      compliance_audits: 52,
    }),
  },
  defaultPlanId: 'solo_practice',
});

// ─────────────────────────────────────────────────────────────
// Content Creator / Media Preset
// ─────────────────────────────────────────────────────────────

export type ContentCreatorServiceKey =
  | 'video_uploads'
  | 'video_encoding_minutes'
  | 'audio_uploads'
  | 'image_uploads'
  | 'storage_gb'
  | 'bandwidth_gb'
  | 'ai_transcriptions'
  | 'ai_captions'
  | 'social_posts';

export const CONTENT_CREATOR_PRESET: LUCConfig<ContentCreatorServiceKey> = createConfig({
  services: {
    video_uploads: defineService('video_uploads', 'Video Uploads', 'video', 0.50, 'Video file uploads'),
    video_encoding_minutes: defineService('video_encoding_minutes', 'Video Encoding', 'minute', 0.05, 'Video transcoding'),
    audio_uploads: defineService('audio_uploads', 'Audio Uploads', 'audio', 0.10, 'Audio file uploads'),
    image_uploads: defineService('image_uploads', 'Image Uploads', 'image', 0.01, 'Image uploads'),
    storage_gb: defineService('storage_gb', 'Storage', 'GB', 0.025, 'Media storage'),
    bandwidth_gb: defineService('bandwidth_gb', 'Bandwidth', 'GB', 0.05, 'Content delivery'),
    ai_transcriptions: defineService('ai_transcriptions', 'AI Transcription', 'minute', 0.006, 'Speech-to-text'),
    ai_captions: defineService('ai_captions', 'AI Captions', 'minute', 0.01, 'Auto-generated captions'),
    social_posts: defineService('social_posts', 'Social Posts', 'post', 0.05, 'Social media publishing'),
  },
  plans: {
    creator: definePlan('creator', 'Creator', 19, 0.1, {
      video_uploads: 50,
      video_encoding_minutes: 300,
      audio_uploads: 100,
      image_uploads: 500,
      storage_gb: 25,
      bandwidth_gb: 100,
      ai_transcriptions: 120,
      ai_captions: 120,
      social_posts: 100,
    }),
    professional: definePlan('professional', 'Professional', 49, 0.2, {
      video_uploads: 200,
      video_encoding_minutes: 1200,
      audio_uploads: 500,
      image_uploads: 2500,
      storage_gb: 100,
      bandwidth_gb: 500,
      ai_transcriptions: 600,
      ai_captions: 600,
      social_posts: 500,
    }),
    studio: definePlan('studio', 'Studio', 149, 0.3, {
      video_uploads: 1000,
      video_encoding_minutes: 6000,
      audio_uploads: 2500,
      image_uploads: 10000,
      storage_gb: 500,
      bandwidth_gb: 2500,
      ai_transcriptions: 3000,
      ai_captions: 3000,
      social_posts: 2500,
    }),
  },
  defaultPlanId: 'creator',
});

// ─────────────────────────────────────────────────────────────
// Preset Registry
// ─────────────────────────────────────────────────────────────

export const PRESETS = {
  'real-estate': REAL_ESTATE_PRESET,
  'saas': SAAS_PRESET,
  'ai-platform': AI_PLATFORM_PRESET,
  'ecommerce': ECOMMERCE_PRESET,
  'healthcare': HEALTHCARE_PRESET,
  'content-creator': CONTENT_CREATOR_PRESET,
} as const;

export type PresetKey = keyof typeof PRESETS;

/**
 * Get a preset configuration by key
 */
export function getPreset<K extends PresetKey>(key: K): typeof PRESETS[K] {
  return PRESETS[key];
}

/**
 * List all available presets
 */
export function listPresets(): { key: PresetKey; name: string; description: string }[] {
  return [
    { key: 'real-estate', name: 'Real Estate', description: 'Property listings, leads, virtual tours, valuations' },
    { key: 'saas', name: 'SaaS / API', description: 'API calls, users, storage, compute, integrations' },
    { key: 'ai-platform', name: 'AI / ML Platform', description: 'LLM tokens, embeddings, inference, fine-tuning' },
    { key: 'ecommerce', name: 'E-Commerce', description: 'Products, orders, inventory, shipping, payments' },
    { key: 'healthcare', name: 'Healthcare / Telehealth', description: 'Patient records, appointments, prescriptions' },
    { key: 'content-creator', name: 'Content Creator', description: 'Video, audio, storage, transcription, social' },
  ];
}

export default PRESETS;
