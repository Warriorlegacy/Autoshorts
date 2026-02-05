# 🎉 AutoShorts Free Tier Setup

This guide explains how to run AutoShorts **completely free** using alternative AI services that don't require paid API keys!

## 💰 Cost: $0/month

All the AI services used in this setup offer generous free tiers:

| Service | What It Does | Cost | Limits |
|---------|-------------|------|--------|
| **Groq** | Script generation (LLM) | **FREE** | 1,500 req/day, 20 tokens/min |
| **Edge TTS** | Text-to-speech | **FREE** | Unlimited, no API key needed |
| **Pollinations AI** | Image generation | **FREE** | Unlimited, no API key needed |

## 🚀 Quick Start (5 minutes)

### Step 1: Get Your Free Groq API Key

1. Visit [https://console.groq.com/keys](https://console.groq.com/keys)
2. Sign up for a free account
3. Create a new API key
4. Copy the key (starts with `gsk_`)

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Groq API key
GROQ_API_KEY=gsk_your_key_here
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Server

```bash
npm run dev
```

✅ **Done!** The server will start and automatically validate your free tier configuration.

## 📋 What You Get

### ✨ Script Generation (Groq)
- **Model**: Llama 3.1 8B (fast & high quality)
- **Features**:
  - Video script generation with scenes
  - Title suggestions
  - Hashtag generation
  - Image prompt enhancement
- **Fallback**: Pre-built mock scripts for common niches

### 🔊 Text-to-Speech (Microsoft Edge TTS)
- **Voices**: 30+ high-quality neural voices
- **Languages**: English, Spanish, French, German, Hindi, Japanese, Korean, Chinese, and more
- **Features**:
  - Natural-sounding speech
  - Male and female voices
  - No API key required
  - Fast generation (1-2 seconds)
- **Fallback**: FFmpeg silent audio generation

### 🎨 Image Generation (Pollinations AI)
- **Quality**: 1080x1920 (9:16 vertical format)
- **Speed**: 2-5 seconds per image
- **Features**:
  - Unlimited generations
  - No rate limits
  - No API key required
  - Works with any prompt
- **Fallback**: Gradient SVG mock images

## 🔧 Optional: Enhanced Features

You can optionally add a **Gemini API key** for enhanced prompt generation:

1. Get key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Add to `.env`:
   ```
   GEMINI_API_KEY=your_gemini_key_here
   ```

**Benefits:**
- Better image generation prompts
- Enhanced scene descriptions
- Stock image suggestions

**Note**: Not required - the app works great without it!

## 📊 Free Tier Limits

### Groq API (Script Generation)
- **Requests**: 1,500 per day
- **Tokens**: 20 per minute
- **Models Available**:
  - Llama 3.1 8B (instant) - Fastest
  - Llama 3.3 70B (versatile) - Best quality
  - Mixtral 8x7B
  - Gemma 2 9B

**At 1,500 requests/day, you can generate:**
- ~150 videos per day (10 scenes each)
- ~300 title variations per day
- Unlimited with mock script fallback

### Edge TTS (Voice Generation)
- **Cost**: $0 (no API key needed)
- **Limit**: Unlimited
- **Rate**: Depends on your server's capacity

### Pollinations AI (Images)
- **Cost**: $0 (no API key needed)
- **Limit**: Unlimited
- **Rate**: 2-5 seconds per image

## 🔄 Fallback Chain

The app is designed to always work, even if services fail:

### Script Generation
1. **Groq API** (free tier) → Real AI-generated scripts
2. **Mock Scripts** → Pre-built templates for common niches

### Text-to-Speech
1. **Edge TTS** → High-quality Microsoft voices
2. **FFmpeg** → Silent audio with accurate duration

### Image Generation
1. **Pollinations AI** → Real AI-generated images
2. **Gradient SVG** → Beautiful mock images

## 🛠️ Troubleshooting

### "GROQ_API_KEY not set" Error
```
❌ MISSING REQUIRED API KEY: GROQ_API_KEY
```

**Solution**: 
1. Get your free key at https://console.groq.com/keys
2. Add it to your `.env` file:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

### Videos Generated But No Audio
**Cause**: Edge TTS failed to generate audio

**Solution**: 
- Check that FFmpeg is installed: `ffmpeg -version`
- The app will automatically fall back to silent audio with correct duration

### Images Are Gradient SVGs Instead of Real Photos
**Cause**: Pollinations AI failed or timed out

**Solution**:
- Check your internet connection
- The app will use beautiful gradient SVGs as fallback
- Real images will be generated on retry

### "Rate limit exceeded" Errors
**Cause**: Groq free tier limit reached (1,500/day)

**Solution**:
- Wait for the next day (resets at midnight UTC)
- The app will use mock scripts automatically
- Consider upgrading to Groq's paid tier if needed

## 📁 File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── geminiService.ts    # Now uses Groq API
│   │   ├── ttsService.ts       # Now uses Edge TTS
│   │   └── imageService.ts     # Now uses Pollinations AI
│   ├── constants/
│   │   └── config.ts           # Updated for free services
│   └── server.ts               # Validates free tier config
├── .env.example                # Updated documentation
└── FREE_SETUP.md              # This file
```

## 🆚 Comparison: Free vs Paid

| Feature | Free Tier | Paid Alternatives |
|---------|-----------|-------------------|
| **Script Generation** | Llama 3.1 (excellent) | GPT-4, Claude 3 (slightly better) |
| **Text-to-Speech** | Edge TTS (great) | ElevenLabs (premium voices) |
| **Image Generation** | Pollinations (good) | Midjourney, DALL-E (better) |
| **Cost** | **$0/month** | $20-100/month |
| **Limits** | 1,500 scripts/day | Unlimited |

## ✅ Recommended For

The free tier is perfect for:
- ✅ Development and testing
- ✅ Personal projects
- ✅ Small content creators
- ✅ Learning and experimentation
- ✅ Prototyping before scaling

## 🚀 Upgrading (Optional)

If you outgrow the free tier:

1. **Groq**: Paid plans start at $5/month for higher limits
2. **ElevenLabs**: For premium TTS voices
3. **Replicate**: For higher quality image generation
4. **OpenAI/Anthropic**: For GPT-4 or Claude 3

Just add their API keys to `.env` - the app will automatically use them!

## 📝 Summary

With just **one free API key** from Groq, you get:
- ✅ AI-generated video scripts
- ✅ High-quality text-to-speech
- ✅ AI-generated background images
- ✅ All at **$0 cost**

**No credit card required. No hidden fees. No surprises.**

Happy video creation! 🎬
