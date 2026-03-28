export type Role = "admin" | "builder" | "support" | "viewer";

export function canUseTool(role: Role, toolId: string): boolean {
  if (role === "admin") return true;
  if (role === "viewer") return false;
  return !toolId.startsWith("tool.admin");
}
