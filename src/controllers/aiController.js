const { searchTakeaways, generateAnswer } = require('../services/queryService');
const supabase = require('../config/supabase');

exports.queryAI = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { query, messages, context } = req.body;
    const currentDate = context?.current_date || new Date().toISOString();

    // 1. Get user status and count
    const { data: user } = await supabase
      .from('users')
      .select('plan_active, ai_questions_used')
      .eq('user_id', userId)
      .single();

    // 2. INCREMENT IMMEDIATELY
    // If we don't do this now, and the search fails later, the user gets a "free" attempt
    if (user && !user.plan_active) {
      const newCount = (user.ai_questions_used || 0) + 1;
      await supabase
        .from('users')
        .update({ ai_questions_used: newCount })
        .eq('user_id', userId);
      console.log(`[COUNTER] User ${userId} used question ${newCount}/5`);
    }

    // 3. Perform AI Search (The part that was crashing)
    const { intent, results } = await searchTakeaways(userId, query, {}, messages, currentDate);

    if (intent.type === 'command') {
      return res.json({ success: true, answer: intent.action_code, intent });
    }

    // 4. Generate Answer
    const answer = await generateAnswer(query, results, messages, currentDate);

    res.json({
      success: true,
      answer: answer,
      sources: results,
      intent: intent
    });

  } catch (error) {
    console.error('❌ AI Controller Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

