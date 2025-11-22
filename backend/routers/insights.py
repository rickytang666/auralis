"""
Insights router - generates conversation summaries and analytics
"""
from fastapi import APIRouter, HTTPException
from models.schemas import InsightsRequest, InsightsResponse
from services.gemini_service import GeminiService
from services.emotion_analyzer import EmotionAnalyzer

router = APIRouter()

# Initialize services
gemini_service = GeminiService()
emotion_analyzer = EmotionAnalyzer()


@router.post("/insights", response_model=InsightsResponse)
async def generate_insights(request: InsightsRequest):
    """
    Generate conversation summary and emotion analytics
    
    Args:
        request: InsightsRequest containing conversation history and emotions
        
    Returns:
        InsightsResponse with summary and emotion chart data
    """
    try:
        # Generate conversation summary using Gemini
        summary = await gemini_service.generate_summary(
            conversation=request.conversation
        )
        
        # Analyze emotion patterns
        emotion_chart = emotion_analyzer.generate_emotion_chart(
            emotions=request.emotions,
            timestamps=request.timestamps
        )
        
        # Calculate emotion statistics
        emotion_stats = emotion_analyzer.calculate_statistics(
            emotions=request.emotions
        )
        
        return InsightsResponse(
            summary=summary,
            emotion_chart=emotion_chart,
            emotion_stats=emotion_stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

