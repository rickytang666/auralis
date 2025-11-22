"""
Audio router - handles ElevenLabs STT and TTS
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from models.schemas import TTSRequest, TTSResponse
from services.elevenlabs_service import ElevenLabsService
from pydantic import BaseModel

router = APIRouter()

# Initialize service
tts_service = ElevenLabsService()


class STTResponse(BaseModel):
    """Response model for speech-to-text"""
    text: str


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert speech to text using ElevenLabs
    
    Args:
        audio: Audio file upload
        
    Returns:
        STTResponse with transcribed text
    """
    try:
        audio_data = await audio.read()
        text = await tts_service.speech_to_text(audio_data)
        
        return STTResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

