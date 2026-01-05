const supabase = require('../config/supabase');

const createSourceImage = async (req, res) => {
  // ✅ SECURE: Identity from Clerk Token
  const authenticatedUserId = req.auth.userId;

  const { 
    source_id,
    sourceimg_id,       // Get from app (generated UUID)
    image_url,          // The URL of the uploaded image
    uploaded_at,        
    updated_at          
  } = req.body;

  try {
    // Check for required fields (Removed user_id from body check)
    if (!sourceimg_id || !source_id || !image_url) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceimg_id, source_id, image_url' 
      });
    }

    const { data, error } = await supabase
      .from('source_images') 
      .insert({
        sourceimg_id: sourceimg_id,
        user_id: authenticatedUserId, // ✅ Using the verified Clerk ID
        source_id: source_id,
        image_url: image_url,
        uploaded_at: uploaded_at || new Date().toISOString(),
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
      message: 'Source image created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error creating source image:', error);
    res.status(500).json({ error: 'Failed to create source image' });
  }
};

module.exports = { createSourceImage };
