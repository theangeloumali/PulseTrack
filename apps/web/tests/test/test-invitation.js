#!/usr/bin/env node

/**
 * Simple test script to verify the invitation API endpoint
 * Usage: node test-invitation.js
 */

const testInvitation = async () => {
  const API_URL = 'http://localhost:3001/api/invite-user'
  
  // Test data (using a test email)
  const testData = {
    email: 'test-invite@example.com',
    role: 'user',
    companyId: 'test-company-id',
    invitedBy: 'test-admin-id',
    firstName: 'Test',
    lastName: 'User',
    hourlyRate: 50
  }

  try {
    console.log('Testing invitation API endpoint...')
    console.log('API URL:', API_URL)
    console.log('Test data:', JSON.stringify(testData, null, 2))
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    console.log('\nResponse status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    const result = await response.json()
    console.log('\nResponse body:', JSON.stringify(result, null, 2))

    if (response.ok) {
      console.log('\n✅ API endpoint is working correctly!')
    } else {
      console.log('\n❌ API endpoint returned an error')
    }

  } catch (error) {
    console.error('\n💥 Error testing API:', error.message)
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the dev server is running on port 3001')
      console.log('   Run: pnpm dev')
    }
  }
}

// Run the test
testInvitation()
