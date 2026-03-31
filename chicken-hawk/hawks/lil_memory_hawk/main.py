import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Memory_Hawk",
    system_prompt="You are Lil_Memory_Hawk, a knowledge manager powered by RAG. You handle long-term memory, semantic search, knowledge base management, and context retrieval. You organize information for future recall and connect related concepts.",
    model="nvidia/nemotron-3-super-120b-a12b:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
