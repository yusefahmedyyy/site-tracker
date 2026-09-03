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
      .select('site, event_name, session_id, country, city, created_at')
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

    // Country + city breakdown
    var countryGrouped = {};
    for (var i = 0; i < data.length; i++) {
      var row2 = data[i];
      var countryKey = row2.site + '::' + (row2.country || 'Unknown') + '::' + (row2.city || 'Unknown');
      if (!countryGrouped[countryKey]) {
        countryGrouped[countryKey] = { site: row2.site, country: row2.country || 'Unknown', city: row2.city || 'Unknown', count: 0 };
      }
      countryGrouped[countryKey].count += 1;
    }
    var countries = Object.values(countryGrouped).sort(function (a, b) {
      return a.site === b.site ? b.count - a.count : a.site.localeCompare(b.site);
    });

    // Per-site summary: unique visitors (distinct sessions that fired 'view')
    // plus a full engagement funnel and note-open count.
    var siteMap = {};
    for (var k = 0; k < data.length; k++) {
      var r = data[k];
      if (!siteMap[r.site]) {
        siteMap[r.site] = {
          site: r.site,
          visitorSet: {},
          view: 0,
          engaged_30s: 0,
          engaged_2min: 0,
          engaged_5min: 0,
          opened_note: 0,
          other: 0,
          lastSeen: r.created_at,
        };
      }
      var s = siteMap[r.site];
      if (r.session_id) { s.visitorSet[r.session_id] = true; }
      if (s.hasOwnProperty(r.event_name)) {
        s[r.event_name] += 1;
      } else {
        s.other += 1;
      }
      if (r.created_at > s.lastSeen) { s.lastSeen = r.created_at; }
    }
    var sites = Object.keys(siteMap).map(function (siteName) {
      var s = siteMap[siteName];
      return {
        site: s.site,
        visitors: Object.keys(s.visitorSet).length,
        view: s.view,
        engaged_30s: s.engaged_30s,
        engaged_2min: s.engaged_2min,
        engaged_5min: s.engaged_5min,
        opened_note: s.opened_note,
        other: s.other,
        lastSeen: s.lastSeen,
      };
    }).sort(function (a, b) {
      return new Date(b.lastSeen) - new Date(a.lastSeen);
    });

    return res.status(200).json({ rows: rows, countries: countries, sites: sites });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
