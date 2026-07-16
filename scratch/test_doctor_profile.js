const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = '536a51b4b303d9ca55235710d4387d7875dc25c288d1512e3b714bd85818aaca6df44443b1f655e5c89e1fe99fe952a671427ad9d153c4bd70c17db72a700d4f';

const token = jwt.sign(
  { id: 'ab63d5d3-0dc6-4711-b242-c7c8d4ab8dc6', role: 'DOCTOR', email: 'ahmedali.64048@gmail.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

axios.get('http://localhost:5001/api/consultations/pa/doctor-consultations', {
  headers: { Authorization: 'Bearer ' + token }
}).then(res => {
  console.log('OK:', res.status, res.data);
}).catch(err => {
  console.log('ERROR:', err.response ? err.response.status : err.message);
  if (err.response) {
    console.log('DATA:', err.response.data);
  }
});
