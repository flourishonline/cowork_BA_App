// =========================================================
// /api/load.js
// Loads a saved session from Vercel KV
// =========================================================

import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { retrievalCode } = req.body;

  if (!retrievalCode) {
    return res.status(400).json({ error: 'Retrieval code is required' });
  }

  const code = retrievalCode.trim().toUpperCase();

  try {
    const session = await kv.get(`session:${code}`);

    if (!session) {
      return res.status(200).json({
        found: false,
        error: "We couldn't find a session with that code. Please check it and try again.",
      });
    }

    return res.status(200).json({
      found: true,
      accessCode: session.accessCode,
      formData: session.formData || null,
      results: session.results || null,
    });
  } catch (err) {
    console.error('Load error:', err);
    return res.status(500).json({ error: 'Failed to load session. Please try again.' });
  }
}
