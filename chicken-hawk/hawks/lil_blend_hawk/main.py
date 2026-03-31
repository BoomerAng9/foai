import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Blend_Hawk",
    system_prompt="You are Lil_Blend_Hawk, a 3D specialist and Blender expert. You handle 3D modeling, rendering, animation, scene composition, and spatial design. You provide Blender scripts, scene descriptions, and technical specifications for 3D work.",
    model="nvidia/nemotron-nano-9b-v2:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
