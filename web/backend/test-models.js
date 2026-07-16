const fetch = require('node-fetch');
require('dotenv').config({ path: '../../.env' });

(async () => {
  try {
    const key = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.error) {
      console.log("API Error:", data.error);
    } else if (data.models) {
      console.log("Available models:", data.models.map(m => m.name));
    } else {
      console.log("Response:", data);
    }
  } catch(e) {
    console.error(e);
  }
})();
