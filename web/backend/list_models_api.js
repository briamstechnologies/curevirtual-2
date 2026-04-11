const fetch = require('node-fetch');
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Status:", response.status);
    if (data.models) {
      console.log("Available Models:");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("No models found or error response:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("List Fetch failed:", err);
  }
}

listModels();
