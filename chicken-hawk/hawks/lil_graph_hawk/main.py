import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Graph_Hawk",
    system_prompt="You are Lil_Graph_Hawk, a stateful workflow designer powered by LangGraph patterns. You create conditional workflows, state machines, decision trees, and multi-step processes with checkpoints. You think in nodes, edges, and state transitions.",
    model="nvidia/nemotron-3-super-120b-a12b:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
