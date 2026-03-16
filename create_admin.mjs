
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geslbbwqtkudyubpsock.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlc2xiYndxdGt1ZHl1YnBzb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjAyNDksImV4cCI6MjA4ODMzNjI0OX0.YEuybizyVdcT9yDKZd_J7mfaeOFcC-Ak9CoC9aMgl7w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
    console.log('Ensuring "admin" user exists in DB (using minimal columns)...');
    // Using columns found in previous inspect: id, name, pin (and others like phone, vehicle if needed)
    const { error } = await supabase.from('users').upsert([
        { id: 'admin', name: 'Administrador', pin: '5151' }
    ]);

    if (error) {
        console.error('Error creating admin:', error.message);
    } else {
        console.log('Admin user "admin" created/updated successfully in Supabase.');
    }
}

createAdmin();
