

async function test() {
  try {
    console.log("🔑 Logging in as admin...");
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mdibadurrehman1865@gmail.com',
        password: 'rehman'
      })
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      console.error(`Login failed (${loginRes.status}):`, errText);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("✅ Logged in successfully. Token obtained.");

    console.log("🚀 Calling seed-syllabus endpoint...");
    const seedRes = await fetch('http://localhost:5000/api/admin/seed-syllabus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📡 Response Status: ${seedRes.status}`);
    console.log(`📡 Response Headers:`, Object.fromEntries(seedRes.headers.entries()));
    
    const resText = await seedRes.text();
    console.log("📡 Response Body (first 500 chars):");
    console.log(resText.slice(0, 500));

  } catch (err) {
    console.error("Error during test:", err);
  }
}

test();
