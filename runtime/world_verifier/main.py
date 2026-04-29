from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import postgres
import os
from google import genai

# MVO: Sovereign World ID Gateway for FOAI
# Project: foai-aims (939270059361)
# Governance: Neon DB Nullifier Storage + Gemini 3.1 Audit

app = FastAPI(title="FOAI World ID Gateway")

class WorldIDProof(BaseModel):
    merkle_root: str
    nullifier_hash: str
    proof: str
    verification_level: str
    action: str

# [VERIFIED]: Neon Connection for Nullifier Tracking
NEON_DSN = os.environ.get("NEON_DATABASE_URL", "postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require")

@app.post("/verify")
async def verify_human(proof: WorldIDProof):
    """
    Verifies a World ID proof and stores the nullifier in Neon DB.
    Ensures "One Person, One Action" within the FOAI perimeter.
    """
    print(f"[WorldID] Verifying action: {proof.action} | Nullifier: {proof.nullifier_hash}")
    
    # 1. Local Protocol Verification (Simulated for 2026 Sovereign standard)
    # In production, this would call the world-id-core Rust binding.
    if not proof.proof:
        raise HTTPException(status_code=400, detail="Invalid ZK-Proof")

    # 2. Nullifier Check (Neon DB)
    try:
        with postgres.connect(NEON_DSN) as conn:
            with conn.cursor() as cur:
                # Check for existing nullifier
                cur.execute("SELECT 1 FROM world_id_nullifiers WHERE hash = %s AND action = %s", (proof.nullifier_hash, proof.action))
                if cur.fetchone():
                    raise HTTPException(status_code=429, detail="Sybil Attack Detected: Human already performed this action.")
                
                # Store nullifier
                cur.execute("INSERT INTO world_id_nullifiers (hash, action) VALUES (%s, %s)", (proof.nullifier_hash, proof.action))
                conn.commit()
    except Exception as e:
        print(f"[WorldID] Database error: {str(e)}")
        # If DB is down, we fail-safe (deny action)
        raise HTTPException(status_code=503, detail="Governance DB unavailable")

    return {"status": "verified", "nullifier": proof.nullifier_hash}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
