import { GoogleGenAI } from "@google/genai";
import { Room } from "../types";
import { Language } from "../translations";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-3-flash-preview';

export const generateWelcomeMessage = async (guestName: string, room: Room, lang: Language): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing. Cannot generate message.";

  const languageName = lang === 'vi' ? 'Vietnamese' : 'English';

  const prompt = `
    You are a helpful hotel concierge AI.
    Write a short, warm, and professional welcome note for a guest named "${guestName}".
    They are staying in Room ${room.number}, which is a ${room.type}.
    The note MUST be written in ${languageName}.
    Keep it under 50 words. Invite them to ask reception if they need anything.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text || "Welcome to our hotel! We hope you enjoy your stay.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Welcome! We are delighted to have you.";
  }
};

export const getMaintenanceAdvice = async (issue: string, lang: Language): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing.";

  const languageName = lang === 'vi' ? 'Vietnamese' : 'English';

  const prompt = `
    You are a hotel maintenance expert.
    A room has the following reported issue: "${issue}".
    Provide a concise, 3-step action plan to verify or temporarily fix this issue before the professional technician arrives.
    The response MUST be written in ${languageName}.
    Keep it safe and practical.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text || "Please contact facility management immediately.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error retrieving maintenance advice.";
  }
};