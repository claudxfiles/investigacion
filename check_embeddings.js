const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmbeddings() {
  // Check if document_embeddings table exists and has data
  const { data, error, count } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: false })
    .limit(5);
  
  if (error) {
    console.error('Error checking embeddings:', error);
    return;
  }
  
  console.log(`Total embeddings found: ${count}`);
  console.log('Sample embeddings:', JSON.stringify(data, null, 2));
}

checkEmbeddings();
