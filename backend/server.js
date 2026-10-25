require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:8000' }));
app.use(express.json({ limit: '1mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'image-backend' });
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();

    if (!prompt || prompt.length > 2000) {
      return res.status(400).json({
        error: 'Please provide a valid image prompt up to 2000 characters.'
      });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return res.status(400).json({
        error: 'Set GEMINI_API_KEY or GOOGLE_API_KEY before starting the image backend.'
      });
    }

    const result = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        includeSafetyAttributes: false
      }
    });

    const image = result?.generatedImages?.[0]?.image;
    const imageBytes = image?.imageBytes;

    if (!imageBytes) {
      return res.status(502).json({
        error: 'The Gemini image model did not return a usable image. Check access, quota, or model availability.'
      });
    }

    return res.json({
      mimeType: 'image/png',
      imageUrl: `data:image/png;base64,${imageBytes}`,
      alt: prompt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    console.error('Image generation failed:', message);
    return res.status(500).json({
      error: `Image generation failed. Check the backend API key, quota, model access, and server logs. ${message}`
    });
  }
});

app.listen(port, () => {
  console.log(`Image backend running at http://localhost:${port}`);
});
