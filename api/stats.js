import { createClient } from '@supabase/supabase-js';

// Uses the service_role key so it can read despite RLS blocking the anon key.
// Never expose this key in client-side code.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const secret = req.query.key;
  if (!process.env.DASHBOARD_SECRET || secret !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('site, event_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Query failed' });
    }

    // Aggregate: group by site + event_name, count, and track the latest timestamp
    const grouped = {};
    for (const row of data) {
      const key = `${row.site}::${row.event_name}`;
      if (!grouped[key]) {
        grouped[key] = {
          site: row.site,
          event_name: row.event_name,
          count: 0,
          last_seen: row.created_at,
        };
      }
      grouped[key].count += 1;
      if (row.created_at > grouped[key].last_seen) {
        grouped[key].last_seen = row.created_at;
      }
    }

    const rows = Object.values(grouped).sort((a, b) =>
      a.site === b.site
        ? a.event_name.localeCompare(b.event_name)
        : a.site.localeCompare(b.site)
    );

    return res.status(200).json({ rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
