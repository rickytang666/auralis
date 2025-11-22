# Frontend

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env.local
# Edit .env.local if backend URL differs
```

3. **Download face-api.js models:**

```bash
# Create public/models directory
mkdir -p public/models

# Download models from:
# https://github.com/justadudewhohacks/face-api.js-models
# Place in public/models/
```

4. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Main video call interface
│   ├── components/
│   │   ├── VideoFeed.tsx           # Webcam + face-api.js
│   │   ├── Avatar.tsx              # 3D/2D doctor avatar
│   │   ├── ChatDisplay.tsx         # Conversation history
│   │   ├── AudioController.tsx     # Speech controls
│   │   └── InsightsDashboard.tsx   # Analytics
│   └── api/                  # Next.js API routes (backend proxy)
│       ├── chat/route.ts
│       ├── tts/route.ts
│       └── insights/route.ts
├── lib/
│   ├── faceDetection.ts      # face-api.js wrapper
│   └── audioUtils.ts         # Audio recording and playback helpers
└── public/
    └── models/               # face-api.js models (download separately)
```

## Features

- **Video Feed** - Webcam with real-time emotion detection
- **Avatar** - Animated doctor with lip-sync
- **Chat** - Conversation history display
- **Audio** - Audio recording and playback (ElevenLabs STT/TTS via backend)
- **Insights** - Emotion analytics and conversation summary

## TODO

Each component has TODO comments for implementation:

- [ ] Integrate face-api.js for emotion detection
- [ ] Implement avatar animation and lip-sync
- [ ] Connect audio recording for voice input
- [ ] Wire up backend API calls
- [ ] Add Chart.js for emotion visualization

## Dependencies

- **Next.js 16** - React framework
- **face-api.js** - Face detection and emotion recognition
- **MediaRecorder API** - Browser audio recording (built-in)
- **Tailwind CSS** - Styling

## Browser Requirements

- Modern browser with webcam and microphone access
- Chrome/Edge recommended (best MediaRecorder API support)
