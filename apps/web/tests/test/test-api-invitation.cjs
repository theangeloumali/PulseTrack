#!/usr/bin/env node

// Test the actual API invitation endpoint
const fetch = require('node-fetch');

async function testApiInvitation() {
  try {
    console.log('🧪 Testing API invitation endpoint...\n');

    // You'll need to get a valid session token first
    // For now, let's test if the API endpoint is accessible
    const response = await fetch('http://localhost:3001/api/invite-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'carions46@gmail.com',
        role: 'user',
        companyId: 'test-company-123',
        invitedBy: 'test-admin-123',
        firstName: 'Angelo',
        lastName: 'Carions',
        hourlyRate: 50
      })
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.status === 401) {
      console.log('\n⚠️  Expected 401 - API requires authentication');
      console.log('   This is normal - the API properly requires a valid user session');
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testApiInvitation();
