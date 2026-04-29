/**
 * Port Authority tool set
 * ========================
 * Curated FOAI API endpoints exposed as Inworld-compatible tools.
 * All agent-facing tools route through Port Authority per the
 * chain-of-command rules.
 */

import type { RegisteredTool, ToolRegistry } from '../tool-registry.js';

const PORT_AUTHORITY_URL =
  process.env.PORT_AUTHORITY_URL ||
  process.env.NEXT_PUBLIC_PORT_AUTHORITY_URL ||
  'http://localhost:3000/api';

async function portAuthorityFetch(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const url = path.startsWith('http')
    ? path
    : `${PORT_AUTHORITY_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    return { error: `port-authority ${res.status}`, body: text.slice(0, 500) };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text.slice(0, 500) };
  }
}

const LIST_PLANS: RegisteredTool = {
  source: 'shared',
  scopes: ['public'],
  schema: {
    type: 'function',
    function: {
      name: 'list_plans',
      description:
        'List available subscription plans for a FOAI product. Reads from Neon plans cache (no Taskade workflow triggered).',
      parameters: {
        type: 'object',
        properties: {
          product: {
            type: 'string',
            description:
              'Product slug: "sqwaadrun" | "deploy" | "perform" | "cti-hub" | "aims". Omit for all.',
          },
        },
      },
    },
  },
  handler: async (args) => {
    const product = typeof args.product === 'string' ? args.product : '';
    const q = product ? `?product=${encodeURIComponent(product)}` : '';
    return portAuthorityFetch(`/plans${q}`);
  },
};

const GET_CART: RegisteredTool = {
  source: 'shared',
  scopes: ['authenticated'],
  schema: {
    type: 'function',
    function: {
      name: 'get_cart',
      description:
        'Return current cart contents. Reads from Neon cart table — no workflow invoked.',
      parameters: { type: 'object', properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    if (!ctx.userId) return { error: 'unauthenticated' };
    return portAuthorityFetch(`/cart?user_id=${encodeURIComponent(ctx.userId)}`);
  },
};

const GET_BILLING_STATUS: RegisteredTool = {
  source: 'shared',
  scopes: ['authenticated'],
  schema: {
    type: 'function',
    function: {
      name: 'get_billing_status',
      description:
        "Return the caller's current plan, billing status, and next-invoice-date. Mirrored from Stripe via Stepper → Neon; no workflow invoked.",
      parameters: { type: 'object', properties: {} },
    },
  },
  handler: async (_args, ctx) => {
    if (!ctx.userId) return { error: 'unauthenticated' };
    return portAuthorityFetch(
      `/billing/status?user_id=${encodeURIComponent(ctx.userId)}`,
    );
  },
};

const START_CHECKOUT: RegisteredTool = {
  source: 'shared',
  scopes: ['authenticated'],
  schema: {
    type: 'function',
    function: {
      name: 'start_checkout',
      description:
        'Begin a Stepper (Taskade) checkout workflow. Returns checkout_url. INVOKES a workflow — only call on explicit purchase intent.',
      parameters: {
        type: 'object',
        properties: {
          plan_id: { type: 'string' },
          product: { type: 'string' },
        },
        required: ['plan_id', 'product'],
      },
    },
  },
  handler: async (args, ctx) => {
    if (!ctx.userId) return { error: 'unauthenticated' };
    return portAuthorityFetch(`/stepper/checkout`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: ctx.userId,
        plan_id: args.plan_id,
        product: args.product,
      }),
    });
  },
};

const SEARCH_GRAMMAR: RegisteredTool = {
  source: 'shared',
  scopes: ['public'],
  schema: {
    type: 'function',
    function: {
      name: 'search_grammar',
      description:
        'Search the Grammar / NTNTN knowledgebase. ACHEEVY queries this BEFORE web search.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          top_k: { type: 'number', description: 'Default 5.' },
        },
        required: ['query'],
      },
    },
  },
  handler: async (args) =>
    portAuthorityFetch(`/grammar/search`, {
      method: 'POST',
      body: JSON.stringify({ query: args.query, top_k: args.top_k ?? 5 }),
    }),
};

const DISPATCH_SQWAADRUN_MISSION: RegisteredTool = {
  source: 'shared',
  scopes: ['authenticated'],
  schema: {
    type: 'function',
    function: {
      name: 'dispatch_sqwaadrun_mission',
      description:
        'Hand off a scrape intent to the Sqwaadrun 17-Hawk fleet via Port Authority. Returns mission_id.',
      parameters: {
        type: 'object',
        properties: {
          intent: { type: 'string' },
          targets: { type: 'array', items: { type: 'string' } },
        },
        required: ['intent', 'targets'],
      },
    },
  },
  handler: async (args, ctx) =>
    portAuthorityFetch(`/sqwaadrun/mission`, {
      method: 'POST',
      body: JSON.stringify({
        intent: args.intent,
        targets: args.targets,
        user_id: ctx.userId,
      }),
    }),
};

const LIST_HAWKS: RegisteredTool = {
  source: 'shared',
  scopes: ['public'],
  schema: {
    type: 'function',
    function: {
      name: 'list_hawks',
      description:
        'List the Lil_Hawk fleet with status (active/standby) and task counts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  handler: async () => portAuthorityFetch(`/sqwaadrun/roster`),
};

export function registerPortAuthorityTools(registry: ToolRegistry): void {
  registry.register(LIST_PLANS);
  registry.register(GET_CART);
  registry.register(GET_BILLING_STATUS);
  registry.register(START_CHECKOUT);
  registry.register(SEARCH_GRAMMAR);
  registry.register(DISPATCH_SQWAADRUN_MISSION);
  registry.register(LIST_HAWKS);
}
