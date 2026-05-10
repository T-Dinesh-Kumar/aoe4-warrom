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
      const rm1v1 = data.modes?.rm_1v1 || {};
      const snapshot = {
        profile_id: id,
        name: data.name,
        rm_1v1_elo_games: data.modes?.rm_1v1_elo?.games_count,
        rm_1v1_elo_wins:  data.modes?.rm_1v1_elo?.wins_count,
        rm_1v1_current_season: rm1v1.season,
        rm_1v1_current_civs: (rm1v1.civilizations || []).slice(0, 3),
        rm_1v1_current_civs_total: (rm1v1.civilizations || []).length,
        rm_1v1_previous_seasons_count: (rm1v1.previous_seasons || []).length,
        rm_1v1_previous_seasons: (rm1v1.previous_seasons || []).map(ps => ({
          season: ps.season,
          games_count: ps.games_count,
          wins_count: ps.wins_count,
          win_rate: ps.win_rate,
          _keys: Object.keys(ps),
          civs_count: (ps.civilizations || []).length,
          civs_sample: (ps.civilizations || []).slice(0, 3),
        })),
      };
      return res.status(200).json(snapshot);
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
