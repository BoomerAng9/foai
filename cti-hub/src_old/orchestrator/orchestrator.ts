import { builderAgent } from "../agents/builder/builder-agent.js";
import { supportAgent } from "../agents/support/support-agent.js";
import { MemoryStore } from "../platform/memory/memory-store.js";
import { ToolRegistry } from "../tools/registry/tool-registry.js";
import { ToolRunner } from "../tools/runner/tool-runner.js";
import { echoTool } from "../tools/plugins/echo-tool.js";
import { OrchestratorRequestSchema, type OrchestratorRequest, type OrchestratorResponse } from "./contracts/orchestrator-contract.js";
import { selectAgent } from "./router/router.js";
import { TechnicalLanguageIndex, LookListenLearn, FirstDraftHarness } from "./frameworks.js";

const memory = new MemoryStore();
const registry = new ToolRegistry();
registry.register(echoTool);
const runner = new ToolRunner(registry);

// Framework singletons
const tli = new TechnicalLanguageIndex();
const lll = new LookListenLearn();
const fdh = new FirstDraftHarness();

export async function handleRequest(input: OrchestratorRequest): Promise<OrchestratorResponse> {
  const request = OrchestratorRequestSchema.parse(input);
  
  // 1. Technical Language Index to parse intent
  const technicalSkills = tli.analyze(request.userInput);

  // 2. Look Listen Learn observation
  lll.observe(request);

  // 3. Routing
  const selectedAgent = selectAgent(request, [builderAgent, supportAgent]);
  
  // 4. First Draft Harness
  const draft = fdh.generateDraft(technicalSkills, {});
  const plan = ["analyze request via TLI", "create FDH draft", "invoke target tool"];

  // 5. Execution (Currently uses echo tool)
  const toolResult = await runner.run(selectedAgent, "tool.echo", { message: `Executing skills: ${technicalSkills.join(", ")}. Draft: ${draft}` });

  memory.add({
    sessionId: request.sessionId,
    type: "session_note",
    content: `Handled by ${selectedAgent.id} using skills ${technicalSkills.join(", ")}`
  });

  const response: OrchestratorResponse = {
    requestId: request.requestId,
    sessionId: request.sessionId,
    selectedAgent: selectedAgent.id,
    selectedTools: ["tool.echo"],
    plan,
    resultPayload: { toolResult },
    policyDecisions: [`Skills matched: ${technicalSkills.join(", ")}`, "tool.echo allowed by whitelist"],
    auditMetadata: {
      timestamp: new Date().toISOString(),
      riskProfile: selectedAgent.riskProfile
    }
  };

  // 6. Look Listen Learn adaptation
  lll.adapt(response);

  return response;
}

