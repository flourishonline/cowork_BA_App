// =========================================================
// /api/verify-code.js
// Validates access codes
// =========================================================
//
// Three modes (controlled by env vars in Vercel):
//
// 1. OPEN_ACCESS=true          → anyone gets in (great for testing)
// 2. VALID_ACCESS_CODES set    → only those exact codes work
//                                e.g. FLOURISH-ABCD,FLOURISH-EFGH
// 3. Neither set (default)     → any non-empty code works
//                                (open by default until you add codes)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessCode } = req.body;

  if (!accessCode || !accessCode.trim()) {
    return res.status(400).json({ error: 'Access code is required', valid: false });
  }

  const code = accessCode.trim().toUpperCase();

  // Mode 1: Open access (testing / launch)
  if (process.env.OPEN_ACCESS === 'true') {
    return res.status(200).json({ valid: true });
  }

  // Mode 2: Check against an explicit list of valid codes
  const validCodes = (process.env.VALID_ACCESS_CODES || '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);

  if (validCodes.length > 0) {
    if (validCodes.includes(code)) {
      return res.status(200).json({ valid: true });
    }
    return res.status(200).json({
      valid: false,
      error: "That code didn't work. Please check it and try again.",
    });
  }

  // Mode 3: Default — accept any non-empty code
  // (Remove this once you add VALID_ACCESS_CODES to your env vars)
  return res.status(200).json({ valid: true });
}
