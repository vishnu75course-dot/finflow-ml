import supabase from './config/supabaseClient.js'

async function testTxInsert() {
  const userId = '26c52566-a492-430e-be27-6c4b76ba4503'
  
  // Try insert with minimal fields
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      amount: 100,
      category: 'Food',
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    }])
    .select()
    .single()
  
  console.log('Insert result:', data)
  console.log('Insert error:', error)
}

testTxInsert()