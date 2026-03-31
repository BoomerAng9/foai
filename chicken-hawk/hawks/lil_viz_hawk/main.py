import os
import sys
import uvicorn

# Add parent dir to path for base_hawk import

from base_hawk import create_hawk_app

app = create_hawk_app(
    hawk_name="Lil_Viz_Hawk",
    system_prompt="You are Lil_Viz_Hawk, a dashboard engineer. You create monitoring dashboards, data visualizations, real-time metrics displays, and reporting interfaces. You work with Chart.js, D3, Recharts, and Tailwind CSS for beautiful, functional dashboards.",
    model="nvidia/nemotron-nano-9b-v2:free",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
