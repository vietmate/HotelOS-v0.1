
import { GoogleGenAI } from "@google/genai";
import { Room } from "../types";
import { Language } from "../translations";

// Initialize Gemini client with API Key from process.env
// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-3-flash-preview';

/**
 * Generates a warm welcome message for a guest using Gemini AI.
 */
export const generateWelcomeMessage = async (guestName: string, room: Room, lang: Language): Promise<string> => {
  if (!process.env.API_KEY) return "Error: API Key is missing. Cannot generate message.";

  const languageName = lang === 'vi' ? 'Vietnamese' : 'English';

  try {
    // Correct usage of generateContent with model name and systemInstruction in config
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Write a welcome note for ${guestName} staying in Room ${room.number} (${room.type}).`,
      config: {
        systemInstruction: `You are a helpful hotel concierge AI.
        Write a short, warm, and professional welcome note.
        The note MUST be written in ${languageName}.
        Keep it under 50 words. Invite them to ask reception if they need anything.`,
      },
    });
    
    // Use response.text property directly
    return response.text || "Welcome to our hotel! We hope you enjoy your stay.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Welcome! We are delighted to have you.";
  }
};

/**
 * Provides maintenance advice for a reported room issue.
 */
export const getMaintenanceAdvice = async (issue: string, lang: Language): Promise<string> => {
  if (!process.env.API_KEY) return "Error: API Key is missing.";

  const languageName = lang === 'vi' ? 'Vietnamese' : 'English';

  try {
    // Correct usage of generateContent with systemInstruction for reasoning tasks
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `A room has the following reported issue: "${issue}". Provide guidance in ${languageName}.`,
      config: {
        systemInstruction: `You are a hotel maintenance expert.
        Provide a concise, 3-step action plan to verify or temporarily fix this issue before the professional technician arrives.
        The response MUST be written in ${languageName}.
        Keep it safe and practical.`,
      },
    });

    // Use response.text property directly
    return response.text || "Please contact facility management immediately.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error retrieving maintenance advice.";
  }
};