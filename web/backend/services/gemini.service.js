const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
);

exports.generateAIResponse = async (userMessage) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }

    // Using gemini-flash-lite-latest due to quota limits on other models
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const prompt = `
      You are a smart medical assistant for "CureVirtual".
      User Message: "${userMessage}"

      Task:
      1. Analyze the symptoms or query.
      2. Recommend a medical specialist. 
         - Our available specialties are: General Medicine, Neurology, Cardiology, Ophthalmology, Dentistry.
         - Choose the closest match. Use "General Medicine" for general practitioner or general doctor inquiries.
      3. Provide a helpful, empathetic response to the user.
      4. Determine if the user is explicitly asking to see, meet, book, consult, find, or get a list of doctors. Set "requestDoctorList" to true only if they are asking to consult/see a doctor.
      5. If it's an emergency, warn them explicitly.

      CRITICAL: Return ONLY a valid JSON object. No preamble, no markdown formatting.
      Format:
      {
        "specialty": "string",
        "reply": "string",
        "isEmergency": boolean,
        "requestDoctorList": boolean
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown code blocks and extra chatter
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Find first { and last } to isolate JSON if AI added chatter
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanText);
      throw new Error(`Invalid AI response format: ${cleanText.substring(0, 100)}`);
    }
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error; // Rethrow to be caught by controller with full details
  }
};

exports.triageSymptoms = async (symptoms) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const prompt = `
      You are a medical triage AI for "CureVirtual".
      Evaluate the patient's symptoms: "${symptoms}"

      Task:
      Determine the severity and type of consultation needed based on medical triage principles.

      1. severityLevel: Must be EXACTLY one of: "Urgent", "Emergency", "Routine", "Follow-up"
         - Life-threatening or extreme pain: "Emergency"
         - Needs quick attention but not life-threatening: "Urgent"
         - Standard checkups or minor issues: "Routine"
      2. consultationType: Must be EXACTLY one of: "Prescription", "New Issue", "Routine Check"
      3. riskFlags: An array of strings identifying any potential medical risks (e.g. "Chest Pain", "High Fever", "Allergic Reaction"). Empty array if none.
      4. recommendation: A short 1-2 sentence explanation of your triage decision.
      5. suggestedFollowUp: A string suggesting when the patient should follow up (e.g., "In 3 days", "Immediately", "In 1 week").

      CRITICAL: Return ONLY a valid JSON object.
      Format:
      {
        "severityLevel": "Routine",
        "consultationType": "New Issue",
        "riskFlags": ["string"],
        "recommendation": "string",
        "suggestedFollowUp": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Triage Service Error:", error);
    throw error;
  }
};
