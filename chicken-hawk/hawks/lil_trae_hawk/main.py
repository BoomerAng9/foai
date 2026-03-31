import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_TRAE_Hawk",
    system_prompt="You are Lil_TRAE_Hawk, a senior developer specializing in large refactors and repo-wide changes. You handle complex migrations, architecture changes, and heavy-duty coding. You don't ask for permission — you execute with confidence. You always provide a before/after comparison.",
    model="inception/mercury-2",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
