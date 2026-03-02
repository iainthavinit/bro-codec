// BRO_CODEC Cloudflare Worker — API proxy + Reddit content curation pipeline
// Deploy: cd worker && npx wrangler deploy
// Secrets: GROQ_API_KEY, CEREBRAS_API_KEY

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyName: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  cerebras: {
    url: 'https://api.cerebras.ai/v1/chat/completions',
    keyName: 'CEREBRAS_API_KEY',
    defaultModel: 'llama-3.3-70b',
  },
};

const SUBREDDIT_SEARCHES = [
  { sub: 'Entrepreneur', queries: ['wife', 'girlfriend', 'family sacrifice', 'hustle grind', 'work life balance', 'lonely founder'] },
  { sub: 'cscareerquestions', queries: ['wife', 'girlfriend', 'work weekends', 'no life', 'burnout grind'] },
  { sub: 'startups', queries: ['wife', 'sacrifice', 'runway left', 'cofounders equity'] },
  { sub: 'wallstreetbets', queries: ['yolo', 'wife boyfriend', 'toast bois', 'diamond hands wife'] },
  { sub: 'SideProject', queries: ['quit job', 'while working fulltime', 'obsessed building'] },
  { sub: 'ExperiencedDevs', queries: ['wife', 'work life', 'burned out'] },
];

const HOT_SUBS = ['wallstreetbets', 'Entrepreneur', 'startups', 'SideProject', 'cscareerquestions', 'cryptocurrency'];

// ============ REDDIT FETCHING ============

async function fetchReddit(path) {
  const resp = await fetch(`https://www.reddit.com${path}`, {
    headers: { 'User-Agent': 'BroCodec/1.0 (content curation bot)' },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data?.data?.children || []).map(p => ({
    id: p.data.id, sub: p.data.subreddit, title: p.data.title || '',
    text: (p.data.selftext || '').slice(0, 400), score: p.data.score || 0,
    url: `https://reddit.com${p.data.permalink}`,
  }));
}

async function collectPosts() {
  const allPosts = new Map();
  for (const { sub, queries } of SUBREDDIT_SEARCHES) {
    for (const q of queries) {
      try {
        const posts = await fetchReddit(`/r/${sub}/search.json?q=${encodeURIComponent(q)}&sort=top&t=month&limit=10&restrict_sr=on`);
        for (const p of posts) { if (p.score >= 5 && !allPosts.has(p.id)) allPosts.set(p.id, p); }
      } catch (e) { /* skip */ }
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  for (const sub of HOT_SUBS) {
    try {
      const posts = await fetchReddit(`/r/${sub}/hot.json?limit=15`);
      for (const p of posts) { if (p.score >= 10 && !allPosts.has(p.id)) allPosts.set(p.id, p); }
    } catch (e) { /* skip */ }
    await new Promise(r => setTimeout(r, 1200));
  }
  return Array.from(allPosts.values());
}

// ============ AI ============

async function callAI(env, system, message) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: system }, { role: 'user', content: message }],
      max_tokens: 500, temperature: 0.7,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || null;
}

