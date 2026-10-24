const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    // Login with the existing user from your screenshot (vishnu@gmail.com)
    const login = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vishnu@gmail.com', password: '123456' })
    });
    const loginData = await login.json();
    console.log('Login:', JSON.stringify(loginData, null, 2));

    if (loginData.data?.access_token) {
      const token = loginData.data.access_token;
      
      // Test budgets POST
      const bgPost = await fetch('http://localhost:3000/api/data/budgets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Food', limit: 5000 })
      });
      console.log('POST Budget:', await bgPost.json());

      // Test goals POST
      const goalsPost = await fetch('http://localhost:3000/api/data/goals', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Laptop', target: 50000, current: 0 })
      });
      console.log('POST Goal:', await goalsPost.json());

      // Test reminders POST
      const remPost = await fetch('http://localhost:3000/api/data/reminders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Electric Bill', amount: 1500, category: 'Utilities', dueDate: '2026-06-30' })
      });
      console.log('POST Reminder:', await remPost.json());

      // Test insights POST
      const insightsPost = await fetch('http://localhost:3000/api/data/insights', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tip', message: 'Test insight', category: 'Food' })
      });
      console.log('POST Insight:', await insightsPost.json());
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();