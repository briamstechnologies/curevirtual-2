const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "536a51b4b303d9ca55235710d4387d7875dc25c288d1512e3b714bd85818aaca6df44443b1f655e5c89e1fe99fe952a671427ad9d153c4bd70c17db72a700d4f";
const TEST_USER_ID = "6e0157bc-0ee2-4806-9d62-5a38fb26dfdf";

async function runTest() {
  const token = jwt.sign({ id: TEST_USER_ID, role: "DOCTOR" }, JWT_SECRET, { expiresIn: "1h" });
  console.log("✅ Generated temporary JWT token for testing.");

  // Look for test.jpg or test.png in Downloads folder
  const downloadsFolder = path.join(require('os').homedir(), 'Downloads');
  let imagePath = path.join(downloadsFolder, 'test.jpg');
  if (!fs.existsSync(imagePath)) {
    imagePath = path.join(downloadsFolder, 'test.png');
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Error: Neither test.jpg nor test.png found in ${downloadsFolder}`);
    process.exit(1);
  }

  console.log(`✅ Found image at: ${imagePath}`);

  // Create FormData
  const form = new FormData();
  form.append('userId', TEST_USER_ID);
  form.append('firstName', 'Test');
  form.append('lastName', 'Doctor');
  form.append('specialization', 'Cardiology');
  form.append('qualifications', 'MD');
  form.append('licenseNumber', 'LIC-TEST-123');
  form.append('yearsOfExperience', '10');
  form.append('consultationFee', '150');
  form.append('timezone', 'UTC');
  form.append('profileImage', fs.createReadStream(imagePath));

  try {
    console.log("🚀 Sending PUT request to http://localhost:5001/api/doctor/profile...");
    const response = await axios.put('http://localhost:5001/api/doctor/profile', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log("✅ Success! Backend responded with:", response.status);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Request Failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTest();
