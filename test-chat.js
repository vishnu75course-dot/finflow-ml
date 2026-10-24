const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    // Login with vishnu@gmail.com
    const login = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vishnu@gmail.com', password: 'Vishnu@123' })
    });
    const loginData = await login.json();
    
    if (loginData.data?.access_token) {
      const token = loginData.data.access_token;
      
      // Test chat with user data
      const chatRes = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: "Where did I spend the most money this month?", 
          history: []
        })
      });
      
      const chatData = await chatRes.json();
      console.log('Chat response:', JSON.stringify(chatData, null, 2));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();