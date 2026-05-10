export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
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
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
