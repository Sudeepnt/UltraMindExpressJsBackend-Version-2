const supabase = require('../config/supabase');
const { embedMultipleTakeaways } = require('../services/embeddingService');

const toDbTime = (timestamp) => (!timestamp || timestamp === "0" || timestamp === 0) ? new Date().toISOString() : new Date(Number(timestamp)).toISOString();
const toAppTime = (isoString) => !isoString ? 0 : new Date(isoString).getTime();

exports.syncData = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const { last_synced, changes, username, reading_level, email } = req.body;

  try {
    await supabase.from('users').upsert({
        user_id: clerkUserId,
        name: username,
        bio: reading_level,
        email: email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (changes?.tags?.length > 0) await syncTags(clerkUserId, changes.tags);
    if (changes?.categories?.length > 0) await syncCategories(clerkUserId, changes.categories);
 
    if (changes?.sources?.length > 0) await syncSources(clerkUserId, changes.sources);
    if (changes?.takeaways?.length > 0) await syncTakeaways(clerkUserId, changes.takeaways);
    if (changes?.takeaway_tags?.length > 0) await syncTakeawayTags(clerkUserId, changes.takeaway_tags);

    const serverChanges = await getServerChanges(clerkUserId, last_synced);

    if (changes?.takeaways?.length > 0) {
      const takeawayIds = changes.takeaways.filter(t => !t.isdeleted).map(t => t.takeawayid); 
      if (takeawayIds.length > 0) {
        embedMultipleTakeaways(takeawayIds, clerkUserId)
          .then(() => console.log(`✅ Embeddings updated`))
          .catch(err => console.error('❌ Embedding error:', err));
      }
    }

    res.json({
      success: true,
      data: {
        new_sync_time: Date.now(),
        ...serverChanges
      }
    });

  } catch (error) {
    console.error('❌ Sync logic failure:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

async function syncTags(user_id, tags) {
  const data = tags.map(t => ({
    tag_id: t.tagid, user_id, tag_name: t.tagname,
    is_deleted: t.isdeleted, updated_at: toDbTime(t.updatedat)
  }));
  await supabase.from('tags').upsert(data, { onConflict: 'tag_id' });
}

async function syncCategories(user_id, categories) {
  const data = categories.map(c => ({
    category_id: c.categoryid, user_id, category_name: c.categoryname,
    is_deleted: c.isdeleted, updated_at: toDbTime(c.updatedat)
  }));
  await supabase.from('categories').upsert(data, { onConflict: 'category_id' });
}

 
 
async function syncSources(user_id, sources) {
  const data = sources.map(s => ({
    source_id: s.sourceid, user_id, category_id: s.categoryid,
 
    source_name: s.sourcename,
    is_deleted: s.isdeleted, updated_at: toDbTime(s.updatedat)
  }));
  await supabase.from('sources').upsert(data, { onConflict: 'source_id' });
}

async function syncTakeaways(user_id, takeaways) {
  const data = takeaways.map(t => ({
    takeaway_id: t.takeawayid, 
    user_id, 
    category_id: t.categoryid,
 
    source_id: t.sourceid || null, 
    content: t.content,
    is_deleted: t.isdeleted, 
    updated_at: toDbTime(t.updatedat)
  }));
  await supabase.from('takeaways').upsert(data, { onConflict: 'takeaway_id' });
}

async function syncTakeawayTags(user_id, items) {
  const data = items.map(i => ({
    takeaway_tag_id: i.takeawaytagid, user_id, takeaway_id: i.takeawayid,
    tag_id: i.tagid, is_deleted: i.isdeleted, updated_at: toDbTime(i.updatedat)
  }));
  await supabase.from('takeaway_tags').upsert(data, { onConflict: 'takeaway_tag_id' });
}

async function getServerChanges(user_id, lastSynced) {
  const lastSyncISO = toDbTime(lastSynced || 0);
 
  const [cat, src, tak, tags, takTags] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', user_id).gt('updated_at', lastSyncISO),
    supabase.from('sources').select('*').eq('user_id', user_id).gt('updated_at', lastSyncISO),
    supabase.from('takeaways').select('*').eq('user_id', user_id).gt('updated_at', lastSyncISO),
    supabase.from('tags').select('*').eq('user_id', user_id).gt('updated_at', lastSyncISO),
    supabase.from('takeaway_tags').select('*').eq('user_id', user_id).gt('updated_at', lastSyncISO)
  ]);

  return {
    categories: cat.data?.map(c => ({ 
      categoryid: c.category_id, 
      categoryname: c.category_name, 
      isdeleted: c.is_deleted, 
      updatedat: String(toAppTime(c.updated_at)) 
    })),
   
    sources: src.data?.map(s => ({ 
      sourceid: s.source_id, 
      categoryid: s.category_id, 
      sourcename: s.source_name, 
      isdeleted: s.is_deleted, 
      updatedat: String(toAppTime(s.updated_at)) 
    })),
    takeaways: tak.data?.map(t => ({ 
      takeawayid: t.takeaway_id, 
      content: t.content, 
      categoryid: t.category_id, 
      sourceid: t.source_id, 
      isdeleted: t.is_deleted, 
      updatedat: String(toAppTime(t.updated_at)) 
    })),
    tags: tags.data?.map(t => ({ 
      tagid: t.tag_id, 
      tagname: t.tag_name, 
      isdeleted: t.is_deleted, 
      updatedat: String(toAppTime(t.updated_at)) 
    })),
    takeaway_tags: takTags.data?.map(tt => ({ 
      takeawaytagid: tt.takeaway_tag_id, 
      takeawayid: tt.takeaway_id, 
      tagid: tt.tag_id, 
      isdeleted: tt.is_deleted, 
      updatedat: String(toAppTime(tt.updated_at)) 
    }))
  };
}

exports.getData = async (req, res) => { res.json({ success: true, message: 'OK' }); };
exports.syncImages = async (req, res) => { res.json({ success: true, message: 'OK' }); };
