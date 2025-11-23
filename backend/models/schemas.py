"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


# ============= Chat/Conversation Schemas =============

class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description="User's message text")
    emotion: str = Field(..., description="Detected emotion from face-api.js")
    age: Optional[int] = Field(None, description="Detected age from face-api.js")
    age_category: Optional[str] = Field(None, description="Age category (e.g., 'Young Adult', 'Senior')")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "I've been feeling tired lately",
                "emotion": "sad",
                "age": 32,
                "age_category": "Young Adult"
            }
        }


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description="AI doctor's response")
    followup_needed: bool = Field(
        default=False,
        description="Whether follow-up question is recommended"
    )
    should_end_consultation: bool = Field(
        default=False,
        description="Whether AI suggests ending the consultation"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "response": "I understand. How long have you been experiencing this fatigue?",
                "followup_needed": True,
                "should_end_consultation": False
            }
        }


# ============= TTS Schemas =============

class TTSRequest(BaseModel):
    """Request model for text-to-speech endpoint"""
    text: str = Field(..., description="Text to convert to speech")
    voice_id: Optional[str] = Field(
        None,
        description="ElevenLabs voice ID (uses default if not provided)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "I understand. Can you tell me more about that?",
                "voice_id": None
            }
        }


class TTSResponse(BaseModel):
    """Response model for text-to-speech endpoint"""
    audio_url: Optional[str] = Field(
        None,
        description="URL to audio file (if stored)"
    )
    audio_base64: Optional[str] = Field(
        None,
        description="Base64 encoded audio data"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "audio_url": "https://example.com/audio.mp3",
                "audio_base64": None
            }
        }


# ============= Insights Schemas =============

class ConversationMessage(BaseModel):
    """Single conversation message"""
    role: str = Field(..., description="Speaker role (user or assistant)")
    content: str = Field(..., description="Message content")
    timestamp: str = Field(..., description="ISO format timestamp")
    emotion: Optional[str] = Field(None, description="Detected emotion")


class InsightsRequest(BaseModel):
    """Request model for insights endpoint"""
    conversation: List[ConversationMessage] = Field(
        ...,
        description="Full conversation history"
    )
    emotions: List[str] = Field(
        ...,
        description="List of detected emotions throughout conversation"
    )
    timestamps: List[str] = Field(
        ...,
        description="Timestamps for emotion detections"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "conversation": [
                    {
                        "role": "user",
                        "content": "I've been feeling tired",
                        "timestamp": "2025-11-22T10:00:00Z",
                        "emotion": "sad"
                    }
                ],
                "emotions": ["sad", "neutral", "happy"],
                "timestamps": ["2025-11-22T10:00:00Z", "2025-11-22T10:01:00Z", "2025-11-22T10:02:00Z"]
            }
        }


class EmotionChartData(BaseModel):
    """Emotion data point for charting"""
    timestamp: str = Field(..., description="ISO format timestamp")
    emotion: str = Field(..., description="Detected emotion")


class EmotionStats(BaseModel):
    """Emotion statistics"""
    total_samples: int = Field(..., description="Total emotion samples")
    emotion_counts: Dict[str, int] = Field(..., description="Count per emotion")
    emotion_percentages: Dict[str, float] = Field(..., description="Percentage per emotion")
    dominant_emotion: str = Field(..., description="Most frequent emotion")


class SummaryData(BaseModel):
    """Structured summary data"""
    overview: str = Field(..., description="Brief overview of consultation")
    recommendations: List[str] = Field(..., description="List of recommendations")


class InsightsResponse(BaseModel):
    """Response model for insights endpoint"""
    summary: SummaryData = Field(..., description="Structured conversation summary")
    emotion_chart: List[EmotionChartData] = Field(
        ...,
        description="Emotion data for visualization"
    )
    emotion_stats: EmotionStats = Field(
        ...,
        description="Emotion statistics"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": {
                    "overview": "Patient discussed fatigue and sleep issues...",
                    "recommendations": [
                        "Get 7-8 hours of sleep per night",
                        "Reduce caffeine intake after 2pm",
                        "Follow up in 2 weeks"
                    ]
                },
                "emotion_chart": [
                    {"timestamp": "2025-11-22T10:00:00Z", "emotion": "sad"}
                ],
                "emotion_stats": {
                    "total_samples": 10,
                    "emotion_counts": {"sad": 5, "neutral": 3, "happy": 2},
                    "emotion_percentages": {"sad": 50.0, "neutral": 30.0, "happy": 20.0},
                    "dominant_emotion": "sad"
                }
            }
        }

