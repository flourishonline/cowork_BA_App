// =========================================================
// /api/verify-code.js
// Validates access codes
// =========================================================

// Valid codes are stored in the VALID_ACCESS_CODES env variable
// as a comma-separated list, e.g.:
//   VALID_ACCESS_CODES=FLOURISH-ABCD,FLOURISH-EFGH,FLOURISH-IJKL
//
// Alternatively, you can use the PREFIX_ONLY mode where any
// code matching FLOURISH-XXXX (4+ alphanumeric chars) is accepted.
// Set OPEN_ACCESS=true for open/demo mode (no code required).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessCode } = req.body;

  if (!accessCode) {
    return res.status(400).json({ error: 'Access code is required', valid: false });
  }

  const code = accessCode.trim().toUpperCase();

  // Open access mode (demo / testing)
  if (process.env.OPEN_ACCESS === 'true') {
    return res.status(200).json({ valid: true });
  }

  // Check against explicit list of valid codes
  const validCodes = (process.env.VALID_ACCESS_CODES || '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);

  if (validCodes.length > 0) {
    if (validCodes.includes(code)) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({
        valid: false,
        error: "That code didn't work. Please check it and try again — it should look like FLOURISH-XXXX.",
      });
    }
  }

  // Fallback: accept any FLOURISH-XXXX format (prefix-only mode)
  if (/^FLOURISH-[A-Z0-9]{4,}$/.test(code)) {
    return res.status(200).json({ valid: true });
  }

  return res.status(200).json({
    valid: false,
    error: "That code didn't work. Please check it and try again — it should look like FLOURISH-XXXX.",
  });
}
