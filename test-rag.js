// Script de prueba para verificar que RAG funciona
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRAG() {
  console.log('🧪 Probando sistema RAG...\n');

  // 1. Verificar que la tabla document_embeddings existe
  console.log('1. Verificando tabla document_embeddings...');
  const { data: tables, error: tablesError } = await supabase
    .from('document_embeddings')
    .select('*')
    .limit(1);

  if (tablesError) {
    console.error('❌ Error al acceder a document_embeddings:', tablesError.message);
    console.log('   → Asegúrate de haber ejecutado la migración: 20251104000000_add_vector_embeddings.sql');
    return;
  }
  console.log('✅ Tabla document_embeddings existe\n');

  // 2. Verificar que la función match_document_embeddings existe
  console.log('2. Verificando función match_document_embeddings...');
  const { data: funcTest, error: funcError } = await supabase.rpc('match_document_embeddings', {
    query_embedding: new Array(1536).fill(0), // Vector dummy
    match_threshold: 0.7,
    match_count: 1,
    filter_document_ids: null,
  });

  if (funcError) {
    console.error('❌ Error al llamar match_document_embeddings:', funcError.message);
    console.log('   → Asegúrate de haber ejecutado la migración completa');
    return;
  }
  console.log('✅ Función match_document_embeddings existe\n');

  // 3. Verificar documentos existentes
  console.log('3. Verificando documentos existentes...');
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, filename, processing_status, extracted_text')
    .limit(5);

  if (docsError) {
    console.error('❌ Error al obtener documentos:', docsError.message);
    return;
  }

  console.log(`✅ Encontrados ${documents?.length || 0} documentos`);
  if (documents && documents.length > 0) {
    documents.forEach(doc => {
      console.log(`   - ${doc.filename} (${doc.processing_status})`);
      if (doc.extracted_text) {
        console.log(`     Texto: ${doc.extracted_text.substring(0, 50)}...`);
      }
    });
  }
  console.log('');

  // 4. Verificar embeddings existentes
  console.log('4. Verificando embeddings existentes...');
  const { data: embeddings, error: embError } = await supabase
    .from('document_embeddings')
    .select('id, document_id, content_index')
    .limit(5);

  if (embError) {
    console.error('❌ Error al obtener embeddings:', embError.message);
    return;
  }

  console.log(`✅ Encontrados ${embeddings?.length || 0} embeddings`);
  if (embeddings && embeddings.length > 0) {
    embeddings.forEach(emb => {
      console.log(`   - Embedding ${emb.id} para documento ${emb.document_id} (chunk ${emb.content_index})`);
    });
  } else {
    console.log('   ⚠️  No hay embeddings aún. Sube un PDF para generar embeddings.');
  }

  console.log('\n✅ Pruebas completadas. El sistema RAG está listo.');
}

testRAG().catch(console.error);

