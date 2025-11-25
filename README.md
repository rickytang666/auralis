<div align="center">
    <img src="frontend/public/apple-touch-icon.png" alt="Auralis Logo" width="100" height="100">
    <h1>Auralis</h1>
    <p>Your AI-powered virtual doctor</p>
    <p><strong>🏆 Best AI Application Built with CloudFlare @ Hack Western 2025</strong></p>
</div>

---

## Inspiration

We wanted to create a virtual doctor that can see your face, detect your emotions, and have a natural conversation about your health concerns. The goal was to make medical consultations more accessible while using facial recognition and emotion detection to provide personalized, empathetic responses.

---

## What It Does

Auralis is an AI-powered virtual doctor that conducts face-to-face video consultations:

- **3D Avatar Doctor**: Interactive, lip-synced doctor avatar with customizable appearance
- **Real-time Emotion Detection**: Analyzes facial expressions during consultation to understand patient emotional state
- **Intelligent Conversations**: Powered by Google Gemini AI for natural, context-aware medical consultations
- **Voice Interaction**: Natural speech-to-text and text-to-speech via ElevenLabs for seamless conversation
- **Emotion-Aware Responses**: AI adapts its communication style based on detected emotions
- **Session Insights**: Post-consultation summary with emotion timeline, key concerns, and recommendations
- **Professional Report PDF Generation**: Generates a professional report PDF with the consultation summary, key concerns, and recommendations

---

## Tech Stack

**Frontend:**

- Next.js 16
- Three.js (3D avatar rendering)
- face-api.js (real-time emotion detection)
- Framer Motion (animations)
- Tailwind CSS

**Backend:**

- FastAPI
- Google Gemini
- ElevenLabs (TTS/STT)

---

## Quick Start

**Backend:**

```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```

**Frontend:**

```bash
cd frontend && npm install && npm run dev
```

## Team

- [Ricky Tang](https://www.rickyt.tech)
- [Abdullah Rajput](https://abrj7.github.io)
- [Nathan Espejo](https://www.nathanespejo.tech)
- [Samrath Singh Patpatia](https://www.linkedin.com/in/samrath-singh-patpatia-640a03369/)
