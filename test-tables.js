import supabase from './config/supabaseClient.js'

async function testTables() {
  // List tables by trying common ones
  const tables = ['users', 'transactions', 'budgets', 'goals', 'profiles']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
    
    console.log(`${table}:`, error ? 'ERROR - ' + error.message : (data ? `OK (${data.length} rows)` : 'OK (empty)'))
  }
}

testTables()