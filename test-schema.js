import supabase from './config/supabaseClient.js'

async function checkSchema() {
  // Check transactions table
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)
  
  console.log('Transactions sample:', txData)
  console.log('Transactions error:', txError)
  
  // Check if description column exists
  const { data: columns, error: colError } = await supabase
    .rpc('get_columns', { table_name: 'transactions' })
    .catch(() => ({ data: null, error: 'RPC not available' }))
  
  console.log('Columns:', columns)
  console.log('Col error:', colError)
}

checkSchema()