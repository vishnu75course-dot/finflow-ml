

async function testRegister() {
  const email = `user_${Date.now()}@gmail.com`;
  console.log(`Attempting to register user: ${email}`);
  
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Local Test User',
        email: email,
        password: 'Password123!'
      })
    });
    
    const status = res.status;
    const body = await res.text();
    console.log(`Response Status: ${status}`);
    console.log(`Response Body: ${body}`);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testRegister();
