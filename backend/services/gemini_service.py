"""
Gemini AI service - handles Google Gemini API interactions
"""
import os
from typing import Dict, List, Optional
import google.generativeai as genai


class GeminiService:
    """Service for interacting with Google Gemini API"""

    def __init__(self):
        """Initialize Gemini service with API key"""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        # Configure Gemini API
        genai.configure(api_key=self.api_key)

        # Initialize the model with faster configuration
        # Using gemini-2.5-flash for lower latency (vs gemini-2.5-pro)
        self.model_name = "gemini-2.5-flash"
        
        # Configure for speed and natural responses
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 800,  # Allow longer responses for complete thoughts
            "candidate_count": 1,
        }
        
        # Safety settings - allow medical content
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"  # Allow medical discussions
            },
        ]
        
        self.model = genai.GenerativeModel(
            self.model_name,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # Separate model for summaries with higher token limit
        summary_config = {
            "temperature": 0.5,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 1000,  # Higher limit for detailed summaries
            "candidate_count": 1,
        }
        self.summary_model = genai.GenerativeModel(
            self.model_name,
            generation_config=summary_config,
            safety_settings=safety_settings
        )
        
        self.conversation_history = []
        self.chat_session = None  # Will be initialized on first use
        self.system_message = "You are a friendly virtual doctor. Keep responses very brief (1-2 sentences). Ask follow-up questions about symptoms."

    async def get_response(
        self,
        message: str,
        emotion: str,
        emotion_context: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Get AI response based on user message and detected emotion

        Args:
            message: User's message text
            emotion: Detected emotion (e.g., "happy", "sad", "anxious")
            emotion_context: Additional emotion analysis context

        Returns:
            Dict containing response text and metadata
        """
        try:
            # Initialize chat session if not exists
            if self.chat_session is None:
                # Start chat with system message as first exchange
                self.chat_session = self.model.start_chat(history=[
                    {"role": "user", "parts": [self.system_message]},
                    {"role": "model", "parts": ["I understand. I'll keep my responses brief and ask relevant questions about symptoms."]}
                ])

            # Send message to chat
            response = self.chat_session.send_message(message)

            # Extract response text safely
            try:
                response_text = response.text.strip()
                print(f"✓ Got response from Gemini: {response_text[:80]}...")
            except (IndexError, AttributeError):
                # Response was blocked or empty
                print(f"Response blocked. Candidates: {response.candidates}")
                fallback_responses = [
                    "I understand. Can you tell me more about that?",
                    "I see. What else have you been experiencing?",
                    "Tell me more about how you've been feeling.",
                    "I see. Could you tell me more about your symptoms?"
                ]
                import random
                response_text = random.choice(fallback_responses)

            # Add to our history for tracking
            self._add_to_history("user", message)
            self._add_to_history("assistant", response_text)

            # Determine if follow-up is needed
            followup_needed = "?" in response_text or len(self.conversation_history) < 6

            return {
                "text": response_text,
                "followup_needed": followup_needed
            }

        except Exception as e:
            # Log error and return fallback response with more details
            import traceback
            print(f"Error calling Gemini API: {str(e)}")
            print(traceback.format_exc())
            
            # Return a contextual fallback based on conversation history
            if len(self.conversation_history) > 0:
                fallback = "I see. Could you tell me more about your symptoms?"
            else:
                fallback = "Hello! I'm here to help. What brings you in today?"
            
            return {
                "text": fallback,
                "followup_needed": True,
                "error": str(e)
            }

    async def generate_summary(self, conversation: List[Dict]) -> Dict[str, any]:
        """
        Generate structured conversation summary using Gemini

        Args:
            conversation: List of conversation messages

        Returns:
            Dict with 'overview' and 'recommendations' keys
        """
        try:
            # Format conversation for summarization
            conversation_text = []
            for msg in conversation:
                # Handle both dict and object formats
                role = "Patient" if (msg.get("role") if isinstance(msg, dict) else msg.role) == "user" else "Doctor"
                content = msg.get("content") if isinstance(msg, dict) else msg.content
                conversation_text.append(f"{role}: {content}")

            formatted_conversation = "\n".join(conversation_text)

            # Build summarization prompt for overview
            overview_prompt = f"""You are a medical professional reviewing a patient consultation transcript.
Provide a brief summary (2-3 sentences) covering:
- Chief complaints and main health concerns
- Key symptoms described
- Overall assessment

Consultation Transcript:
{formatted_conversation}

Summary:"""

            # Build prompt for recommendations
            recommendations_prompt = f"""Based on this consultation transcript, provide 3-4 specific recommendations or next steps for the patient.
Format as a numbered list. Be practical and actionable.

Consultation Transcript:
{formatted_conversation}

Recommendations:"""

            # Generate both summaries
            overview_response = self.summary_model.generate_content(overview_prompt)
            recommendations_response = self.summary_model.generate_content(recommendations_prompt)
            
            # Extract text safely
            try:
                overview = overview_response.text.strip()
            except (IndexError, AttributeError):
                print(f"Overview generation blocked. Candidates: {overview_response.candidates}")
                overview = "The consultation covered various health concerns and symptoms."
            
            try:
                recommendations_text = recommendations_response.text.strip()
                # Parse recommendations into list
                recommendations = []
                for line in recommendations_text.split('\n'):
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                        # Remove numbering/bullets
                        clean_line = line.lstrip('0123456789.-•) ').strip()
                        if clean_line:
                            recommendations.append(clean_line)
            except (IndexError, AttributeError):
                print(f"Recommendations generation blocked. Candidates: {recommendations_response.candidates}")
                recommendations = [
                    "Follow up with a healthcare provider if symptoms persist",
                    "Monitor your symptoms and keep a health journal",
                    "Maintain a healthy lifestyle with proper rest and nutrition"
                ]
            
            return {
                "overview": overview,
                "recommendations": recommendations
            }

        except Exception as e:
            import traceback
            print(f"Error generating summary: {str(e)}")
            print(traceback.format_exc())
            return {
                "overview": "Unable to generate summary at this time. Please review the conversation transcript for details.",
                "recommendations": [
                    "Follow up with a healthcare provider if needed",
                    "Monitor your symptoms",
                    "Maintain a healthy lifestyle"
                ]
            }

    def _build_prompt(
        self,
        message: str,
        emotion: str,
        emotion_context: Optional[Dict] = None
    ) -> str:
        """
        Build prompt with emotion context

        Args:
            message: User message
            emotion: Detected emotion
            emotion_context: Additional context

        Returns:
            Formatted prompt string
        """
        # Start with system prompt
        prompt_parts = [self.system_prompt]

        # Add conversation history if exists
        if self.conversation_history:
            prompt_parts.append("\n\nConversation history:")
            for msg in self.conversation_history[-6:]:  # Keep last 6 messages for context
                role = "Patient" if msg["role"] == "user" else "Doctor"
                prompt_parts.append(f"{role}: {msg['content']}")

        # Add emotion context
        prompt_parts.append(f"\n\nCurrent patient emotion detected: {emotion}")

        # Add emotion mismatch context if present
        if emotion_context and emotion_context.get("mismatch_detected"):
            prompt_parts.append(
                f"Note: There's a mismatch between what the patient is saying and their facial expression. "
                f"They appear {emotion} but their words suggest {emotion_context.get('text_sentiment', 'different feelings')}. "
                f"Consider probing gently to understand their true feelings."
            )

        # Add current message
        prompt_parts.append(f"\n\nPatient: {message}")
        prompt_parts.append("\nDoctor:")

        return "\n".join(prompt_parts)

    def _add_to_history(self, role: str, content: str):
        """Add message to conversation history"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })
