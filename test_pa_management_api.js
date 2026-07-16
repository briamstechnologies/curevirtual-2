const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "Briam$Technologies#2026@SuperSecretKey!";

const token = jwt.sign({ id: 'doc-id', role: 'DOCTOR' }, JWT_SECRET, { expiresIn: '1h' });

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
