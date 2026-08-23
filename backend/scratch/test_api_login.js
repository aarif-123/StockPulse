async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'warehouse@example.com',
        password: 'Admin@123'
      })
    });
    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Body:', json);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
