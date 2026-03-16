
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geslbbwqtkudyubpsock.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlc2xiYndxdGt1ZHl1YnBzb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjAyNDksImV4cCI6MjA4ODMzNjI0OX0.YEuybizyVdcT9yDKZd_J7mfaeOFcC-Ak9CoC9aMgl7w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Fetching a valid client ID...');
    const { data: clients } = await supabase.from('clients').select('id').limit(1);
    const validClient = clients?.[0]?.id;
    console.log('Valid client:', validClient);

    console.log('\nInserting sale with userId="admin" but VALID client...');
    const { error: err1 } = await supabase.from('sales').insert([{
        id: 'test-user-' + Date.now(),
        userId: 'admin',
        clientId: validClient,
        total: 10,
        items: []
    }]);
    console.log('Result for invalid userId:', err1?.message);

    console.log('\nInserting sale with valid userId but INVALID client...');
    const { data: users } = await supabase.from('users').select('id').limit(1);
    const validUser = users?.[0]?.id;
    const { error: err2 } = await supabase.from('sales').insert([{
        id: 'test-client-' + Date.now(),
        userId: validUser,
        clientId: 'invalid-client',
        total: 10,
        items: []
    }]);
    console.log('Result for invalid clientId:', err2?.message);
}

check();
