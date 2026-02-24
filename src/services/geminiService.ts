import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "" });

export async function generateClickSound() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: 'Aahn..' }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is a female voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mp3;base64,${base64Audio}`;
    }
  } catch (err) {
    console.error("Failed to generate click sound", err);
  }
  return null;
}

export async function generatePostContent(prompt: string, referenceImage?: string | null, tone: string = 'Professional', platform: string = 'linkedin') {
  let platformInstructions = "";
  switch(platform.toLowerCase()) {
    case 'instagram':
      platformInstructions = "The post should be highly visual, use a catchy hook, include relevant emojis, and end with a block of 10-15 relevant hashtags. Keep it engaging for a visual platform.";
      break;
    case 'facebook':
      platformInstructions = "The post should be conversational, encourage comments and sharing, use a few emojis, and include 2-3 relevant hashtags.";
      break;
    case 'threads':
      platformInstructions = "The post should be short, punchy, conversational, and spark a discussion. Keep it under 500 characters. Minimal hashtags.";
      break;
    case 'x':
      platformInstructions = "The post should be concise, impactful, under 280 characters, and include 1-2 relevant hashtags.";
      break;
    case 'linkedin':
    default:
      platformInstructions = "The post should be highly engaging, include relevant hashtags, use appropriate emojis, and be formatted perfectly for LinkedIn with good spacing.";
      break;
  }

  const parts: any[] = [
    { text: `Generate a ${tone} post for ${platform} based on this prompt: "${prompt}". 
    ${platformInstructions}
    Return ONLY the post text.` }
  ];

  if (referenceImage) {
    const mimeType = referenceImage.match(/data:(.*?);base64/)?.[1] || "image/png";
    const base64Data = referenceImage.split(",")[1];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
  });
  return response.text;
}

export async function generatePostImage(prompt: string, referenceImage?: string | null, platform: string = 'linkedin') {
  let aspectRatio = "16:9";
  if (platform.toLowerCase() === 'instagram') aspectRatio = "1:1";
  if (platform.toLowerCase() === 'threads') aspectRatio = "4:3";

  const parts: any[] = [
    {
      text: `A professional, high-quality, visually striking image suitable for a ${platform} post about: "${prompt}". 
      Style: Modern, clean, cinematic lighting, highly detailed.`,
    },
  ];

  if (referenceImage) {
    const mimeType = referenceImage.match(/data:(.*?);base64/)?.[1] || "image/png";
    const base64Data = referenceImage.split(",")[1];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function analyzePost(content: string, platform: string = 'linkedin') {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this ${platform} post and provide a JSON response with a "score" (0-100) representing its potential engagement on ${platform}, and an array of 2-3 short "suggestions" for improvement. Post: "${content}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function improveText(content: string, platform: string = 'linkedin') {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Improve the following ${platform} post to make it more engaging, viral, and professional for the platform. Fix any awkward phrasing. Return ONLY the improved text: "${content}"`
  });
  return response.text;
}
