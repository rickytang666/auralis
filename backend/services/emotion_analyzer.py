"""
Emotion analyzer service - detects emotion mismatches and patterns
"""
from typing import Dict, List, Optional
from datetime import datetime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


class EmotionAnalyzer:
    """Service for analyzing emotions and detecting mismatches"""
    
    def __init__(self):
        """Initialize emotion analyzer"""
        self.emotion_categories = [
            "neutral", "happy", "sad", "angry",
            "fearful", "disgusted", "surprised"
        ]
        # Initialize sentiment analyzer
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
    
    def analyze_mismatch(
        self,
        message: str,
        detected_emotion: str
    ) -> Dict[str, any]:
        """
        Analyze potential mismatch between message content and facial emotion

        Args:
            message: User's text message
            detected_emotion: Emotion detected from face-api.js

        Returns:
            Dict containing mismatch analysis and context
        """
        # Analyze text sentiment using VADER
        sentiment_scores = self.sentiment_analyzer.polarity_scores(message)

        # Determine text sentiment based on compound score
        compound = sentiment_scores['compound']
        if compound >= 0.05:
            text_sentiment = "positive"
        elif compound <= -0.05:
            text_sentiment = "negative"
        else:
            text_sentiment = "neutral"

        # Map facial emotion to expected sentiment
        emotion_to_sentiment = {
            "happy": "positive",
            "surprised": "positive",  # Can be positive in medical context
            "neutral": "neutral",
            "sad": "negative",
            "angry": "negative",
            "fearful": "negative",
            "disgusted": "negative"
        }

        expected_sentiment = emotion_to_sentiment.get(detected_emotion.lower(), "neutral")

        # Detect mismatch (e.g., positive words + negative face, or vice versa)
        has_mismatch = False
        mismatch_type = None

        if text_sentiment == "positive" and expected_sentiment == "negative":
            has_mismatch = True
            mismatch_type = "positive_words_negative_face"
        elif text_sentiment == "negative" and expected_sentiment == "positive":
            has_mismatch = True
            mismatch_type = "negative_words_positive_face"

        # Calculate confidence based on sentiment strength
        confidence = abs(compound)

        return {
            "mismatch_detected": has_mismatch,
            "text_sentiment": text_sentiment,
            "detected_emotion": detected_emotion,
            "expected_sentiment": expected_sentiment,
            "mismatch_type": mismatch_type,
            "confidence": confidence,
            "sentiment_scores": sentiment_scores
        }
    
    def generate_emotion_chart(
        self,
        emotions: List[str],
        timestamps: List[str]
    ) -> List[Dict]:
        """
        Generate emotion chart data for visualization
        
        Args:
            emotions: List of detected emotions
            timestamps: Corresponding timestamps
            
        Returns:
            Chart data in format suitable for frontend visualization
        """
        # TODO: Implement chart data generation
        # - Aggregate emotions over time
        # - Calculate percentages
        # - Format for chart library (e.g., Chart.js)
        
        return [
            {
                "timestamp": timestamp,
                "emotion": emotion
            }
            for timestamp, emotion in zip(timestamps, emotions)
        ]
    
    def calculate_statistics(self, emotions: List[str]) -> Dict[str, any]:
        """
        Calculate emotion statistics
        
        Args:
            emotions: List of detected emotions
            
        Returns:
            Dict containing emotion statistics
        """
        # TODO: Implement statistics calculation
        # - Count emotion frequencies
        # - Calculate percentages
        # - Identify dominant emotions
        # - Detect emotion transitions
        
        emotion_counts = {}
        for emotion in emotions:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        total = len(emotions) if emotions else 1
        
        return {
            "total_samples": total,
            "emotion_counts": emotion_counts,
            "emotion_percentages": {
                emotion: (count / total) * 100
                for emotion, count in emotion_counts.items()
            },
            "dominant_emotion": max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral"
        }
    
    def detect_emotion_transition(
        self,
        previous_emotion: str,
        current_emotion: str
    ) -> Dict[str, any]:
        """
        Detect significant emotion transitions
        
        Args:
            previous_emotion: Previous emotion state
            current_emotion: Current emotion state
            
        Returns:
            Transition analysis
        """
        # TODO: Implement transition detection
        # - Identify significant emotional shifts
        # - Flag concerning transitions (e.g., happy -> sad)
        
        return {
            "has_transition": previous_emotion != current_emotion,
            "from": previous_emotion,
            "to": current_emotion,
            "significance": "low"
        }

