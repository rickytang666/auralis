"""
Text-to-Speech router - handles ElevenLabs TTS
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import TTSRequest, TTSResponse
from services.elevenlabs_service import ElevenLabsService

router = APIRouter()

# Initialize service
tts_service = ElevenLabsService()


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using ElevenLabs
    
    Args:
        request: TTSRequest containing text to convert
        
    Returns:
        TTSResponse with audio URL or base64 encoded audio
    """
    try:
        audio_result = await tts_service.generate_speech(
            text=request.text,
            voice_id=request.voice_id
        )
        
        return TTSResponse(
            audio_url=audio_result.get("audio_url"),
            audio_base64=audio_result.get("audio_base64")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts/stream")
async def text_to_speech_stream(request: TTSRequest):
    """
    Stream audio response directly
    
    Args:
        request: TTSRequest containing text to convert
        
    Returns:
        StreamingResponse with audio data
    """
    try:
        audio_stream = await tts_service.generate_speech_stream(
            text=request.text,
            voice_id=request.voice_id
        )
        
        return StreamingResponse(
            audio_stream,
            media_type="audio/mpeg"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

