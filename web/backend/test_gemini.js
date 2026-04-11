const geminiService = require('./services/gemini.service');
require('dotenv').config();

async function testGemini() {
  try {
    console.log("Testing Gemini AI Response...");
    const mockContext = {
      name: "Test User",
      role: "PATIENT",
      age: 25,
      gender: "Male"
    };
    const response = await geminiService.generateAIResponse("Hello, I have a headache", mockContext);
    console.log("Success! Response:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("Gemini Test Failed:");
    console.error(err);
  }
}

testGemini();
