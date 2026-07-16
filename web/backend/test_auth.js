const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function main() {
  const secret = "536a51b4b303d9ca55235710d4387d7875dc25c288d1512e3b714bd85818aaca6df44443b1f655e5c89e1fe99fe952a671427ad9d153c4bd70c17db72a700d4f";
  // The doctor user we've been testing
  const payload = {
    id: "6af90734-de36-4b3d-ab5f-8337bd3ac18c",
    role: "DOCTOR"
  };
  
  const token = jwt.sign(payload, secret);
  
  const res = await fetch('http://localhost:5001/api/doctor/profile?userId=' + payload.id, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
