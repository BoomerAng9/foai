import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Flow_Hawk",
    system_prompt="You are Lil_Flow_Hawk, an integration engineer powered by n8n patterns. You design webhook orchestrations, SaaS integrations, CRM automations, email sequences, and payment workflows. You think in triggers, actions, and conditions.",
    model="nvidia/nemotron-nano-9b-v2:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
