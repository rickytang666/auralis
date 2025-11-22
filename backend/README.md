# Backend

## Setup

1. **Create virtual environment:**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env and add your API keys
```

4. **Run the server:**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check

- `GET /` - Basic health check
- `GET /health` - Detailed health check

### Conversation

- `POST /api/chat` - Send message and get AI response
  ```json
  {
    "message": "I've been feeling tired lately",
    "emotion": "sad"
  }
  ```

### Text-to-Speech

- `POST /api/tts` - Convert text to speech
  ```json
  {
    "text": "I understand. Can you tell me more?",
    "voice_id": "optional_voice_id"
  }
  ```
- `POST /api/tts/stream` - Stream audio response

### Insights

- `POST /api/insights` - Generate conversation summary and analytics
  ```json
  {
    "conversation": [...],
    "emotions": ["sad", "neutral", "happy"],
    "timestamps": ["2025-11-22T10:00:00Z", ...]
  }
  ```

## Project Structure

```
backend/
├── main.py                 # FastAPI app entry
├── routers/
│   ├── conversation.py     # Chat endpoints
│   ├── tts.py             # Text-to-speech endpoints
│   └── insights.py        # Analytics endpoints
├── services/
│   ├── gemini_service.py       # Google Gemini integration
│   ├── elevenlabs_service.py   # ElevenLabs STT and TTS integration
│   └── emotion_analyzer.py     # Emotion analysis logic
└── models/
    └── schemas.py         # Pydantic models
```

## Development

- API documentation available at: `http://localhost:8000/docs`
- Alternative docs at: `http://localhost:8000/redoc`

## TODO

Each service file contains TODO comments for implementation:

- [ ] Implement Gemini API integration
- [ ] Implement ElevenLabs STT and TTS integration
- [ ] Implement emotion mismatch detection
- [ ] Add error handling and logging
- [ ] Add rate limiting
- [ ] Add authentication (if needed)
