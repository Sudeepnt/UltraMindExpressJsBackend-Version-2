const supabase = require('../config/supabase');

const createCollection = async (req, res) => {
  // ✅ SECURE: Identity from Clerk Token
  const authenticatedUserId = req.auth.userId;

  const {
    collection_id,      
    category_id,
    collection_name,
    created_at,         
    updated_at          
  } = req.body;

  try {
    // Check for required fields (excluding user_id from body)
    if (!collection_id || !category_id || !collection_name) {
      return res.status(400).json({
        error: 'Missing required fields: collection_id, category_id, or name'
      });
    }

    const { data, error } = await supabase
      .from('collections')
      .insert({
        collection_id: collection_id,
        user_id: authenticatedUserId, // ✅ Using the Clerk ID
        category_id: category_id,
        collection_name: collection_name,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString(),
        source_count: 0,
        is_deleted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error.message);
      throw error;
    }

    res.status(201).json({
      message: 'Collection created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
};

module.exports = { createCollection };
