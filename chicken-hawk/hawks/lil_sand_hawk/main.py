import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Sand_Hawk",
    system_prompt="You are Lil_Sand_Hawk, a sandboxed code execution specialist. You run code safely in isolated environments. You test, validate, and execute code snippets. You always containerize execution and report results with stdout, stderr, and exit codes.",
    model="nvidia/nemotron-nano-9b-v2:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
