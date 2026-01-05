const supabase = require('../config/supabase');

const createTag = async (req, res) => {
  // ✅ SECURE: Identity from Clerk Token
  const authenticatedUserId = req.auth.userId;

  const { 
    tag_id,          // from app
    tag_name,
    created_at,      // from app
    updated_at       // from app
  } = req.body;

  try {
    // Validate required fields (Removed user_id from body check)
    if (!tag_id || !tag_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: tag_id, tag_name' 
      });
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        tag_id: tag_id,
        user_id: authenticatedUserId, // ✅ Using the verified Clerk ID
        tag_name: tag_name,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString(),
        is_deleted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error.message);
      throw error;
    }

    res.status(201).json({
      message: 'Tag created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
};

module.exports = { createTag };
