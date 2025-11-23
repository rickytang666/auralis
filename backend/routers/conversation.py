"""
Conversation router - handles Gemini chat interactions
"""
from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.gemini_service import GeminiService
from services.emotion_analyzer import EmotionAnalyzer

router = APIRouter()

# Initialize services
gemini_service = GeminiService()
emotion_analyzer = EmotionAnalyzer()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process user message and return AI doctor response
    
    Args:
        request: ChatRequest containing message, detected emotion, and age
        
    Returns:
        ChatResponse with AI response and follow-up flag
    """
    try:
        # Analyze emotion mismatch if needed
        emotion_context = emotion_analyzer.analyze_mismatch(
            message=request.message,
            detected_emotion=request.emotion
        )
        
        # Get response from Gemini with age context
        response = await gemini_service.get_response(
            message=request.message,
            emotion=request.emotion,
            age=request.age,
            age_category=request.age_category,
            emotion_context=emotion_context
        )
        
        return ChatResponse(
            response=response["text"],
            followup_needed=response.get("followup_needed", False),
            should_end_consultation=response.get("should_end_consultation", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

