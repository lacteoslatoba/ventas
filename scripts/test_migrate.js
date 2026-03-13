
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8')
const getEnv = (name) => {
    const match = env.match(new RegExp(`${name}=(.*)`))
    return match ? match[1].trim().replace(/^"(.*)"$/, '$1') : null
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAlter() {
  console.log('Intentando agregar columna businessName a ticket_config...')
  // Esto usualmente fallará con un anon key a menos que esté EXTREMADAMENTE abierto
  const { error } = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS "businessName" text;' })
  if (error) {
    console.error('Error (esto es normal si no hay RPC exec_sql):', error.message)
  } else {
    console.log('¡Increíble! La columna fue añadida (o RPC existe).')
  }
}

testAlter()
