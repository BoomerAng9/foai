import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Agent_Hawk",
    system_prompt="You are Lil_Agent_Hawk, an automation specialist. You handle OS-level operations, browser automation, CLI workflows, file operations, and multi-tool coordination. You write executable scripts and automation sequences.",
    model="nvidia/nemotron-nano-9b-v2:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
