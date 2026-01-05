const supabase = require('../config/supabase');

// 1. Create/Sync User (Called by iOS on first login)
exports.createUser = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const { name, bio, email } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        user_id: clerkUserId,
        email: email,
        name: name || 'User',
        bio: bio || 'Mobile User',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, user: data });
  } catch (error) {
    console.error('❌ Create Error:', error.message);
    res.status(500).json({ error: 'Failed to sync user' });
  }
};

// 2. Update Profile (Name & Bio)
exports.updateProfile = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const { name, bio } = req.body;

  console.log(`👤 Syncing Profile for ${clerkUserId}: ${name}`);

  try {
    const { error } = await supabase
      .from('users')
      .update({
        name: name,
        bio: bio,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', clerkUserId);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Update Error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// 3. Update Plan (Purchases)
exports.updatePlan = async (req, res) => {
  const userId = req.auth.userId; 
  const { planTitle } = req.body; 

  const planDetails = {
    "BOOK": { slug: "book_weekly", days: 7 },
    "LIBRARY": { slug: "library_monthly", days: 30 },
    "LIBRARY +": { slug: "library_plus_yearly", days: 365 }
  };

  const plan = planDetails[planTitle];
  if (!plan) return res.status(400).json({ error: 'Invalid plan title' });

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + plan.days);

  try {
    const { error } = await supabase.from('users').update({
        plan_active: true,
        plan_type: plan.slug,
        plan_expires_at: expiryDate.toISOString(),
        updated_at: new Date().toISOString()
    }).eq('user_id', userId);

    if (error) throw error;
    console.log(`✅ Plan Success: ${userId} -> ${plan.slug}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Plan DB Error:', err.message);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
};
