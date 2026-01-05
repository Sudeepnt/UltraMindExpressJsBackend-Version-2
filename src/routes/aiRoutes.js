const express = require('express');
const router = express.Router();
const { embedMultipleTakeaways } = require('../services/embeddingService');
const { searchTakeaways, generateAnswer } = require('../services/queryService');
const verifySubscription = require('../middleware/subscriptionMiddleware');

router.post('/embed', async (req, res) => {
  const authenticatedUserId = req.auth.userId;
  const { takeaway_ids } = req.body;
  
  if (!takeaway_ids || !Array.isArray(takeaway_ids)) {
    return res.status(400).json({ success: false, error: 'takeaway_ids array required' });
  }

  try {
    const results = await embedMultipleTakeaways(takeaway_ids, authenticatedUserId);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/query', verifySubscription, async (req, res) => {
  const authenticatedUserId = req.auth.userId;
  const { query, context_filter, messages, context } = req.body; 
  
  if (!query) {
    return res.json({
      success: false,
      answer: "Please provide a query",
      error: "Query required",
      sources: [],
      intent: { search_query: "" }
    });
  }

  try {
    console.log(`📥 Query: "${query}"`);

    const currentDate = context?.current_date || new Date().toISOString();
    const history = (messages || []).map(m => ({
      role: m.role || 'user',
      content: m.content || ''
    })).filter(h => h.content);

    const searchResults = await searchTakeaways(
      authenticatedUserId, 
      query, 
      context_filter || {}, 
      history,
      currentDate
    );

    const answer = await generateAnswer(
      query, 
      searchResults.results || [], 
      searchResults.metadata || {},
      searchResults.intent || {},
      history,
      currentDate
    );

    const sources = (searchResults.results || []).slice(0, 20).map(r => ({
      takeaway_id: String(r.takeaway_id || ''),
      content: String(r.content || ''),
      metadata: {
        created_at: r.metadata?.created_at || null,
        source_name: r.metadata?.source_name || null,
        category_name: r.metadata?.category_name || null,
        collection_name: r.metadata?.collection_name || null
      },
      similarity: Number(r.similarity) || 0.0
    }));

    console.log(`✅ Success: ${sources.length} sources`);

    return res.json({
      success: true,
      answer: String(answer || "I'm ready to help!"),
      error: null,
      sources: sources,
      intent: {
        search_query: String(query || '')
      }
    });

  } catch (error) {
    console.error('💥 Route error:', error.message, error.stack);
    
    return res.json({
      success: false,
      answer: "I'm having trouble right now. Please try again! 😊",
      error: null,
      sources: [],
      intent: {
        search_query: String(query || '')
      }
    });
  }
});

module.exports = router;
