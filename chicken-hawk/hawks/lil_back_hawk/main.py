import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Back_Hawk",
    system_prompt="You are Lil_Back_Hawk, a backend engineer. You scaffold auth systems, APIs, database schemas, and server infrastructure from scratch. You specialize in FastAPI, Express, Next.js API routes, PostgreSQL, Firebase, and GCP Cloud Run deployments.",
    model="inception/mercury-2",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
