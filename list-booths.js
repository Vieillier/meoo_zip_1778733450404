const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aakexkggqspgpimfwlkn.supabase.co';
const supabaseKey = 'sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBooths() {
  console.log('Fetching booths...');
  const { data, error } = await supabase
    .from('exhibitor_booths')
    .select('id, booth_number, exhibitor_name, booth_category, booth_area, booth_height')
    .limit(10);

  if (error) {
    console.error('Error fetching booths:', error);
    return;
  }

  console.log('Booths found:', data.length);
  data.forEach(b => {
    console.log(`ID: ${b.id} | Booth: ${b.booth_number} | Category: ${b.booth_category} | Area: ${b.booth_area} | Height: ${b.booth_height} | Exhibitor: ${b.exhibitor_name}`);
  });
}

listBooths().catch(console.error);
