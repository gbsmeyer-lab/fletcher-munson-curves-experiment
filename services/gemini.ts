import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getFrequencyInsight = async (freq: number, db: number, phon: number) => {
  if (!apiKey) {
    return "API Key is missing. Unable to generate AI insights. Please configure your environment.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Act as a professor of psychoacoustics.
        The user is exploring the Fletcher-Munson (Equal-Loudness) curves.
        They have selected a point on the graph:
        - Frequency: ${freq} Hz
        - Sound Pressure Level: ${db} dB SPL
        - Approximate Loudness Level: ${phon} Phons

        Explain what a human perceives at this specific point.
        - Is it audible?
        - Does it feel "bass heavy", "piercing", or "faint"?
        - Why is the ear more or less sensitive here compared to 1000 Hz?
        - Mention any relevant real-world sounds that occupy this range (e.g., thunder, mosquito, speech).

        Keep the response concise (under 80 words), engaging, and educational. Do not use markdown formatting like bold or headers, just plain text.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to retrieve insights at this moment. Try exploring other frequencies.";
  }
};