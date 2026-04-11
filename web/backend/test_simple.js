const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testSimple() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Using gemini-pro which is very common
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-pro!");
    console.log(result.response.text());
  } catch (err) {
    console.error("Failed with gemini-pro:", err.message);
    
    try {
      const model15 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result15 = await model15.generateContent("Hello");
      console.log("Success with gemini-1.5-flash!");
      console.log(result15.response.text());
    } catch (err2) {
      console.error("Failed with gemini-1.5-flash:", err2.message);
    }
  }
}

testSimple();
