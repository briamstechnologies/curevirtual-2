const fetch = require('node-fetch');

async function testTriage() {
  try {
    const res = await fetch('http://localhost:5001/api/consultations/pa/triage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId: 'test-patient-123',
        symptoms: 'I have a very severe chest pain radiating to my left arm. I can barely breathe.',
        doctorId: 'test-doctor-123'
      })
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test error:', err);
  }
}

testTriage();
