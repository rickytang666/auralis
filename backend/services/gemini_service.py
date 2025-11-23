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
            "max_output_tokens": 1500,  # Allow longer responses for complete thoughts
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
            "max_output_tokens": 1800,  # Higher limit for detailed summaries
            "candidate_count": 1,
        }
        self.summary_model = genai.GenerativeModel(
            self.model_name,
            generation_config=summary_config,
            safety_settings=safety_settings
        )
        
        self.conversation_history = []
        self.chat_session = None  # Will be initialized on first use
        self.system_message = """You're a friendly virtual doctor having a casual conversation with a patient. Talk naturally like you're texting a friend who needs medical advice.

STYLE:
- Casual, conversational tone (like texting)
- 2-3 sentences MAX per response (never more unless absolutely critical)
- NO markdown, NO asterisks, NO numbered lists, NO bullet points
- Just plain text, natural flow
- Be warm but professional

CONSULTATION FLOW:
1. First message: Ask 1-2 questions about their concern
2. Second message: Ask 1-2 more questions if needed
3. Third message: Give your assessment and advice in plain language

After 2-3 exchanges, give advice. Don't keep asking questions forever.

GOOD EXAMPLES:

Patient: "I have a headache"
You: "Got it. Where exactly does it hurt and how long have you had it?"

Patient: "Forehead, started 2 days ago"
You: "Is it constant or does it come and go? Any nausea or light sensitivity?"

Patient: "Constant, no other symptoms"
You: "Sounds like a tension headache. Try taking ibuprofen every 6 hours, use a cold compress on your forehead, and rest in a dark room. If it doesn't improve in 3-4 days or gets worse, definitely see a doctor in person."

BAD EXAMPLES (too formal):
❌ "Based on your symptoms, I recommend: 1) Ibuprofen 2) Cold compress 3) Rest"
❌ "Here's what I suggest: **Take ibuprofen** and **apply ice**"
❌ Long paragraphs with multiple recommendations

FACIAL EXPRESSIONS:
- You can see the patient's face
- Only mention emotion mismatches if they're blocking your ability to help
- Example: Patient says "I'm totally fine" but looks very distressed → "I hear you, but you seem really troubled. What's actually going on?"
- Don't interrogate emotions unless it's relevant to their health

ENDING:
When patient says "thanks" or "that's all":
1. Say you're welcome
2. Ask "Anything else I can help with?"
3. If they say no, end warmly with [END_CONSULTATION] tag

Example:
Patient: "Thanks, that helps!"
You: "You're welcome! Anything else I can help with?"
Patient: "Nope, I'm good"
You: "Great! Take care and feel better soon. [END_CONSULTATION]"

Remember: Keep it casual, brief, and natural. You're texting medical advice, not writing a formal report."""

    async def get_response(
        self,
        message: str,
        emotion: str,
        age: Optional[int] = None,
        age_category: Optional[str] = None,
        emotion_context: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Get AI response based on user message, detected emotion, and age

        Args:
            message: User's message text
            emotion: Detected emotion (e.g., "happy", "sad", "anxious")
            age: Detected age (e.g., 32)
            age_category: Age category (e.g., "Young Adult", "Senior")
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
                    {"role": "model", "parts": ["Got it. I'll keep things casual and brief, ask a couple questions to understand what's going on, then give straightforward advice. No formal lists or long explanations, just natural conversation."]}
                ])

            # Build context-aware message with emotion, age, and conversation stage
            contextual_message = self._build_contextual_message(message, emotion, age, age_category, emotion_context)
            
            # Send message to chat
            response = self.chat_session.send_message(contextual_message)

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

            # Check if AI is signaling end of consultation
            should_end = "[END_CONSULTATION]" in response_text
            
            # Remove the tag from the response text (don't show to user)
            clean_response = response_text.replace("[END_CONSULTATION]", "").strip()

            # Add to our history for tracking
            self._add_to_history("user", message)
            self._add_to_history("assistant", clean_response)

            # Determine if follow-up is needed
            followup_needed = "?" in clean_response or len(self.conversation_history) < 6

            return {
                "text": clean_response,
                "followup_needed": followup_needed,
                "should_end_consultation": should_end
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

IMPORTANT: Use plain text only. NO markdown, NO asterisks, NO special formatting. Write naturally like you're explaining to a colleague.

Consultation Transcript:
{formatted_conversation}

Summary:"""

            # Build prompt for recommendations
            recommendations_prompt = f"""Based on this consultation transcript, provide 3-4 specific recommendations or next steps for the patient.

IMPORTANT: 
- Write in plain text, NO markdown, NO asterisks, NO bold text
- Start each recommendation naturally (e.g., "Try taking...", "Make sure to...", "Consider...")
- Don't use numbered lists or bullet points
- Separate recommendations with line breaks
- Be practical and actionable

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
                # Parse recommendations into list - split by line breaks
                recommendations = []
                for line in recommendations_text.split('\n'):
                    line = line.strip()
                    # Remove any markdown formatting that might slip through
                    line = line.replace('**', '').replace('*', '').replace('##', '').replace('#', '')
                    # Remove numbering/bullets if present
                    if line and len(line) > 3:  # Ignore very short lines
                        # Remove common prefixes
                        for prefix in ['1.', '2.', '3.', '4.', '5.', '-', '•', '●']:
                            if line.startswith(prefix):
                                line = line[len(prefix):].strip()
                        if line:
                            recommendations.append(line)
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

    def _build_contextual_message(
        self,
        message: str,
        emotion: str,
        age: Optional[int] = None,
        age_category: Optional[str] = None,
        emotion_context: Optional[Dict] = None
    ) -> str:
        """
        Build a message with emotion and age context for better AI understanding
        
        Args:
            message: User's spoken words
            emotion: Detected facial emotion
            age: Detected age
            age_category: Age category (e.g., "Young Adult", "Senior")
            emotion_context: Mismatch analysis from EmotionAnalyzer
            
        Returns:
            Contextual message string
        """
        # Start with the user's message
        parts = [f'Patient says: "{message}"']
        
        # Add facial emotion as subtle context
        parts.append(f"[Facial expression: {emotion}]")
        
        # Add age context for tailored medical advice
        if age_category:
            age_guidance = self._get_age_guidance(age_category)
            if age_guidance:
                parts.append(f"[Patient age group: {age_category}. {age_guidance}]")
        
        # Add conversation stage reminder
        exchange_count = len([msg for msg in self.conversation_history if msg["role"] == "user"])
        if exchange_count >= 2:
            parts.append(f"[This is exchange #{exchange_count + 1}. You should provide assessment and advice now, not just more questions.]")
        
        # Only flag SIGNIFICANT mismatches (not every small discrepancy)
        if emotion_context and emotion_context.get("mismatch_detected"):
            confidence = emotion_context.get("confidence", 0)
            
            # Only flag if high confidence mismatch (strong sentiment + clear opposite emotion)
            if confidence > 0.5:  # Significant mismatch threshold
                mismatch_type = emotion_context.get("mismatch_type", "")
                
                if mismatch_type == "positive_words_negative_face":
                    # Patient claiming to be fine but looks distressed
                    parts.append(f"[Note: Patient expressing positivity but appears {emotion}. May want to check emotional wellbeing if appropriate.]")
                elif mismatch_type == "negative_words_positive_face":
                    # Patient complaining but looks fine - probably minor issue
                    parts.append(f"[Note: Patient expressing concerns but appears {emotion}. Likely manageable issue.]")
        
        return "\n".join(parts)
    
    def _get_age_guidance(self, age_category: str) -> str:
        """
        Get age-appropriate guidance for the AI
        
        Args:
            age_category: Age category (e.g., "Child", "Young Adult", "Senior")
            
        Returns:
            Guidance string for the AI
        """
        age_guidance_map = {
            "Child": "Use simple language. Consider parental involvement. Focus on common childhood issues.",
            "Teenager": "Be supportive and non-judgmental. Consider school stress, growth, and mental health.",
            "Young Adult": "Consider lifestyle factors like work stress, exercise, diet, and sleep habits.",
            "Middle-Aged": "Consider chronic conditions, family history, stress management, and preventive care.",
            "Senior": "Consider age-related conditions, medications, mobility, and chronic disease management.",
            "Elderly": "Be extra clear and patient. Consider multiple medications, mobility issues, and caregiver involvement."
        }
        return age_guidance_map.get(age_category, "")
    
    def _add_to_history(self, role: str, content: str):
        """Add message to conversation history"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })
