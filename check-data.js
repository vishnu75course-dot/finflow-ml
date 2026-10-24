const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    // Login with vishnu@gmail.com
    const login = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vishnu@gmail.com', password: '123456' })
    });
    const loginData = await login.json();
    
    if (loginData.data?.access_token) {
      const token = loginData.data.access_token;
      
      // Check all tables
      const tables = ['budgets', 'goals', 'reminders', 'insights', 'transactions'];
      
      for (const table of tables) {
        const res = await fetch(`http://localhost:3000/api/data/${table}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log(`${table}:`, JSON.stringify(data, null, 2));
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();