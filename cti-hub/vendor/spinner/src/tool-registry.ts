/**
 * Universal tool registry for Spinner function-calling
 * =====================================================
 * A single registry where every FOAI surface declares the tools its
 * agents can invoke. Chat routes import `defaultToolRegistry` (or
 * build a scoped one), and the function-calling loop dispatches
 * tool_use events back to handlers here.
 */

import type { InworldTool } from './inworld-client.js';

export interface ToolHandlerContext {
  userId?: string;
  tenantId?: string;
  meta?: Record<string, unknown>;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolHandlerContext,
) => Promise<unknown>;

export interface RegisteredTool {
  schema: InworldTool;
  handler: ToolHandler;
  scopes: string[];
  source: 'cti-hub' | 'perform' | 'smelter-os' | 'deploy' | 'aims' | 'shared';
}

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    const name = tool.schema.function.name;
    if (this.tools.has(name)) {
      throw new Error(
        `[tool-registry] duplicate tool name "${name}". Prefix with source app, e.g. "perform__grade_player".`,
      );
    }
    this.tools.set(name, tool);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  schemas(): InworldTool[] {
    return [...this.tools.values()].map((t) => t.schema);
  }

  filterByScopes(callerScopes: string[]): InworldTool[] {
    const allowed: InworldTool[] = [];
    const callerSet = new Set(callerScopes);
    for (const tool of this.tools.values()) {
      if (tool.scopes.includes('public')) {
        allowed.push(tool.schema);
        continue;
      }
      if (tool.scopes.some((s) => callerSet.has(s))) {
        allowed.push(tool.schema);
      }
    }
    return allowed;
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolHandlerContext,
    callerScopes: string[] = [],
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({ error: `tool "${name}" not found` });
    }
    const isPublic = tool.scopes.includes('public');
    const hasScope = tool.scopes.some((s) => callerScopes.includes(s));
    if (!isPublic && !hasScope) {
      return JSON.stringify({
        error: `tool "${name}" is not authorized for this caller`,
        required_scopes: tool.scopes,
      });
    }
    try {
      const result = await tool.handler(args, ctx);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (e) {
      return JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  size(): number {
    return this.tools.size;
  }
}

export const defaultToolRegistry = new ToolRegistry();
