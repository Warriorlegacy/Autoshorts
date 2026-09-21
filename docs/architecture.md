# Architecture

## Overview

`Warriorlegacy/Autoshorts` is an autonomous content production and distribution platform:
- **AI Content Generation** — Text-to-video, script generation, TTS
- **Queue Processing** — Async video processing with retries
- **Distribution** — Multi-platform content distribution
- **Dashboard** — Content management and analytics

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Backend:** Express/Fastify + TypeScript
- **Frontend:** React + TypeScript
- **Queue:** Redis + BullMQ
- **AI:** OpenAI/Anthropic/Google (provider-agnostic gateway)
- **Database:** PostgreSQL/MongoDB
- **Testing:** Jest + React Testing Library
- **Deployment:** Docker + Render + Railway + Fly.io

## Directory Structure

```
backend/
├── ai-services/      AI service integration (OpenAI, Anthropic, Google)
├── queue/            Job queue, retries, dead-letter
├── video/            Video processing pipeline
├── content/          Content generation, editing
├── distribution/     Multi-platform distribution
└── api/              REST API endpoints

frontend/
├── dashboard/        Content management dashboard
├── editor/           Video editor interface
└── components/       React components

models/               AI model configurations
queue/                Job queue (Redis/BullMQ)
workers/              Worker processes
evaluation/           Content quality evaluation
observability/        Logging, metrics, tracing
guardrails/           Content safety, moderation
```

## AI-Native Pipeline

```
USER REQUEST
  → SCRIPT GENERATION (AI)
  → TTS SYNTHESIS (AI)
  → VIDEO ASSEMBLY (FFmpeg + MoviePy)
  → QUALITY EVALUATION (AI)
  → HUMAN APPROVAL (optional)
  → MULTI-PLATFORM DISTRIBUTION
  → OBSERVABILITY
  → FEEDBACK
  → OPTIMIZATION
```

## Security

See [SECURITY.md](SECURITY.md).

## Testing

- Unit tests for backend
- Unit tests for frontend
- Integration tests for API
- E2E tests for video pipeline
- Content quality evaluation tests

## License

None — consider adding MIT or Apache-2.0.
