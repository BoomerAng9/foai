/**
 * Paperform Direct API Client
 * ==============================
 * DIRECT Bearer-token auth against https://api.paperform.co/v1
 * (NOT via Pipedream MCP bridge — the aims-tools doc described the
 * MCP pattern but the actual credential in openclaw is a direct token).
 *
 * Credential: Paperform_Access_Token in openclaw
 * Auth: Authorization: Bearer {token}
 *
 * The API is primarily read-only:
 *   - List forms / get form details
 *   - List submissions / get single submission
 *   - Delete submissions (GDPR cleanup)
 *
 * Form creation/editing happens in the Paperform editor UI, not via API.
 */

const BASE_URL = 'https://api.paperform.co/v1';

const getToken = () =>
  process.env.PAPERFORM_ACCESS_TOKEN ||
  process.env.Paperform_Access_Token ||
  '';

export function paperformAvailable(): boolean {
  return getToken().length > 0;
}

/* ── Response types ── */

export interface PaperformForm {
  id: string;
  slug: string;
  custom_slug?: string;
  space_id?: number;
  title: string;
  description?: string;
  url: string;
  cover_image_url?: string;
  live: boolean;
  tags?: string[] | null;
  submission_count: number;
  additional_urls?: {
    edit_url?: string;
    submissions_url?: string;
    duplicate_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaperformSubmission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface ListResponse<T> {
  status?: string;
  results: T;
}

/* ── Low-level fetch wrapper ── */
async function get<T>(path: string): Promise<T | null> {
  const token = getToken();
  if (!token) {
    console.warn('[paperform] no token set');
    return null;
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[paperform] ${path} ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[paperform] ${path} failed:`, err);
    return null;
  }
}

async function del(path: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Public API ── */

export async function listForms(options: { limit?: number } = {}): Promise<PaperformForm[]> {
  const limit = options.limit ?? 100;
  const res = await get<ListResponse<{ forms: PaperformForm[] }>>(`/forms?limit=${limit}`);
  return res?.results?.forms ?? [];
}

export async function getForm(idOrSlug: string): Promise<PaperformForm | null> {
  const res = await get<ListResponse<{ form: PaperformForm }>>(`/forms/${idOrSlug}`);
  return res?.results?.form ?? null;
}

export async function listSubmissions(
  formIdOrSlug: string,
  options: { limit?: number; offset?: number } = {},
): Promise<PaperformSubmission[]> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const res = await get<ListResponse<{ submissions: PaperformSubmission[] }>>(
    `/forms/${formIdOrSlug}/submissions?limit=${limit}&offset=${offset}`,
  );
  return res?.results?.submissions ?? [];
}

export async function getSubmission(
  formIdOrSlug: string,
  submissionId: string,
): Promise<PaperformSubmission | null> {
  const res = await get<ListResponse<{ submission: PaperformSubmission }>>(
    `/forms/${formIdOrSlug}/submissions/${submissionId}`,
  );
  return res?.results?.submission ?? null;
}

export async function deleteSubmission(
  formIdOrSlug: string,
  submissionId: string,
): Promise<boolean> {
  return del(`/forms/${formIdOrSlug}/submissions/${submissionId}`);
}

/* ── Curated form catalog — maps use cases to actual form slugs ── */

export interface FormCatalogEntry {
  useCase: string;
  vertical: 'athletics' | 'workforce' | 'agents' | 'universal';
  slug: string;
  description: string;
}

/**
 * Known live forms mapped to Per|Form + TIE use cases.
 * Update this catalog when new forms are created in Paperform.
 */
export const FORM_CATALOG: FormCatalogEntry[] = [
  {
    useCase: 'client-onboarding',
    vertical: 'universal',
    slug: 'achvmronboarding',
    description: 'ACHIEVEMOR Client Onboarding Form — the canonical new-client intake',
  },
  {
    useCase: 'workforce-learning-onboarding',
    vertical: 'workforce',
    slug: 'achvmr-forms',
    description: 'Strategic Workforce & Learning Solutions Onboarding — for TIE workforce domain',
  },
  {
    useCase: 'recruit-intake',
    vertical: 'athletics',
    slug: 'recruitsmartly',
    description: 'Boost | Bridge by ACHIEVEMOR — student-athlete recruit intake',
  },
  {
    useCase: 'course-enrollment',
    vertical: 'workforce',
    slug: 'c5lewqkh',
    description: 'Course E-commerce — OpenKlassAI course enrollment',
  },
  {
    useCase: 'learning-needs-assessment',
    vertical: 'workforce',
    slug: 'al-jisr-education-ally',
    description: 'Learning Needs Assessment (16 submissions, real data)',
  },
  {
    useCase: 'service-request',
    vertical: 'universal',
    slug: 'driven2achievemor',
    description: 'Service Request Form — general service intake',
  },
  {
    useCase: 'job-application',
    vertical: 'workforce',
    slug: 'iaowm4gj',
    description: 'Job Application Form (6 submissions)',
  },
  {
    useCase: 'internship-application',
    vertical: 'workforce',
    slug: 'wgfs3z5i',
    description: 'Internship Application Form',
  },
  {
    useCase: 'interview-questions',
    vertical: 'workforce',
    slug: '4z8aiycu',
    description: 'Interview Questions Form',
  },
  {
    useCase: 'conference-registration',
    vertical: 'universal',
    slug: 'dps1au3w',
    description: 'Conference Registration Template',
  },
];

export function getFormForUseCase(useCase: string): FormCatalogEntry | undefined {
  return FORM_CATALOG.find(f => f.useCase === useCase);
}

export function getFormsByVertical(vertical: FormCatalogEntry['vertical']): FormCatalogEntry[] {
  return FORM_CATALOG.filter(f => f.vertical === vertical);
}
