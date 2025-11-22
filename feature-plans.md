## app overview

**core goal:** create a virtual doctor that conducts video consultations, detects patient emotions through facial recognition, responds with empathy via gemini ai, and provides post-session insights.

---

## key features

### 1. video consultation interface

- real-time webcam feed with face detection
- emotion recognition during conversation
- visual feedback of detected emotions

### 2. conversational ai doctor

- natural language medical consultation
- context-aware follow-up questions
- empathetic response generation via gemini

### 3. animated doctor avatar

- lip-synced speech animation
- responsive facial expressions
- speaking/listening state indicators

### 4. voice interaction

- speech-to-text for patient input
- text-to-speech for doctor responses (elevenlabs)
- natural conversation flow

### 5. emotion intelligence

- real-time emotion detection via face-api.js
- emotion vs conversation tone mismatch detection
- emotional pattern tracking throughout session

### 6. session insights

- conversation summary
- emotion timeline visualization
- key concerns and recommendations

---

## feature delegation

### person 1 (frontend lead) - `frontend-dev` branch

**core features:**

- video feed with face detection
  - webcam capture
  - face-api.js integration
  - real-time emotion detection display
- chat display component
  - conversation history ui
  - message bubbles (user/doctor)
  - timestamp display
- insights dashboard
  - emotion timeline chart
  - conversation summary display
  - session statistics

**deliverables:**

- working video feed with emotion overlay
- scrollable chat interface
- post-session insights page

---

### person 2 (avatar lead) - `avatar-dev` branch

**core features:**

- doctor avatar component
  - static/animated avatar rendering
  - lip-sync with audio playback
  - idle animations
- avatar state management
  - speaking/listening states
  - emotion-responsive expressions
- asset management
  - avatar images/models
  - animation configurations

**deliverables:**

- animated avatar that syncs with tts audio
- smooth state transitions
- responsive avatar ui

---

### person 3 (backend lead) - `backend-api` branch

**core features:**

- gemini conversation api
  - medical conversation context
  - empathetic response generation
  - follow-up question logic
- emotion mismatch detection
  - compare detected emotion vs conversation tone
  - flag discrepancies for insights
- insights generation
  - conversation summarization
  - emotion pattern analysis
  - session report creation
- fastapi server setup
  - cors configuration
  - error handling
  - api documentation

**deliverables:**

- `/api/chat` endpoint
- `/api/insights` endpoint
- emotion analysis logic

---

### person 4 (audio pipeline) - `audio-pipeline` branch

**core features:**

- frontend audio capture
  - web speech api integration
  - speech-to-text processing
  - microphone permissions handling
- audio controller component
  - mute/unmute controls
  - recording state management
  - audio visualization
- elevenlabs tts integration
  - text-to-speech conversion
  - audio streaming/playback
  - voice selection
- audio playback management
  - queue management
  - playback controls
  - sync with avatar

**deliverables:**

- `/api/tts` endpoint
- working speech recognition
- audio playback with avatar sync

---

## integration checkpoints

**hour 2:** backend shares api endpoints, frontend can mock responses

**hour 5:** audio pipeline tests full flow (speech → backend → tts → playback)

**hour 8:** avatar syncs with audio playback

**hour 10:** full integration test (video + chat + audio + avatar + insights)

---

## mvp feature priority

**must have:**

- video feed with basic emotion detection
- working conversation (speech → gemini → tts)
- avatar with lip-sync
- basic chat display

**nice to have:**

- emotion mismatch alerts
- detailed insights dashboard
- advanced avatar animations
- emotion timeline visualization

**can skip if time-constrained:**

- session history persistence
- user authentication
- mobile responsiveness
- advanced error recovery
