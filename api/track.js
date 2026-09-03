import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS: the tracking script runs on your demo sites' own origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { site, event, session_id, referrer } = req.body || {};
    var country = req.headers['x-vercel-ip-country'] || null;
    var city = req.headers['x-vercel-ip-city'] || null;

    if (!site || !event) {
      return res.status(400).json({ error: 'site and event are required' });
    }

    const { error } = await supabase.from('events').insert({
      site: String(site).slice(0, 100),
      event_name: String(event).slice(0, 100),
      session_id: session_id ? String(session_id).slice(0, 100) : null,
      referrer: referrer ? String(referrer).slice(0, 300) : null,
      country: country ? String(country).slice(0, 5) : null,
    });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Insert failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
