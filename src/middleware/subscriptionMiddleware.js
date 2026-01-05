const supabase = require('../config/supabase');

const verifySubscription = async (req, res, next) => {
  const userId = req.auth.userId;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('plan_active, plan_expires_at, ai_questions_used, last_usage_reset')
      .eq('user_id', userId)
      .single();

    if (error || !user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const expiry = user.plan_expires_at ? new Date(user.plan_expires_at) : null;

    if (user.plan_active && (!expiry || expiry > now)) {
      return next();
    }

    if (user.plan_active && expiry && expiry <= now) {
      await supabase.from('users').update({ plan_active: false }).eq('user_id', userId);
    }

    const lastReset = new Date(user.last_usage_reset || now);
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await supabase
            .from('users')
            .update({ ai_questions_used: 0, last_usage_reset: now.toISOString() })
            .eq('user_id', userId);
        user.ai_questions_used = 0;
    }

    if (user.ai_questions_used < 5) {
        return next();
    }

    res.status(403).json({ 
        error: "Limit Reached", 
        message: "Free limit of 5 questions reached. Please subscribe for unlimited access." 
    });

  } catch (err) {
    res.status(500).json({ error: "Access check failed" });
  }
};

module.exports = verifySubscription;
