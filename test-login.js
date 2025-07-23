const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'Password1!'
      })
    });

    const data = await response.json();
    console.log('Response:', data);
    
    if (response.ok && data.success) {
      console.log('Login successful!');
      console.log('Admin:', data.data.admin);
    } else {
      console.error('Login failed:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testLogin();