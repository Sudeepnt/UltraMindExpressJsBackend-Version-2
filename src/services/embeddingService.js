const supabase = require('../config/supabase');
const openai = require('../config/openai');
const crypto = require('crypto');

async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI Embedding Error:', error.message);
    throw error;
  }
}

async function embedTakeaway(takeawayId, userId) {
  try {
  
    const { data: takeaway, error: fetchError } = await supabase
      .from('takeaways')
      .select(`
        takeaway_id,
        content,
        created_at,
        category_id,
        source_id,
        categories ( category_name ),
        sources ( source_name )
      `)
      .eq('takeaway_id', takeawayId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error(`Fetch Error [${takeawayId}]:`, fetchError.message);
      return { success: false, error: fetchError.message };
    }

    if (!takeaway) {
      console.log(`Note ${takeawayId} not found. Skipping.`);
      return { success: false, error: 'Note not found' };
    }

    const categoryName = takeaway.categories?.category_name || 'Uncategorized';
    const sourceName = takeaway.sources?.source_name || 'Unknown Source';
    
 

    const createdAtDate = takeaway.created_at ? new Date(takeaway.created_at) : null;
    const createdAtISO = createdAtDate ? createdAtDate.toISOString() : null;
    const dateStr = createdAtDate ? createdAtDate.toDateString() : 'Unknown Date';

    // 3. Updated text context (Category / Source)
    const textToEmbed =
      `Date: ${dateStr}. ` +
      `Context: ${categoryName} / ${sourceName}. ` +
      `Content: ${takeaway.content}`;

    const embedding = await generateEmbedding(textToEmbed);
    if (!embedding) return { success: false, error: 'Embedding failed' };

    const { data: existingRow } = await supabase
      .from('takeaway_embeddings')
      .select('takeaway_id')
      .eq('takeaway_id', takeawayId)
      .maybeSingle();

 
    const payload = {
      takeaway_id: takeawayId,
      user_id: userId,
      embedding,
      content: takeaway.content,
      updated_at: new Date().toISOString(),
      metadata: {
        created_at: createdAtISO,
        category_id: takeaway.category_id,
        source_id: takeaway.source_id,
        category_name: categoryName,
        source_name: sourceName
      }
    };

    let saveError;

    if (existingRow) {
      const { error } = await supabase
        .from('takeaway_embeddings')
        .update(payload)
        .eq('takeaway_id', takeawayId);
      saveError = error;
    } else {
      const { error } = await supabase
        .from('takeaway_embeddings')
        .insert({
          ...payload,
          id: crypto.randomUUID()
        });
      saveError = error;
    }

    if (saveError) {
      console.error(`Save Error [${takeawayId}]:`, saveError.message);
      throw saveError;
    }

    return { success: true, takeawayId };
  } catch (error) {
    console.error(`Critical Error [${takeawayId}]:`, error.message);
    return { success: false, error: error.message };
  }
}

async function embedMultipleTakeaways(takeawayIds, userId) {
  console.log(`Starting embedding for ${takeawayIds.length} notes...`);
  const results = [];
  
  for (const id of takeawayIds) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const result = await embedTakeaway(id, userId);
    if (result.success) {
      results.push(result);
    }
  }
  
  console.log(`Finished embedding. Success: ${results.length}/${takeawayIds.length}`);
  return results;
}

module.exports = { embedTakeaway, embedMultipleTakeaways, generateEmbedding };
