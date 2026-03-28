"""Voice API endpoints for TTS/STT via ElevenLabs."""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from ii_agent.server.shared import config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice"])


class TTSRequest(BaseModel):
    """Request model for text-to-speech."""
    text: str
    voice_id: Optional[str] = None


class TTSResponse(BaseModel):
    """Response model for TTS (not used, returns audio/mpeg directly)."""
    audio_url: str


class STTResponse(BaseModel):
    """Response model for speech-to-text."""
    text: str


class ScribeTokenResponse(BaseModel):
    """Response model for realtime STT token."""
    token: str


def _has_elevenlabs_key() -> bool:
    """Check if ElevenLabs API key is configured."""
    return bool(
        config.elevenlabs_api_key 
        and len(config.elevenlabs_api_key) > 20
    )


@router.post("/scribe-token", response_model=ScribeTokenResponse)
async def create_scribe_token():
    """Create short-lived realtime STT token for ElevenLabs Scribe.
    
    Returns:
        ScribeTokenResponse: Token for realtime speech-to-text
        
    Raises:
        HTTPException: 503 if voice service not configured, 502 if upstream fails
    """
    if not _has_elevenlabs_key():
        raise HTTPException(
            status_code=503, 
            detail="Voice service is not configured."
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text/get-realtime-token",
                headers={
                    "xi-api-key": config.elevenlabs_api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "model_id": "scribe_v2_realtime",
                    "ttl_secs": 300,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                logger.error(
                    f"ElevenLabs scribe token error: {response.status_code} - {response.text}"
                )
                raise HTTPException(
                    status_code=502, 
                    detail="Could not initialize speech recognition."
                )

            payload = response.json()
            return ScribeTokenResponse(token=payload.get("token", ""))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to create scribe token")
        raise HTTPException(
            status_code=502, 
            detail="Voice recognition is temporarily unavailable."
        )


@router.post("/tts")
async def voice_tts(request: TTSRequest):
    """Generate TTS audio from assistant text via ElevenLabs.
    
    Args:
        request: TTSRequest with text and optional voice_id
        
    Returns:
        Response: audio/mpeg content
        
    Raises:
        HTTPException: 503 if voice service not configured, 400 if text empty, 502 if upstream fails
    """
    if not _has_elevenlabs_key():
        raise HTTPException(
            status_code=503, 
            detail="Voice service is not configured."
        )

    text = (request.text or "").strip()
    if not text:
        raise HTTPException(
            status_code=400, 
            detail="Text is required."
        )

    voice_id = request.voice_id or config.elevenlabs_voice_id

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": config.elevenlabs_api_key,
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": config.elevenlabs_tts_model,
                    "output_format": "mp3_44100_128",
                },
                timeout=30.0,
            )

            if response.status_code != 200:
                logger.error(
                    f"ElevenLabs TTS error: {response.status_code} - {response.text}"
                )
                raise HTTPException(
                    status_code=502, 
                    detail="Could not generate voice output."
                )

            return Response(content=response.content, media_type="audio/mpeg")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to generate TTS")
        raise HTTPException(
            status_code=502, 
            detail="Voice output is temporarily unavailable."
        )


@router.post("/stt", response_model=STTResponse)
async def voice_stt(audio: UploadFile = File(...)):
    """Transcribe uploaded microphone audio through ElevenLabs STT.
    
    Args:
        audio: Uploaded audio file (webm, mp3, etc.)
        
    Returns:
        STTResponse: Transcribed text
        
    Raises:
        HTTPException: 503 if voice service not configured, 502 if upstream fails
    """
    if not _has_elevenlabs_key():
        raise HTTPException(
            status_code=503, 
            detail="Voice service is not configured."
        )

    try:
        audio_bytes = await audio.read()
        files = {
            "file": (
                audio.filename or "recording.webm", 
                audio_bytes, 
                audio.content_type or "audio/webm"
            )
        }
        data = {"model_id": "scribe_v1"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={
                    "xi-api-key": config.elevenlabs_api_key,
                },
                data=data,
                files=files,
                timeout=45.0,
            )

            if response.status_code != 200:
                logger.error(
                    f"ElevenLabs STT error: {response.status_code} - {response.text}"
                )
                raise HTTPException(
                    status_code=502, 
                    detail="Could not transcribe voice input."
                )

            payload = response.json()
            transcript = (payload.get("text") or "").strip()
            return STTResponse(text=transcript)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to transcribe audio")
        raise HTTPException(
            status_code=502, 
            detail="Voice transcription is temporarily unavailable."
        )
