const axios = require("axios");

async function test() {
  const patientUserId = "ab63d5d3-0dc6-4711-b242-c7c8d4ab8dc6";
  try {
    console.log("Calling local API...");
    // Bypass authentication to test or check if we get a response
    // Wait, the API requires verifyToken (JWT). So we need to call it directly, or let's look at the JWT secret and generate a JWT token first!
    // Or we can just call it and see if we get 401 or 500.
    const token = require("jsonwebtoken").sign(
      { id: patientUserId, role: "PATIENT", type: "USER" },
      "536a51b4b303d9ca55235710d4387d7875dc25c288d1512e3b714bd85818aaca6df44443b1f655e5c89e1fe99fe952a671427ad9d153c4bd70c17db72a700d4f",
      { expiresIn: "1d" }
    );

    const res = await axios.get("http://localhost:5001/api/patient/doctors", {
      params: { patientUserId },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success Response:", res.data);
  } catch (err) {
    console.error("❌ Error response:", err.response?.data || err.message);
  }
}

test();
