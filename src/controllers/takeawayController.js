const supabase = require('../config/supabase');
const { generateEmbedding } = require('../services/embeddingService');

const createTakeaway = async (req, res) => {
  // ✅ SECURE: Identity from Clerk Token
  const authenticatedUserId = req.auth.userId;

  const { 
    takeaway_id,     // from app
    category_id, 
    source_id, 
 
    content,
    created_at,      // from app
    updated_at       // from app
  } = req.body;

  try {
    // Validate required fields
    if (!takeaway_id || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: takeaway_id, content' 
      });
    }

    // 1. Generate embedding
    let embedding = null;
    try {
      embedding = await generateEmbedding(content);
    } catch (embeddingError) {
      console.warn('Warning: Could not generate embedding:', embeddingError.message);
    }

    // 2. Insert Takeaway into Supabase
    const { data: takeawayData, error: takeawayError } = await supabase
      .from('takeaways')
      .insert({
        takeaway_id: takeaway_id,
        user_id: authenticatedUserId, // ✅ Using verified Clerk ID
        category_id: category_id,
        source_id: source_id || null,
      
        content: content,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString(),
        is_deleted: false
      })
      .select()
      .single();

    if (takeawayError) {
      console.error('Supabase Takeaway Error:', takeawayError.message);
      throw takeawayError;
    }

    // 3. Insert Embedding (if generated)
    if (embedding) {
      const { error: embeddingError } = await supabase
        .from('takeaway_embeddings')
        .upsert({
          takeaway_id: takeaway_id,
          user_id: authenticatedUserId, // ✅ Pass verified ID to the embedding table too
          embedding: embedding, 
          updated_at: updated_at || new Date().toISOString()
        }, { onConflict: 'takeaway_id' });

      if (embeddingError) {
        console.error('Error saving embedding (Takeaway saved successfully):', embeddingError);
      }
    }

    res.status(201).json({
      message: 'Takeaway created successfully',
      data: takeawayData
    });

  } catch (error) {
    console.error('Error creating takeaway:', error);
    res.status(500).json({ error: 'Failed to create takeaway' });
  }
};

module.exports = { createTakeaway };