async function scorePosts(env, posts) {
  const scored = [];
  for (let i = 0; i < posts.length; i += 10) {
    const batch = posts.slice(i, i + 10);
    const batchText = batch.map((p, j) => `${j + 1}. [r/${p.sub}] ${p.title}${p.text ? '\n   ' + p.text.slice(0, 150) : ''}`).join('\n\n');
    const result = await callAI(env,
      `Score each post 1-10 for "oblivious bro energy." Looking for: guy thinks he's winning while accidentally revealing he's terrible. No self-awareness. Score 8-10 = bragging + accidental reveal + zero awareness. Respond ONLY: number. score`,
      batchText
    );
    if (result) {
      for (const line of result.split('\n').filter(l => l.trim())) {
        const match = line.match(/(\d+)\.\s*(\d+)/);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          const score = parseInt(match[2]);
          if (batch[idx] && score >= 6) { batch[idx].broScore = score; scored.push(batch[idx]); }
        }
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return scored;
}

async function distillPosts(env, posts) {
  const distilled = [];
  for (let i = 0; i < posts.length; i += 5) {
    const batch = posts.slice(i, i + 5);
    const batchText = batch.map((p, j) => `${j + 1}. SOURCE: ${p.title}${p.text ? ' — ' + p.text.slice(0, 200) : ''}`).join('\n\n');
    const pass1 = await callAI(env,
      `Rewrite as 1-2 sentence tweets. Guy thinks he's crushing it. Comedy = him not realizing what he just said. Flat delivery. No hashtags/emojis. Wives are props, kids are background noise. He's NEVER sad or self-aware. Output numbered tweets or SKIP.`,
      batchText
    );
    if (pass1) {
      const pass2 = await callAI(env,
        `Review tweets. Kill self-awareness, kill wife having opinions, kill anything that sounds written. He sounds like he's winning. Output numbered tweets or SKIP.`,
        pass1
      );
      const finalText = pass2 || pass1;
      for (const line of finalText.split('\n').filter(l => l.trim())) {
        const match = line.match(/^\d+\.\s*(.+)/);
        if (match && !match[1].includes('SKIP')) {
          const tweet = match[1].trim();
          if (tweet.length > 20 && tweet.length < 280) {
            const srcIdx = parseInt(line.match(/^(\d+)/)[1]) - 1;
            distilled.push({ tweet, source: batch[srcIdx]?.url || 'reddit', broScore: batch[srcIdx]?.broScore || 7, created: new Date().toISOString() });
          }
        }
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return distilled;
}

// ============ KV STORAGE ============

async function getBroBank(kv) { return (await kv.get('tweets', 'json')) || []; }

async function saveBroBank(kv, tweets) {
  await kv.put('tweets', JSON.stringify(tweets.slice(0, 200)));
  await kv.put('lastRun', new Date().toISOString());
}

async function getRandomTweet(kv) {
  const bank = await getBroBank(kv);
  if (!bank.length) return null;
  const weighted = [];
  for (const t of bank) { for (let i = 0; i < (t.broScore || 7); i++) weighted.push(t); }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// ============ CURATION ============

async function runCuration(env) {
  const posts = await collectPosts();
  if (!posts.length) return { collected: 0, scored: 0, distilled: 0 };
  const scored = await scorePosts(env, posts);
  if (!scored.length) return { collected: posts.length, scored: 0, distilled: 0 };
  const distilled = await distillPosts(env, scored);
  const existing = await getBroBank(env.BRO_BANK);
  const existingTexts = new Set(existing.map(t => t.tweet.toLowerCase()));
  const newTweets = distilled.filter(t => !existingTexts.has(t.tweet.toLowerCase()));
  await saveBroBank(env.BRO_BANK, [...newTweets, ...existing]);
  return { collected: posts.length, scored: scored.length, distilled: distilled.length, newAdded: newTweets.length, bankTotal: Math.min(newTweets.length + existing.length, 200) };
}

async function runCurationLite(env) {
  const allPosts = new Map();
  const quickSearches = [
    '/r/Entrepreneur/search.json?q=wife+OR+girlfriend&sort=top&t=year&limit=10&restrict_sr=on',
    '/r/cscareerquestions/search.json?q=wife+OR+girlfriend+OR+burnout&sort=top&t=year&limit=10&restrict_sr=on',
    '/r/startups/search.json?q=wife+OR+family+OR+sacrifice&sort=top&t=year&limit=10&restrict_sr=on',
  ];
  for (const path of quickSearches) {
    try { const posts = await fetchReddit(path); for (const p of posts) { if (p.score >= 5) allPosts.set(p.id, p); } } catch (e) { /* skip */ }
  }
  const posts = Array.from(allPosts.values());
  if (!posts.length) return { error: 'No posts collected', collected: 0 };
  const scored = await scorePosts(env, posts.sort((a, b) => b.score - a.score).slice(0, 10));
  if (!scored.length) return { collected: posts.length, scored: 0, distilled: 0 };
  const distilled = await distillPosts(env, scored.slice(0, 5));
  const existing = await getBroBank(env.BRO_BANK);
  const existingTexts = new Set(existing.map(t => t.tweet.toLowerCase()));
  const newTweets = distilled.filter(t => !existingTexts.has(t.tweet.toLowerCase()));
  await saveBroBank(env.BRO_BANK, [...newTweets, ...existing]);
  return { collected: posts.length, scored: scored.length, distilled: distilled.length, newAdded: newTweets.length, bankTotal: Math.min(newTweets.length + existing.length, 200), samples: newTweets.slice(0, 3).map(t => t.tweet) };
}

// ============ MAIN HANDLER ============

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    if (url.pathname === '/bank' && request.method === 'GET') {
      const tweet = await getRandomTweet(env.BRO_BANK);
      if (!tweet) return new Response(JSON.stringify({ error: 'Bank empty. Run /curate first.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(tweet), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/bank/all' && request.method === 'GET') {
      const bank = await getBroBank(env.BRO_BANK);
      const lastRun = await env.BRO_BANK.get('lastRun');
      return new Response(JSON.stringify({ count: bank.length, lastRun, tweets: bank }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/curate' && request.method === 'GET') {
      const result = await runCurationLite(env);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ endpoints: ['POST / — AI proxy', 'GET /bank — random tweet', 'GET /bank/all — full bank', 'GET /curate — trigger curation'] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      const { system, message, model, provider: reqProvider } = await request.json();
      if (!system || !message) return new Response(JSON.stringify({ error: 'Missing system or message' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const providerName = reqProvider || 'groq';
      const provider = PROVIDERS[providerName] || PROVIDERS.groq;
      const useModel = model || provider.defaultModel;
      const apiKey = env[provider.keyName];

      const apiResponse = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: useModel,
          messages: [{ role: 'system', content: system }, { role: 'user', content: message }],
          max_tokens: 300, temperature: 0.9,
        }),
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        return new Response(JSON.stringify({ error: `${providerName} API error: ${apiResponse.status}`, detail: errText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const data = await apiResponse.json();
      const text = data.choices?.[0]?.message?.content || 'No response';
      return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCuration(env));
  },
};
