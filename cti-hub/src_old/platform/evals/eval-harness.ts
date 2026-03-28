export type EvalCase = { name: string; passed: boolean; details?: string };

export function summarizeEvals(cases: EvalCase[]): { passed: number; total: number } {
  return { passed: cases.filter((c) => c.passed).length, total: cases.length };
}
