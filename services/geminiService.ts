import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from '../constants';
import { ScrapedProduct } from '../types';

// Initialize Gemini Client with hardcoded API key
const getApiKey = async (): Promise<string> => {
  // Hardcoded API key for now
  return "AIzaSyBTdRqIfrhX615Dke6SKJepcZWw3eBHU7g";
};

const getAiClient = async (): Promise<GoogleGenAI> => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }
  return new GoogleGenAI({ apiKey });
};

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
      text: `Act as a strict Quality Assurance AI for a Fashion Virtual Try-On application. Your job is to filter out any user images that will result in a poor or failed try-on generation.

Analyze the provided image against the following **Mandatory Acceptance Criteria**. If ANY of these criteria are failed, the image must be marked invalid.

1.  **Single Subject Requirement:**
    - The image must contain exactly **ONE** primary human subject.
    - Reject if there are multiple people, background crowds that are in focus, or significant "ghost" reflections in mirrors.

2.  **Strict Body Framing & Visibility:**
    - **Vertical Coverage:** The person must be visible from the **top of the head** down to **at least the knees**.
    - Reject "Selfies" (Head/Shoulders only).
    - Reject "Waist-up" shots.
    - Reject if the head is cut off by the frame edge.
    - The subject should occupy at least 50% of the image height (not too far away).

3.  **Pose & Orientation:**
    - **Frontal Pose Only:** The subject must be facing the camera directly. Shoulders and hips must be roughly parallel to the image plane.
    - Reject Side Profiles (looking left/right).
    - Reject Back shots (facing away).
    - Reject extreme angles (high-angle looking down or low-angle looking up).
    - Arms should be clearly visible (ideally not crossed excessively covering the chest).

4.  **Occlusion & Clarity:**
    - The torso and legs must be clear of obstructions.
    - Reject if the person is holding large objects (bags, boxes, pets) that block the body.
    - Reject if the person is holding a phone in front of their chest/body (mirror selfies).
    - Reject if lighting is extremely poor (silhouette) or blurry.

5.  **Safety & Content Policy:**
    - **Realism:** Must be a real photograph (No AI avatars, cartoons, mannequins, or sketches).
    - **Decency:** The subject must be appropriately clothed (No underwear/lingerie shots, no explicit nudity).
    - **Safety:** No weapons, drugs, hate symbols, or illegal acts.

**Output Format:**
Return a purely JSON object with no markdown formatting:
{
  "isValid": boolean,
  "error_code": "FRAME_CROP" | "BAD_POSE" | "MULTIPLE_PEOPLE" | "OCCLUSION" | "SAFETY" | "NONE",
  "reason": "A concise, user-friendly error message explaining exactly what is wrong (e.g., 'Please stand further back; we need to see you from head to knees.'). If valid, return 'Perfect'."
}`
    }
  ];

  try {
    const ai = await getAiClient();
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
    const ai = await getAiClient();
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