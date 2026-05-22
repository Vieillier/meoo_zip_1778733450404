const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aakexkggqspgpimfwlkn.supabase.co';
const supabaseKey = 'sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listGuides() {
  console.log('Fetching guide documents...');
  const { data, error } = await supabase
    .from('guide_documents')
    .select('id, chunk_index, content_length, sections')
    .limit(10);

  if (error) {
    console.error('Error fetching guides:', error);
    return;
  }

  console.log('Guides found:', data.length);
  data.forEach(g => {
    console.log(`ID: ${g.id} | Chunk Index: ${g.chunk_index} | Length: ${g.content_length} | Sections: ${g.sections}`);
  });
}

listGuides().catch(console.error);
