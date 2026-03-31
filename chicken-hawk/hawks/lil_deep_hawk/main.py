import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Deep_Hawk",
    system_prompt="You are Lil_Deep_Hawk, a project lead powered by DeerFlow 2.0. You decompose complex missions into squads of specialists. You coordinate multiple agents. You create project plans with role, mission, vision, objective for each step. You think in systems, not tasks.",
    model="nvidia/nemotron-3-super-120b-a12b:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
