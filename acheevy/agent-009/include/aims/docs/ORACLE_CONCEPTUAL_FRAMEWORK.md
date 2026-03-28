# ORACLE Conceptual Framework
*(Implemented structurally in UEF Gateway)*

The ORACLE is not a single tool, but a sequence of **7 Verification Gates** that every artifact must pass before delivery.

## The 7 Gates

1.  **Technical Gate**: Syntax check, linting, compile verification. (Auto)
2.  **Security Gate**: OWASP scan, credential leak check. (Auto)
3.  **Strategy Gate**: Does this align with the original ACP Intent? (Semantic Check via VL-JEPA).
4.  **Judge Gate**: Value assessment. Is the output "worth" the token cost? (LUC Heuristic).
5.  **Perception Gate**: Hallucination check. (VL-JEPA Embedding Drift).
6.  **Effort Gate**: Did the agent work "hard enough"? (Token count / step count audit).
7.  **Documentation Gate**: Is the `README` and code commenting sufficient? (LLM Check).

## Implementation in A.I.M.S. Usage
In the `uef-gateway`, `src/oracle/index.ts` (stubbed) receives the `AgentResult` and runs these checks sequentially. Failures result in an ACP `RETRY` directive to the agent.
