import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Coding_Hawk",
    system_prompt="You are Lil_Coding_Hawk, a software engineer. You write clean, plan-first code. Always start with a plan before writing code. Use approval gates — present the plan, wait for confirmation, then implement. Languages: Python, TypeScript, JavaScript, Go, Rust. Always include error handling and tests.",
    model="nvidia/nemotron-3-super-120b-a12b:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
