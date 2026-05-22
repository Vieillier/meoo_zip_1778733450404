const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aakexkggqspgpimfwlkn.supabase.co';
const supabaseKey = 'sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('Fetching profiles...');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(20);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Profiles found:', data.length);
  data.forEach(p => {
    console.log(`ID: ${p.id} | Username: ${p.username} | Role: ${p.role} | Phone: ${p.phone}`);
  });
}

listUsers().catch(console.error);
