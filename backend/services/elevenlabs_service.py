"""
ElevenLabs service - handles speech-to-text and text-to-speech conversion
"""
import os
import base64
from typing import Dict, Optional, AsyncIterator, List
from io import BytesIO
from elevenlabs.client import ElevenLabs


class ElevenLabsService:
    """Service for ElevenLabs speech-to-text and text-to-speech API"""
    
    def __init__(self):
        """Initialize ElevenLabs service with API key"""
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not found in environment variables")
        
        # Initialize ElevenLabs client
        self.client = ElevenLabs(api_key=self.api_key)
        
        # Default voice ID (Rachel - natural, warm voice)
        self.default_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        
        # Voice settings for natural doctor voice
        self.voice_settings = {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    
    async def generate_speech(
        self,
        text: str,
        voice_id: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Generate speech from text using ElevenLabs TTS
        
        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID (uses default if not provided)
            
        Returns:
            Dict containing audio_base64 encoded audio data
        """
        try:
            voice = self._get_voice_id(voice_id)
            
            # Generate audio using ElevenLabs text_to_speech
            audio_generator = self.client.text_to_speech.convert(
                voice_id=voice,
                text=text,
                model_id="eleven_monolingual_v1"
            )
            
            # Convert generator to bytes
            audio_bytes = b"".join(audio_generator)
            
            # Encode to base64 for easy transport
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            return {
                "audio_url": None,
                "audio_base64": audio_base64
            }
        except Exception as e:
            raise Exception(f"TTS generation failed: {str(e)}")
    
    async def generate_speech_stream(
        self,
        text: str,
        voice_id: Optional[str] = None
    ) -> AsyncIterator[bytes]:
        """
        Stream audio response for real-time playback
        
        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID
            
        Yields:
            Audio data chunks
        """
        try:
            voice = self._get_voice_id(voice_id)
            
            # Generate streaming audio
            audio_stream = self.client.text_to_speech.convert(
                voice_id=voice,
                text=text,
                model_id="eleven_monolingual_v1"
            )
            
            # Yield chunks as they arrive
            for chunk in audio_stream:
                yield chunk
                
        except Exception as e:
            raise Exception(f"TTS streaming failed: {str(e)}")
    
    def _get_voice_id(self, voice_id: Optional[str]) -> str:
        """Get voice ID with fallback to default"""
        return voice_id or self.default_voice_id
    
    async def speech_to_text(
        self,
        audio_data: bytes
    ) -> str:
        """
        Convert speech to text using ElevenLabs STT
        
        Args:
            audio_data: Audio file bytes
            
        Returns:
            Transcribed text
        """
        try:
            # Convert bytes to BytesIO for file-like object
            audio_file = BytesIO(audio_data)
            audio_file.name = "audio.webm"  # Add name attribute for the API
            
            # Use ElevenLabs speech-to-text API
            transcription = self.client.speech_to_text.convert(
                file=audio_file,
                model_id="scribe_v1",  # Scribe model for transcription
            )
            
            # Extract text from transcription response
            # The response contains the transcribed text
            if hasattr(transcription, 'text'):
                return transcription.text
            elif isinstance(transcription, dict) and 'text' in transcription:
                return transcription['text']
            else:
                # If response format is different, convert to string
                return str(transcription)
                
        except Exception as e:
            raise Exception(f"STT conversion failed: {str(e)}")
    
    async def list_voices(self) -> List[Dict]:
        """
        List available voices from ElevenLabs
        
        Returns:
            List of available voices with their details
        """
        try:
            voices_response = self.client.voices.get_all()
            
            # Convert voice objects to dictionaries
            voices_list = []
            if hasattr(voices_response, 'voices'):
                for voice in voices_response.voices:
                    voices_list.append({
                        "voice_id": voice.voice_id,
                        "name": voice.name,
                        "category": voice.category if hasattr(voice, 'category') else None,
                        "description": voice.description if hasattr(voice, 'description') else None,
                    })
            
            return voices_list
        except Exception as e:
            raise Exception(f"Failed to list voices: {str(e)}")

