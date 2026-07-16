const geminiService = require('./services/gemini.service');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' }); // or wherever .env is

(async () => {
  try {
    const result = await geminiService.generateAIResponse("mjh general doctor sy milna ha");
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error);
  }
})();


