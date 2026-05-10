export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { id, debug } = req.query;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Invalid player id" });
  }

  try {
    // ── 1. Fetch profile stats (used for total games/wins) ───────────────────
    const statsRes = await fetch(`https://aoe4world.com/api/v0/players/${id}`, {
      headers: { "Accept": "application/json" }
    });
    if (!statsRes.ok) {
      return res.status(statsRes.status).json({ error: `aoe4world returned ${statsRes.status}` });
    }
    const stats = await statsRes.json();

    // ── 2. Paginate match history for civ stats ──────────────────────────────
    const [rankedCivs, qmCivs] = await Promise.all([
      fetchAllCivStats(id, "rm_solo"),
      fetchAllCivStats(id, "qm_1v1"),
    ]);

    // ── 3. Debug mode ────────────────────────────────────────────────────────
    if (debug === "1") {
      const m = stats.modes || {};
      return res.json({
        profile_id: stats.profile_id,
        name: stats.name,
        rm_1v1_elo_games: m.rm_1v1_elo?.games_count,
        rm_1v1_elo_wins:  m.rm_1v1_elo?.wins_count,
        qm_1v1_games:     m.qm_1v1?.games_count,
        qm_1v1_wins:      m.qm_1v1?.wins_count,
        ranked_civs_sample: rankedCivs.slice(0, 5),
        qm_civs_sample:     qmCivs.slice(0, 5),
      });
    }

    // ── 4. Build response — keep original modes structure, inject civ data ───
    const modes = stats.modes || {};

    // We keep the full original data but patch in accurate civ arrays
    // and expose rm_1v1_elo separately so index.html can read total games.
    const response = {
      ...stats,
      modes: {
        ...modes,
        // Accurate all-time civ lists from match history
        ranked_civs: rankedCivs,
        qm_civs: qmCivs,
      },
    };

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Paginate /games for a given leaderboard, tally wins+games per civ ───────
async function fetchAllCivStats(profileId, leaderboard) {
  const civMap = {};
  const perPage = 50;

  for (let page = 1; page <= 40; page++) {   // 40 pages × 50 = 2000 games max
    const url =
      `https://aoe4world.com/api/v0/players/${profileId}/games` +
      `?leaderboard=${leaderboard}&page=${page}&per_page=${perPage}`;

    let data;
    try {
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!r.ok) break;
      data = await r.json();
    } catch {
      break;
    }

    const games = data.games || [];
    if (games.length === 0) break;

    for (const game of games) {
      // teams is an array of arrays; flatten to find this player
      const allPlayers = (game.teams || []).flat();
      const me = allPlayers.find(p => String(p.profile_id) === String(profileId));
      if (!me) continue;

      const civ = me.civilization;
      if (!civ) continue;

      if (!civMap[civ]) civMap[civ] = { wins: 0, games: 0 };
      civMap[civ].games += 1;
      if (me.result === "win") civMap[civ].wins += 1;
    }

    if (games.length < perPage) break;   // last page reached
  }

  return Object.entries(civMap)
    .map(([civilization, { wins, games }]) => ({
      civilization,
      games_count: games,
      wins_count:  wins,
      win_rate: games > 0 ? Math.round((wins / games) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.games_count - a.games_count);
}
