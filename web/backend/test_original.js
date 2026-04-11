const geminiService = require('./services/gemini.service');
require('dotenv').config();

async function testOriginal() {
  try {
    console.log("Testing Original Gemini Logic...");
    // The original signature was generateAIResponse(userMessage)
    const response = await geminiService.generateAIResponse("Hello");
    console.log("Success! Response:", response);
  } catch (err) {
    console.error("Original Logic Failed:");
    console.error(err.message);
  }
}

testOriginal();
