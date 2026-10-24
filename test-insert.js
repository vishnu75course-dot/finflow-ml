import supabase from './config/supabaseClient.js'
import { randomUUID } from 'crypto'

async function testInsert() {
  const userId = randomUUID()
  
  // Try insert
  const { data, error } = await supabase
    .from('users')
    .insert([{
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
      monthly_income: 0,
      currency: 'INR'
    }])
    .select()
    .single()
  
  console.log('Insert result:', data)
  console.log('Insert error:', error)
}

testInsert()