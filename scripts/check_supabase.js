
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  console.log('--- Verificando Tabla ticket_config ---')
  const { data, error } = await supabase.from('ticket_config').select('*')
  if (error) {
    console.error('Error al obtener ticket_config:', error.message)
  } else {
    console.log('Número de registros:', data.length)
    if (data.length > 0) {
      console.log('Columnas encontradas:', Object.keys(data[0]))
      console.log('Datos del primer registro:', data[0])
    }
  }

  console.log('\n--- Verificando Tabla sales (para ver si userId es admin) ---')
  const { data: sales, error: sError } = await supabase.from('sales').select('*').limit(1)
  if (!sError && sales.length > 0) {
      console.log('Columnas en sales:', Object.keys(sales[0]))
  }
}

checkColumns()
