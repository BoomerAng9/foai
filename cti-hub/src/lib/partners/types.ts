/**
 * Partners — shared types
 * ========================
 * Row shapes matching the tables in `schema.ts`. These are consumed
 * by the API routes (server) and the Partners UI pages (client).
 */

export interface PartnerRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logo_url: string;
  hero_image_url: string;
  website_url: string;
  status: 'active' | 'paused' | 'archived' | string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PartnerPageRow {
  id: string;
  partner_id: string;
  slug: string;
  title: string;
  body_markdown: string;
  position: number;
  visibility: 'owner' | 'shared' | 'public' | string;
  created_at: string;
  updated_at: string;
}

export interface PartnerDocumentRow {
  id: string;
  partner_id: string;
  name: string;
  kind: 'document' | 'image' | 'video' | 'webhook-payload' | string;
  mime_type: string;
  size_bytes: number;
  storage_url: string;
  smelter_os_path: string;
  tags: string[];
  description: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface PartnerDetailResponse {
  partner: PartnerRow;
  pages: PartnerPageRow[];
  documents: PartnerDocumentRow[];
}
