const supabase = require('../config/supabase');

const createSource = async (req, res) => {
  // ✅ SECURE: Identity from Clerk Token
  const authenticatedUserId = req.auth.userId;

  const { 
    source_id,           // from app
    category_id,
    source_name, 
    created_at,          
    updated_at           
  } = req.body;

  try {
  
    if (!source_id || !category_id || !source_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: source_id, category_id, source_name' 
      });
    }

    const { data, error } = await supabase
      .from('sources')
      .insert({
        source_id: source_id,
        user_id: authenticatedUserId, // ✅ Using the verified Clerk ID
        category_id: category_id,
 
        source_name: source_name,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString(),
        takeaway_count: 0,
        is_deleted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error.message);
      throw error;
    }

    res.status(201).json({ 
      message: 'Source created successfully', 
      data: data 
    });

  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({ error: 'Failed to create source' });
  }
};

module.exports = { createSource };
