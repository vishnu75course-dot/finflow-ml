import supabase from './config/supabaseClient.js'

async function testExistingUser() {
  console.log('Testing with existing user...')
  
  // First check if we can sign in with the existing user from the custom users table
  // Note: This user was created in the custom users table with bcrypt, not Supabase Auth
  // So Supabase Auth won't recognize them
  
  // Let's test the admin create user (for server-side registration)
  console.log('\n1. Testing admin createUser...')
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: 'vishnu@gmail.com',
    password: '123456',
    email_confirm: true,
    user_metadata: { name: 'Vishnu' }
  })
  console.log('Create:', createError ? 'Error: ' + createError.message : 'Success')
  console.log('User:', createData.user?.id)
  
  if (!createError) {
    // Test signin
    console.log('\n2. Testing signin...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'vishnu@gmail.com',
      password: '123456'
    })
    console.log('Signin:', signInError ? 'Error: ' + signInError.message : 'Success')
    if (signInData.session) {
      console.log('Access token:', signInData.session.access_token.substring(0, 20) + '...')
    }
  }

  console.log('\nAll tests completed!')
}

testExistingUser()