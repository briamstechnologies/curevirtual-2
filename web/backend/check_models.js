const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  try {
    // There isn't a direct listModels in the client usually, 
    // but we can try to hit a known model or search docs
    console.log("Attempting to use gemini-1.5-flash with default config...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Success with gemini-1.5-flash");
  } catch (err) {
    console.error("Failed with gemini-1.5-flash:", err.message);
    
    try {
      console.log("Attempting to use gpt-3.5-turbo? No, this is Gemini. Attempting gemini-pro...");
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("test");
      console.log("Success with gemini-pro");
    } catch (err2) {
      console.error("Failed with gemini-pro:", err2.message);
    }
  }
}

listModels();
