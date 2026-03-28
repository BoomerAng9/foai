import express from "express";
import cors from "cors";
import { handleRequest } from "./orchestrator/orchestrator.js";
import { OrchestratorRequest } from "./orchestrator/contracts/orchestrator-contract.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Main entry point for LibreChat custom tool
app.post("/api/grammar/execute", async (req, res) => {
    try {
        const payload = req.body;
        // Construct standard orchestrator request
        const orchestratorReq: OrchestratorRequest = {
            requestId: `req-${Date.now()}`,
            sessionId: payload.sessionId || `sess-${Date.now()}`,
            userInput: payload.prompt || payload.message || "",
            // Provide a default file tree if requested
            context: {
                currentDirectory: "/opt/app",
                openFiles: []
            }
        };

        const response = await handleRequest(orchestratorReq);
        
        // Return a clean response for LibreChat Plugin
        res.status(200).json({
            success: true,
            message: `Execution complete. Agent: ${response.selectedAgent}. Tools used: ${response.selectedTools.join(", ")}`,
            plan: response.plan,
            result: response.resultPayload
        });
    } catch (error: any) {
        console.error("Error in GRAMMAR execution:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/health", (req, res) => res.send("GRAMMAR Orchestrator is highly operational."));

app.listen(PORT, () => {
    console.log(`GRAMMAR Orchestrator API listening on port ${PORT}`);
});
