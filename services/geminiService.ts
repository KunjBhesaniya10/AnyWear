import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from '../constants';
import { ScrapedProduct } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data.split(',')[1], // Remove the data:image/xxx;base64, prefix
      mimeType
    },
  };
};

// ---------------------------------------------------------
// NEW: Image Validation (Safety & Quality Check)
// ---------------------------------------------------------
export const validateUserImage = async (base64Image: string): Promise<{ isValid: boolean; reason?: string }> => {
  const parts = [
    fileToGenerativePart(base64Image, "image/jpeg"),
    {
      text: `Analyze this image for a virtual try-on application profile. 
      
      Strict Safety & Quality Rules:
      1. Is it a real photo of a human? (No cartoons, no objects).
      2. Is the person appropriately covered? (No explicit nudity).
      3. Is the body visible from at least knees up? (Full body preferred).
      4. Is the content safe, legal, and appropriate for general audiences? (No violence, hate symbols, gore, or illegal acts).
      
      Return a JSON object: { "isValid": boolean, "reason": "string explaining why if invalid, or 'OK' if valid" }`
    }
  ];

  try {
    // Note: responseMimeType is NOT supported for gemini-2.5-flash-image, 
    // so we must parse the text manually.
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
    });

    let text = response.text;
    if (!text) throw new Error("No response from validation model");

    // Clean potential markdown code blocks from the response
    text = text.replace(/```json\n?|```/g, '').trim();

    const result = JSON.parse(text);
    return result;

  } catch (error) {
    console.error("Validation Error:", error);
    // If API fails or parsing fails, we default to rejection for safety.
    return { isValid: false, reason: "Could not verify image safety. Please try again." };
  }
};

// ---------------------------------------------------------
// Existing Generation Logic
// ---------------------------------------------------------
export const generateTryOn = async (
  userImageBase64: string,
  top?: ScrapedProduct,
  bottom?: ScrapedProduct
): Promise<string> => {
  
  const parts: any[] = [];

  // 1. Add User Image (The Canvas)
  parts.push(fileToGenerativePart(userImageBase64, "image/jpeg"));

  // 2. Add Clothing Images (The Paint)
  let descriptionText = "";

  if (top) {
    try {
      const response = await fetch(top.imageUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      parts.push(fileToGenerativePart(base64, "image/jpeg"));
      descriptionText += `\nTop Details: ${top.description}`;
    } catch (e) {
      console.error("Failed to load top image", e);
      descriptionText += `\nTop Details: ${top.title} (Image load failed, use description)`;
    }
  }

  if (bottom) {
    try {
      const response = await fetch(bottom.imageUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      parts.push(fileToGenerativePart(base64, "image/jpeg"));
      descriptionText += `\nBottom Details: ${bottom.description}`;
    } catch (e) {
      console.error("Failed to load bottom image", e);
      descriptionText += `\nBottom Details: ${bottom.title} (Image load failed, use description)`;
    }
  }

  // 3. The Strict "Nano Banana" Generation Prompt
  const systemPrompt = `
System Instruction: You are a high-fidelity Virtual Try-On engine. Your goal is to composite specific clothing items onto a specific user photo while preserving the rest of the image.

Strict Constraints:
- Ground Truth: The provided clothing images are the absolute truth for texture, pattern, logos, and color. Do NOT generate a "similar" shirt. You must wrap the actual pixels of the source clothing image onto the user's body.
- Partial Try-On: If only a Top is provided, you MUST strictly preserve the user's original pants/skirt. If only a Bottom is provided, you MUST strictly preserve the user's original shirt/top. Do NOT change items that are not provided.
- Body Preservation: Do NOT alter the user's face, body shape, skin tone, or background. Only the area covered by the NEW clothing should be modified (inpainting).
- Fabric Physics: Use the description text below only to understand how the fabric behaves. Do not let the text override the visual design of the clothing images.

Task: Generate a photorealistic image of the user [User_Image_Reference] wearing the clothing items provided.

${descriptionText}

Pose: Maintain original user pose exactly.
Lighting: Match the clothing lighting to the user's environment.
`;

  parts.push({ text: systemPrompt });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
    });

    // Iterate to find the image part
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};