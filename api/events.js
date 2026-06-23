import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const result = await pool.query('SELECT * FROM events ORDER BY start_at');
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const e = req.body;

    await pool.query(`
      INSERT INTO events (title, details, lead, contact, note, start_at, end_at, color, is_important)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      e.title, e.details, e.lead, e.contact,
      e.note, e.start_at, e.end_at,
      e.color, e.is_important
    ]);

    res.json({ ok: true });
  }

  if (req.method === 'PUT') {
    const e = req.body;

    await pool.query(`
      UPDATE events SET
        title=$1, details=$2, lead=$3, contact=$4,
        note=$5, start_at=$6, end_at=$7,
        color=$8, is_important=$9,
        updated_at=NOW()
      WHERE id=$10
    `, [
      e.title, e.details, e.lead, e.contact,
      e.note, e.start_at, e.end_at,
      e.color, e.is_important,
      e.id
    ]);

    res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await pool.query('DELETE FROM events WHERE id=$1', [id]);
    res.json({ ok: true });
  }
}
