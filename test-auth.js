import supabase from './config/supabaseClient.js'

async function testAuth() {
  console.log('Testing Supabase Auth...')
  
  const testEmail = `test_${Date.now()}@example.com`
  
  // Test signup
  console.log('\n1. Testing signup...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'password123',
    options: {
      data: { name: 'Test User' },
      emailRedirectTo: 'http://localhost:3000'
    }
  })
  console.log('Signup:', signUpError ? 'Error: ' + signUpError.message : 'Success')
  console.log('User:', signUpData.user?.id)
  console.log('Session:', signUpData.session?.access_token ? 'Created' : 'None (email confirmation needed)')

  // Test signin
  console.log('\n2. Testing signin...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'password123'
  })
  console.log('Signin:', signInError ? 'Error: ' + signInError.message : 'Success')
  if (signInData.session) {
    console.log('Access token:', signInData.session.access_token.substring(0, 20) + '...')
    console.log('Refresh token:', signInData.session.refresh_token.substring(0, 20) + '...')
    
    // Test getUser
    console.log('\n3. Testing getUser...')
    const { data: { user }, error: userError } = await supabase.auth.getUser(signInData.session.access_token)
    console.log('getUser:', userError ? 'Error: ' + userError.message : 'Success')
    console.log('User:', user?.email)
  }
  
  // Test password reset
  console.log('\n4. Testing password reset request...')
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail)
  console.log('Reset request:', resetError ? 'Error: ' + resetError.message : 'Success')

  console.log('\nAll tests completed!')
}

testAuth()