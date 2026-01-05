const supabase = require('../config/supabase');
const openai = require('../config/openai');
const { generateEmbedding } = require('./embeddingService');
const chrono = require('chrono-node');

const AI_MODEL = 'gpt-4o-mini';

async function parseDateRange(query, referenceDate) {
  try {
    const baseDate = referenceDate ? new Date(referenceDate) : new Date();
    const dates = chrono.parse(query, baseDate);
    if (dates.length > 0) {
      const parsed = dates[0];
      return {
        start: parsed.start.date().toISOString(),
        end: parsed.end ? parsed.end.date().toISOString() : baseDate.toISOString()
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function interpretQuery(query, metadata, currentDate) {
  try {
 
    const { categories = [], sources = [], notes = [] } = metadata;
    
 
    const systemPrompt = `You are a query interpreter. Analyze and return JSON:

{"intent":"search|list|count|summary|greeting","filters":{"time_range":"today|this_week|this_month|null","categories":null,"sources":null},"search_terms":"text","needs_embedding":true|false}

User has ${notes.length} notes. Categories: ${categories.join(', ')}. Sources: ${sources.join(', ')}. Today: ${new Date(currentDate).toDateString()}.

Examples:
"what did I learn this week" → {"intent":"summary","filters":{"time_range":"this_week"},"needs_embedding":false}
"show takeaways added today" → {"intent":"list","filters":{"time_range":"today"},"needs_embedding":false}
"tell me about money" → {"intent":"search","search_terms":"money","needs_embedding":true}`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300
    });

    const interpretation = JSON.parse(response.choices[0].message.content);
    console.log(`🧠 Interpreted:`, JSON.stringify(interpretation));
    return interpretation;

  } catch (error) {
    console.error('Interpretation error:', error.message);
    return {
      intent: 'search',
      filters: {},
      search_terms: query,
      needs_embedding: true
    };
  }
}

async function getAllUserMetadata(userId) {
  try {
 
    const { data: takeawaysData, error } = await supabase
      .from('takeaways')
      .select('takeaway_id, content, category_id, source_id, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Metadata error:', error.message);
      return { notes: [], categories: [], sources: [] };  
    }

    const categoryIds = [...new Set(takeawaysData.map(t => t.category_id).filter(Boolean))];
    
    const sourceIds = [...new Set(takeawaysData.map(t => t.source_id).filter(Boolean))];

    console.log(`📊 Raw IDs - Categories: ${categoryIds.length}, Sources: ${sourceIds.length}`);

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('category_id, category_name')
      .in('category_id', categoryIds.length > 0 ? categoryIds : ['none'])
      .eq('is_deleted', false);

 

    const { data: sourcesData } = await supabase
      .from('sources')
      .select('source_id, source_name')
      .in('source_id', sourceIds.length > 0 ? sourceIds : ['none'])
      .eq('is_deleted', false);

    const categoryMap = new Map((categoriesData || []).map(c => [c.category_id, c.category_name]));
   
    const sourceMap = new Map((sourcesData || []).map(s => [s.source_id, s.source_name]));

    const notes = takeawaysData.map(row => ({
      takeaway_id: row.takeaway_id,
      content: row.content,
      created_at: row.created_at,
      category_name: categoryMap.get(row.category_id) || null,
 
      source_name: sourceMap.get(row.source_id) || null
    }));

    const categories = [...new Set([...categoryMap.values()])];
 
    const sources = [...new Set([...sourceMap.values()])];

    console.log(`📊 Final - ${categories.length} categories, ${sources.length} sources`);

    return { notes, categories, sources };

  } catch (error) {
    console.error('Metadata error:', error.message);
    return { notes: [], categories: [], sources: [] };
  }
}

function applyTimeFilter(notes, timeRange, currentDate) {
  if (!timeRange || timeRange === 'null') return notes;
  
  const now = new Date(currentDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return notes.filter(note => {
    const noteDate = new Date(note.created_at);
    
    if (timeRange === 'today') {
      return noteDate >= today;
    } else if (timeRange === 'this_week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return noteDate >= weekStart;
    } else if (timeRange === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return noteDate >= monthStart;
    } else if (timeRange === 'last_7_days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return noteDate >= sevenDaysAgo;
    }
    return true;
  });
}

async function searchTakeaways(userId, query, contextFilter, history, currentDate) {
  try {
    console.log(`🔍 Query: "${query}"`);
    
    const metadata = await getAllUserMetadata(userId);
    const interpretation = await interpretQuery(query, metadata, currentDate);
    
    let filteredNotes = [...metadata.notes];
    
    if (interpretation.filters && interpretation.filters.time_range) {
      filteredNotes = applyTimeFilter(filteredNotes, interpretation.filters.time_range, currentDate);
      console.log(`⏰ Time filtered: ${filteredNotes.length} notes`);
    }
    
    let results = [];
    
    if (interpretation.needs_embedding && interpretation.search_terms) {
      const queryEmbedding = await generateEmbedding(interpretation.search_terms);
      
      const { data, error } = await supabase.rpc('match_takeaways', {
        query_embedding: Array.from(queryEmbedding), 
        match_threshold: 0.10,
        match_count: 50,
        filter_user_id: userId
      });

      if (!error && data) {
        const embeddingResults = data.map(r => ({
          takeaway_id: r.takeaway_id,
          content: r.content,
          metadata: r.metadata,
          similarity: parseFloat(r.similarity) || 0
        })).filter(r => r.similarity > 0.08);
        
        const filteredIds = new Set(filteredNotes.map(n => n.takeaway_id));
        results = embeddingResults.filter(r => filteredIds.has(r.takeaway_id));
        
        console.log(`🔎 Embedding: ${embeddingResults.length} → ${results.length}`);
      }
    } else {
      results = filteredNotes.map(n => ({
        takeaway_id: n.takeaway_id,
        content: n.content,
        metadata: {
          created_at: n.created_at,
          category_name: n.category_name,
    
          source_name: n.source_name
        },
        similarity: 1.0
      }));
      console.log(`📋 Direct: ${results.length} notes`);
    }
    
    return {
      intent: interpretation,
      results,
      metadata
    };

  } catch (error) {
    console.error('Search error:', error.message);
    const metadata = await getAllUserMetadata(userId);
    return { intent: { intent: 'search' }, results: [], metadata };
  }
}

async function generateAnswer(query, context, metadata, interpretation, history, currentDate) {
  try {
 
    const { categories = [], sources = [], notes = [] } = metadata;
    
    console.log(`🤖 Answer: ${context?.length || 0} results`);
    
    if (interpretation.intent === 'greeting') {
      const greetings = [
        "Hey! 👋 How can I help with your notes today?",
        "Hello! 😊 What would you like to explore?",
        "Hi there! Ready to search your notes? 📝"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    const hasTimeFilter = interpretation.filters && interpretation.filters.time_range && interpretation.filters.time_range !== 'null';

    const systemPrompt = `You are Ultra Mynd AI - intelligent notes assistant.

Database: ${notes.length} notes, ${categories.length} categories, ${sources.length} sources.
Today: ${new Date(currentDate).toDateString()}

FORMATTING RULES:
${hasTimeFilter ? '- **IMPORTANT**: Show dates in brackets [Dec 25, 2025] for time-based queries' : '- Show dates when relevant'}
- Be conversational, helpful
- Format lists with numbers (1., 2., 3...)
- Keep answers 3-8 sentences
- Use 😊 📝 sparingly

When listing notes from time periods, ALWAYS format like:
"Here's what you learned this week:

1. [Dec 23] Money knowledge is necessary - Think and Grow Rich
2. [Dec 24] Compound interest insight - Finance Notes"`;

    let userMessage = `Query: "${query}"\nType: ${interpretation.intent}\n`;
    if (hasTimeFilter) {
      userMessage += `TIME FILTER: ${interpretation.filters.time_range} - SHOW DATES IN BRACKETS!\n`;
    }
    userMessage += `\nCategories: ${categories.join(', ') || 'None'}\n`;
    
    userMessage += `Sources: ${sources.join(', ') || 'None'}\n\n`;
    
    if (context && context.length > 0) {
      userMessage += `NOTES (${context.length}):\n\n`;
      const notesList = context.slice(0, 20).map((n, i) => {
        const date = n.metadata?.created_at 
          ? new Date(n.metadata.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Recent';
        const cat = n.metadata?.category_name || 'Uncategorized';
  
        const src = n.metadata?.source_name || 'Unknown';
        return `${i + 1}. [${date}] ${cat} | ${src}\n"${n.content}"`;
      }).join('\n\n');
      userMessage += notesList;
    } else {
      userMessage += `No exact matches. User has ${notes.length} total notes.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 800
    });

    const answer = response.choices[0].message.content.trim();
    console.log(`✅ ${answer.length} chars`);
    return answer;

  } catch (error) {
    console.error('AI error:', error.message);
    return "I'm having trouble right now. Try again! 😊";
  }
}

module.exports = { searchTakeaways, generateAnswer };
