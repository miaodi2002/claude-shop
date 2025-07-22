// Test API authentication and CRUD operations

async function testAPI() {
  const baseURL = 'http://localhost:3000'
  
  try {
    // 1. Login to get auth token
    console.log('🔐 Logging in...')
    const loginResponse = await fetch(`${baseURL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Password1!' // Default password
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }
    
    const loginData = await loginResponse.json()
    const authToken = loginData.data.token
    console.log('✅ Logged in successfully')
    
    // 2. Create a test Claude account
    console.log('\n📝 Creating Claude account...')
    const createResponse = await fetch(`${baseURL}/api/v1/admin/claude-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        apiKey: 'sk-ant-api03-test-key-123456789',
        accountName: 'API Test Account',
        email: 'apitest@example.com',
        organization: 'API Test Org',
        tier: 'PRO',
        usageLimit: 50000
      })
    })
    
    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Create failed: ${createResponse.status} - ${error}`)
    }
    
    const createdAccount = await createResponse.json()
    console.log('✅ Account created:', createdAccount.data.id)
    
    // 3. List accounts
    console.log('\n📋 Listing accounts...')
    const listResponse = await fetch(`${baseURL}/api/v1/admin/claude-accounts`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    
    if (!listResponse.ok) {
      throw new Error(`List failed: ${listResponse.status}`)
    }
    
    const listData = await listResponse.json()
    console.log(`✅ Found ${listData.data.length} accounts`)
    
    // 4. Update the account
    console.log('\n📝 Updating account...')
    const updateResponse = await fetch(`${baseURL}/api/v1/admin/claude-accounts/${createdAccount.data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        accountName: 'Updated API Test Account',
        tier: 'ENTERPRISE'
      })
    })
    
    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status}`)
    }
    
    console.log('✅ Account updated')
    
    // 5. Delete the account
    console.log('\n🗑️  Deleting account...')
    const deleteResponse = await fetch(`${baseURL}/api/v1/admin/claude-accounts/${createdAccount.data.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    
    if (!deleteResponse.ok) {
      const error = await deleteResponse.text()
      throw new Error(`Delete failed: ${deleteResponse.status} - ${error}`)
    }
    
    console.log('✅ Account deleted')
    
    console.log('\n✨ All API tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAPI()