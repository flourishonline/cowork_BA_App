// =========================================================
// /api/save-progress.js
// Saves form progress to Vercel KV
// =========================================================

import { kv } from '@vercel/kv';

function generateRetrievalCode() {
  const words = [
    'ROSE','WILD','MOON','FIRE','GOLD','SILK','BOLD','GLOW',
    'DAWN','SAGE','JADE','RUBY','PURE','FREE','RISE','FLUX',
    'BLOOM','BRAVE','WAVE','SPARK','GRACE','STORM','LIGHT','DUSK',
    'RIVER','VELVET','EMBER','CROWN','PEARL','FORGE',
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${pick()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessCode, formData, retrievalCode } = req.body;

  if (!accessCode || !formData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const code = retrievalCode || generateRetrievalCode();

  try {
    // Load existing session to preserve results if already generated
    let existing = null;
    try {
      existing = await kv.get(`session:${code}`);
    } catch (e) {}

    await kv.set(`session:${code}`, {
      accessCode,
      formData,
      results: existing?.results || null,
      savedAt: Date.now(),
    }, { ex: 60 * 60 * 24 * 90 }); // 90 days TTL

    return res.status(200).json({ success: true, retrievalCode: code });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: 'Failed to save progress. Please try again.' });
  }
}
