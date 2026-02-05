# AutoShorts API Documentation

**Version:** 1.0  
**Base URL:** `http://localhost:3001/api`  
**Last Updated:** January 29, 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Videos](#videos)
3. [Text-to-Speech (TTS)](#text-to-speech-tts)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)

---

## Authentication

All endpoints require a JWT token in the `Authorization` header (except auth endpoints).

### Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription_tier": "starter",
    "credits_remaining": 30
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400 Bad Request` - Missing required fields
- `409 Conflict` - Email already registered

---

### Login User

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription_tier": "starter",
    "credits_remaining": 30
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials

---

### Get Current User

**GET** `/auth/me`

Get authenticated user's information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription_tier": "pro",
    "credits_remaining": 85
  }
}
```

---

## Videos

### Generate Video

**POST** `/videos/generate`

Create a new video with AI-generated script and voiceover.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "niche": "Technology",
  "duration": 60,
  "language": "en-US",
  "visualStyle": "cinematic",
  "voiceName": "en-US-Neural2-C",
  "speakingRate": 1.0
}
```

**Parameters:**
- `niche` (string, required) - Content category (Technology, Gaming, Education, etc.)
- `duration` (number, optional, default: 60) - Video length in seconds (30 or 60)
- `language` (string, optional, default: "en-US") - Voiceover language code
- `visualStyle` (string, optional, default: "cinematic") - Visual template style
- `voiceName` (string, optional, default: "en-US-Neural2-C") - Voice actor to use
- `speakingRate` (number, optional, default: 1.0) - Speed multiplier (0.5-2.0)

**Response (201):**
```json
{
  "success": true,
  "videoId": "v-uuid-here",
  "message": "Video generation started - rendering in progress",
  "status": "rendering",
  "content": {
    "title": "Top 5 AI Breakthroughs in 2025",
    "caption": "Discover the latest AI innovations reshaping tech...",
    "hashtags": ["AI", "Technology", "Innovation"],
    "scenes": [
      {
        "id": "1",
        "narration": "AI is advancing at lightning speed!",
        "textOverlay": "AI Breakthroughs 2025",
        "duration": 15,
        "audioUrl": "/renders/audio_xxxxx.mp3",
        "audioDuration": 3500,
        "background": {
          "type": "gradient",
          "source": "linear-gradient(135deg, #0010FF 0%, #7C3AED 100%)"
        }
      }
    ],
    "voiceName": "en-US-Neural2-C"
  }
}
```

**Errors:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Generation failed

---

### Get Video Status

**GET** `/videos/:videoId/status`

Check the status of a video being generated.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "video": {
    "id": "v-uuid-here",
    "title": "Top 5 AI Breakthroughs",
    "caption": "Discover the latest AI innovations...",
    "status": "completed",
    "videoUrl": "/renders/v-uuid-here.mp4",
    "thumbnailUrl": "/renders/v-uuid-here.jpg",
    "createdAt": "2026-01-29T16:09:26Z"
  }
}
```

**Status Values:**
- `generating` - AI is creating the script
- `rendering` - Video is being rendered
- `completed` - Video is ready
- `failed` - Generation failed

**Errors:**
- `404 Not Found` - Video not found
- `401 Unauthorized` - Not authenticated

---

### List User's Videos

**GET** `/videos`

Get paginated list of all videos for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 10) - Items per page (max: 50)

**Response (200):**
```json
{
  "success": true,
  "videos": [
    {
      "id": "v-uuid-1",
      "title": "Top 5 AI Breakthroughs",
      "caption": "Discover the latest AI innovations...",
      "niche": "Technology",
      "duration": 60,
      "status": "completed",
      "visualStyle": "cinematic",
      "createdAt": "2026-01-29T16:09:26Z"
    },
    {
      "id": "v-uuid-2",
      "title": "Fitness Tips for Beginners",
      "caption": "Start your fitness journey...",
      "niche": "Fitness",
      "duration": 30,
      "status": "generating",
      "visualStyle": "documentary",
      "createdAt": "2026-01-29T15:45:12Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

---

### Delete Video

**DELETE** `/videos/:videoId`

Remove a video and its associated files.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

**Errors:**
- `404 Not Found` - Video not found
- `401 Unauthorized` - Not authenticated

---

## Text-to-Speech (TTS)

### Synthesize Text to Speech

**POST** `/tts/synthesize`

Convert text to natural-sounding speech audio.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Welcome to AutoShorts, your AI-powered video creation platform!",
  "languageCode": "en-US",
  "voiceName": "en-US-Neural2-C",
  "ssmlGender": "FEMALE",
  "speakingRate": 1.0,
  "pitch": 0
}
```

**Parameters:**
- `text` (string, required) - Text to synthesize
- `languageCode` (string, optional, default: "en-US") - Language code
- `voiceName` (string, optional, default: "en-US-Neural2-C") - Voice actor
- `ssmlGender` (string, optional, default: "NEUTRAL") - MALE, FEMALE, or NEUTRAL
- `speakingRate` (number, optional, default: 1.0) - Speed (0.5-2.0)
- `pitch` (number, optional, default: 0) - Pitch adjustment (-20.0 to 20.0)

**Response (200):**
```json
{
  "success": true,
  "audioUrl": "/renders/audio_1643567890_abc123.mp3",
  "duration": 3500,
  "message": "Text synthesized successfully"
}
```

