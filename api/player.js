export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { id, debug } = req.query;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Invalid player id" });
  }

  try {
    const url = `https://aoe4world.com/api/v0/players/${id}`;
    const upstream = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `aoe4world returned ${upstream.status}` });
    }
    const data = await upstream.json();

    // ?debug=1 returns a trimmed snapshot so we can inspect real field names
    if (debug === "1") {
      const modes = data.modes || {};
      const snapshot = {};
      for (const [modeKey, modeVal] of Object.entries(modes)) {
        if (!modeVal) continue;
        snapshot[modeKey] = {
          _topLevelKeys: Object.keys(modeVal),
          games_count: modeVal.games_count,
          wins_count: modeVal.wins_count,
          wins: modeVal.wins,
          _civSample: (modeVal.civilizations || []).slice(0, 2),
          _seasonCount: (modeVal.seasons || []).length,
          _seasonSample: (modeVal.seasons || []).slice(0, 2).map(s => ({
            season: s.season,
            _keys: Object.keys(s),
            games_count: s.games_count,
            wins_count: s.wins_count,
            wins: s.wins,
            _civSample: (s.civilizations || []).slice(0, 2),
          })),
        };
      }
      return res.status(200).json({ profile_id: id, name: data.name, modes: snapshot });
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