**Errors:**
- `400 Bad Request` - Missing or invalid text
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - TTS service error

---

### Synthesize SSML

**POST** `/tts/synthesize-ssml`

Convert SSML (Speech Synthesis Markup Language) to speech for advanced control.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ssml": "<speak>Welcome to <emphasis level=\"strong\">AutoShorts</emphasis>! <break time=\"500ms\"/> Let's create amazing videos.</speak>",
  "languageCode": "en-US",
  "voiceName": "en-US-Neural2-C"
}
```

**Response (200):**
```json
{
  "success": true,
  "audioUrl": "/renders/audio_1643567890_xyz789.mp3",
  "duration": 4200,
  "message": "SSML synthesized successfully"
}
```

---

### Get Available Voices

**GET** `/tts/voices`

Retrieve list of available voice actors.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `languageCode` (string, optional) - Filter by language (e.g., "en-US")

**Response (200):**
```json
{
  "success": true,
  "voices": [
    {
      "name": "en-US-Neural2-A",
      "ssmlGender": "MALE",
      "languageCode": "en-US"
    },
    {
      "name": "en-US-Neural2-C",
      "ssmlGender": "FEMALE",
      "languageCode": "en-US"
    },
    {
      "name": "en-US-Neural2-E",
      "ssmlGender": "MALE",
      "languageCode": "en-US"
    }
  ],
  "count": 3,
  "message": "Voices fetched successfully"
}
```

---

### Get Voices by Language

**GET** `/tts/voices/:languageCode`

Get voice options for a specific language.

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `languageCode` (string, required) - Language code (e.g., "es-ES", "fr-FR")

**Response (200):**
```json
{
  "success": true,
  "languageCode": "es-ES",
  "voices": [
    {
      "name": "es-ES-Neural2-A",
      "ssmlGender": "FEMALE",
      "languageCode": "es-ES"
    },
    {
      "name": "es-ES-Neural2-B",
      "ssmlGender": "MALE",
      "languageCode": "es-ES"
    }
  ],
  "count": 2,
  "message": "Voices for es-ES fetched successfully"
}
```

---

### Batch Synthesis

**POST** `/tts/batch`

Generate multiple audio files in a single request.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "text": "Scene one narration",
      "languageCode": "en-US",
      "voiceName": "en-US-Neural2-C"
    },
    {
      "text": "Scene two narration",
      "languageCode": "en-US",
      "voiceName": "en-US-Neural2-C",
      "speakingRate": 1.1
    },
    {
      "text": "Scene three narration",
      "languageCode": "en-US",
      "voiceName": "en-US-Neural2-A",
      "speakingRate": 0.9
    }
  ]
}
```

**Limits:**
- Maximum 10 items per batch
- Each item follows the same rules as `/tts/synthesize`

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "audioUrl": "/renders/audio_1643567890_item1.mp3",
      "duration": 2100
    },
    {
      "audioUrl": "/renders/audio_1643567891_item2.mp3",
      "duration": 2300
    },
    {
      "audioUrl": "/renders/audio_1643567892_item3.mp3",
      "duration": 2150
    }
  ],
  "count": 3,
  "message": "Batch synthesis completed successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid items or too many items (>10)
- `401 Unauthorized` - Not authenticated

---

## Error Handling

All endpoints return errors in this standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Missing or invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already registered) |
| `TTS_ERROR` | 500 | Text-to-Speech service error |
| `VIDEO_GENERATION_FAILED` | 500 | Video generation failed |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

**Current Status:** Rate limiting not yet implemented

**Planned Limits:**
- 100 requests per 15 minutes per IP
- 10 video generations per hour per user
- 30 TTS requests per hour per user

---

## Supported Languages & Voices

### English (en-US)
- `en-US-Neural2-A` (Male)
- `en-US-Neural2-C` (Female)
- `en-US-Neural2-E` (Male)
- `en-US-Neural2-F` (Female)

### Spanish (es-ES)
- `es-ES-Neural2-A` (Female)
- `es-ES-Neural2-B` (Male)

### French (fr-FR)
- `fr-FR-Neural2-A` (Female)
- `fr-FR-Neural2-B` (Male)

### German (de-DE)
- `de-DE-Neural2-A` (Female)
- `de-DE-Neural2-B` (Male)

### Hindi (hi-IN)
- `hi-IN-Neural2-A` (Female)
- `hi-IN-Neural2-B` (Male)

---

## Example Workflows

### Complete Video Generation Workflow

```bash
# 1. Register/Login
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John"
  }'

# Extract token from response
TOKEN="eyJhbGci..."

# 2. Generate video
curl -X POST http://localhost:3001/api/videos/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "Technology",
    "duration": 60,
    "language": "en-US",
    "voiceName": "en-US-Neural2-C"
  }'

# Extract videoId from response
VIDEO_ID="v-uuid-here"

# 3. Poll for status
curl -X GET http://localhost:3001/api/videos/$VIDEO_ID/status \
  -H "Authorization: Bearer $TOKEN"

# 4. Download when ready
# Once status is "completed", download from videoUrl
```

---

## Development Notes

- TTS service runs in **mock mode** by default (no API costs)
- To use real Google Cloud TTS, set `GOOGLE_APPLICATION_CREDENTIALS` env var
- Rendered videos stored in `backend/public/renders/`
- Audio files stored in `backend/public/renders/` with audio_* prefix

