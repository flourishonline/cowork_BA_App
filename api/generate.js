// =========================================================
// /api/generate.js
// Generates a complete brand strategy using Claude
// =========================================================

import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── ARCHETYPE DEFINITIONS ───────────────────────────────
const ARCHETYPES = {
  'Adventuress': {
    essence: 'Freedom-seeking, bold, pioneering spirit. Takes the road less travelled and inspires others to take the leap.',
    voice: 'Daring, liberating, energetic, free-spirited, expansive',
    clientFeels: 'Inspired, called to action, fearless, lit up with possibility',
    avoids: 'Predictable, conventional, overly cautious, status quo',
    shadows: 'Can sometimes be reckless or commitment-averse — the shadow is restlessness',
  },
  'Alchemist': {
    essence: 'Transformational, mystical, depth-seeking. Turns lead into gold and helps others do the same.',
    voice: 'Mystical, profound, transformative, potent, layered',
    clientFeels: 'Seen at a soul level, transformed, initiated, changed',
    avoids: 'Surface-level, transactional, formulaic, predictable',
    shadows: 'Can be inaccessible or too esoteric — the shadow is detachment',
  },
  'Badass': {
    essence: 'Fierce, no-nonsense, takes no prisoners. Calls it as she sees it and gives others permission to do the same.',
    voice: 'Direct, fierce, unapologetic, powerful, no-BS',
    clientFeels: 'Called out in the best way, empowered, lit up, activated',
    avoids: 'Wishy-washy, people-pleasing, soft-pedalling, beige',
    shadows: 'Can be abrasive or intimidating — the shadow is aggression',
  },
  'Creatress': {
    essence: 'Creative visionary, expressive, brings beauty and innovation into everything she touches.',
    voice: 'Creative, expressive, visionary, aesthetic, inspired',
    clientFeels: 'Inspired creatively, seen in their artistry, awakened to beauty',
    avoids: 'Boring, formulaic, uncreative, derivative',
    shadows: 'Can be scattered or precious — the shadow is perfectionism',
  },
  'Girl Next Door': {
    essence: 'Relatable, warm, real-talk energy. Feels like a best friend who happens to be brilliant at what they do.',
    voice: 'Warm, relatable, honest, approachable, real',
    clientFeels: 'Like they have a best friend in their corner, seen, understood',
    avoids: 'Pretentious, distant, overly formal, unapproachable',
    shadows: 'Can undervalue herself — the shadow is self-deprecation',
  },
  'Heroine': {
    essence: 'Courageous champion, fights for something bigger than herself, purposeful and mission-driven.',
    voice: 'Courageous, purposeful, inspiring, mission-driven, rallying',
    clientFeels: 'Called to their own heroine journey, purposeful, part of something bigger',
    avoids: 'Small, timid, self-focused, apolitical',
    shadows: 'Can be martyrish — the shadow is self-sacrifice',
  },
  'Lover': {
    essence: 'Heart-centred, passionate, deeply connected. Leads with love and creates profound intimacy.',
    voice: 'Passionate, heart-centred, intimate, devoted, sensual',
    clientFeels: 'Deeply loved and celebrated, seen, held, cherished',
    avoids: 'Cold, transactional, disconnected, clinical',
    shadows: 'Can be codependent — the shadow is neediness',
  },
  'Mischief Maker': {
    essence: 'Playful disruptor, irreverent rule-breaker with a wink. Disrupts the status quo with a smile.',
    voice: 'Playful, irreverent, witty, disruptive, unexpected',
    clientFeels: 'Entertained, shaken up, given permission to play and break rules',
    avoids: 'Boring, too serious, conventional, by-the-book',
    shadows: 'Can be chaotic or uncommitted — the shadow is avoidance',
  },
  'Nurturer': {
    essence: 'Deeply caring, creates safe space, holds others with unwavering compassion and warmth.',
    voice: 'Warm, gentle, compassionate, steady, holding',
    clientFeels: 'Held, safe, nurtured, deeply understood, cared for',
    avoids: 'Cold, rushed, clinical, transactional',
    shadows: 'Can over-give and burn out — the shadow is self-abandonment',
  },
  'Pure Heart': {
    essence: 'Innocent, optimistic, authentically good. Sees the best in people and leads with sincerity.',
    voice: 'Pure, optimistic, sincere, wholesome, hopeful',
    clientFeels: 'Hopeful, renewed, believed in, seen for their goodness',
    avoids: 'Cynical, harsh, complicated, manipulative',
    shadows: 'Can be naive — the shadow is avoidance of complexity',
  },
  'Queen': {
    essence: 'Regal, commanding, powerful. Sets the standard, holds the vision and elevates everyone around her.',
    voice: 'Regal, commanding, powerful, discerning, elevated',
    clientFeels: 'Elevated, seen as worthy of the best, in excellent hands',
    avoids: 'Meek, apologetic, scarcity-minded, common',
    shadows: 'Can be demanding or elitist — the shadow is arrogance',
  },
  'Sage': {
    essence: 'Deeply wise, knowledgeable, trusted guide. Illuminates the path with knowledge and discernment.',
    voice: 'Wise, thoughtful, authoritative, illuminating, measured',
    clientFeels: 'Enlightened, guided, clear, smarter for having worked with you',
    avoids: 'Superficial, preachy, inaccessible, condescending',
    shadows: 'Can be detached from emotion — the shadow is intellectualising',
  },
};

// ─── GENERATE ENDPOINT ────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessCode, formData, retrievalCode } = req.body;

  if (!accessCode || !formData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Verify access code
  if (!isValidCode(accessCode)) {
    return res.status(403).json({ error: 'Invalid access code' });
  }

  try {
    const results = await generateBrandStrategy(formData);

    // Save to KV
    const code = retrievalCode || generateRetrievalCode();
    await kv.set(`session:${code}`, {
      accessCode,
      formData,
      results,
      createdAt: Date.now(),
    }, { ex: 60 * 60 * 24 * 90 }); // 90 days

    return res.status(200).json({ results, retrievalCode: code });
  } catch (err) {
    console.error('Generation error:', err);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}

// ─── BRAND STRATEGY GENERATION ───────────────────────────
async function generateBrandStrategy(fd) {
  const mainArchetype = fd.archetypeMain || '';
  const archetypeData = ARCHETYPES[mainArchetype] || {
    essence: 'Authentic, purposeful, deeply aligned with their values.',
    voice: 'Genuine, clear, compelling',
    clientFeels: 'Seen, understood, supported',
    avoids: 'Generic, inauthentic',
    shadows: '',
  };

  const secondaryArchetype = fd.archetypeSecondary && fd.archetypeSecondary !== 'None / not sure yet'
    ? fd.archetypeSecondary : null;
  const shadowArchetype = fd.archetypeShadow && fd.archetypeShadow !== 'None / not sure yet'
    ? fd.archetypeShadow : null;

  const secondaryContext = secondaryArchetype
    ? `Their secondary archetype is the **${secondaryArchetype}** — ${(ARCHETYPES[secondaryArchetype] || {}).essence || ''} This adds ${(ARCHETYPES[secondaryArchetype] || {}).voice || ''} energy to their brand.`
    : '';

  const shadowContext = shadowArchetype
    ? `Their shadow archetype is the **${shadowArchetype}** — ${(ARCHETYPES[shadowArchetype] || {}).essence || ''} This gives their brand an edge of ${(ARCHETYPES[shadowArchetype] || {}).voice || ''}.`
    : '';

  const prompt = `You are the lead brand strategist at Flourish Online, a business brand coaching company that works with female entrepreneurs and service businesses. You are brilliant at your craft — strategic, insightful, and deeply attuned to authentic brand building based on archetypes.

You are generating a complete, personalised brand strategy for a client. Your job is to make this feel like it was written specifically for THIS person — not a template, not generic, but genuinely tailored to their voice, their archetype, their work, and their words.

==================================================
CLIENT ARCHETYPE PROFILE
==================================================

Primary Archetype: **${mainArchetype}**
Archetype Essence: ${archetypeData.essence}
Brand Voice Should Feel: ${archetypeData.voice}
Clients Feel: ${archetypeData.clientFeels}
Brand Actively Avoids: ${archetypeData.avoids}
${secondaryContext}
${shadowContext}

==================================================
CLIENT INPUTS
==================================================

NAME: ${fd.yourName || ''}
BUSINESS NAME: ${fd.businessName || fd.yourName || ''}
WHAT THEY DO: ${fd.whatYouDo || ''}

THEIR WHY: ${fd.brandWhy || ''}
THEIR VISION: ${fd.brandVision || ''}
THEIR MISSION: ${fd.brandMission || ''}
THEIR BELIEFS: ${fd.beliefs || ''}

CUSTOM VALUES (added in their own words): ${fd.customValues || 'None added'}
ALL SELECTED VALUES: ${fd.allSelectedValues || ''}
TOP 10 VALUES: ${fd.top10Values || ''}
3 CORE VALUES: ${fd.core3Values || ''}

WHAT MAKES THEM UNIQUE: ${fd.uniqueness || ''}
WHAT THEY DO: ${fd.doList || ''}
WHAT THEY DON'T DO: ${fd.dontList || ''}
THEIR SUPERPOWER: ${fd.superpower || ''}
THEIR ARCHNEMESIS (what they fight): ${fd.archnemesis || ''}
BRAND PERSONALITY ADJECTIVES: ${fd.brandPersonality || ''}
WHAT PEOPLE SAY ABOUT THEM: ${fd.brandReputation || ''}

IDEAL CLIENT DESCRIPTION: ${fd.idealClient || ''}
DEMOGRAPHICS: ${fd.clientDemographics || ''}
CLIENT CHALLENGES: ${fd.clientChallenges || ''}
CLIENT MOTIVATIONS: ${fd.clientMotivations || ''}
CLIENT REAL QUOTES: ${fd.clientQuotes || ''}
CLIENT OBJECTIONS: ${fd.clientObjections || ''}

CURRENT/PLANNED OFFERS: ${fd.currentOffers || ''}
WHERE THEY ARE: ${fd.startingPoint || ''}
VOICE ADJECTIVES: ${fd.voiceAdjectives || ''}
KEY MESSAGES: ${fd.keyMessages || ''}
EXISTING TAGLINE IDEAS: ${fd.existingTagline || 'None'}

PAST ACHIEVEMENTS: ${fd.pastAchievements || ''}
FUTURE GOALS: ${fd.futureGoals || ''}
BRAND STORY (their words): ${fd.brandStoryOwn || ''}
DREAM BRAND POSSE: ${fd.brandPosse || ''}

==================================================
YOUR TASK
==================================================

Generate a complete brand strategy. Be specific, personal, and draw directly from their inputs. Write in the voice of their archetype — ${archetypeData.voice}. Reference their actual words back to them where possible.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no preamble, no explanation. Just the JSON.

Use this exact structure:

{
  "brandFoundation": {
    "why": "A polished, powerful 2-3 sentence Why statement that distils their inputs and sounds like them. Make it bold and aligned with the ${mainArchetype} archetype.",
    "vision": "A vivid 2-3 sentence Vision statement. Future-focused, inspiring, archetype-aligned.",
    "mission": "A clear 1-2 sentence Mission statement. Present-tense, action-oriented."
  },
  "values": {
    "core3": ["value1", "value2", "value3"],
    "top10": ["value1", "value2", "value3", "value4", "value5", "value6", "value7", "value8", "value9", "value10"],
    "coreValueStatements": [
      "A bold, brand-specific statement for core value 1 — not generic, pulls from their work and archetype",
      "A bold, brand-specific statement for core value 2",
      "A bold, brand-specific statement for core value 3"
    ]
  },
  "weird": {
    "uniqueness": "2-3 sentences articulating what makes this brand distinctly them. Pull from their inputs, make it specific and ownable.",
    "doList": ["5-7 specific items from their do list, refined and sharpened"],
    "dontList": ["5-7 specific items from their don't list, refined and sharpened"],
    "superpower": "Their superpower in one punchy sentence. Start with 'My superpower is...' or similar.",
    "archnemesisName": "A name for their archnemesis — a 2-4 word label for what they're fighting",
    "archnemesisDescription": "2-3 sentences about the archnemesis — what it is, why it's harmful, and how this brand fights it. Make it vivid and specific.",
    "brandPersonality": ["6 personality traits refined from their input — each 1-3 words, mix warm and sharp"]
  },
  "loveFactor": {
    "whyPeopleChoose": "2-3 sentences on why clients choose this specific person over others. Pull from their unique positioning.",
    "experience": "2-3 sentences describing what it actually feels like to work with this person. Sensory, specific, archetype-aligned.",
    "languageFeel": "A few sentences describing how their language and communication style feels to clients. Use their own adjectives.",
    "brandExperience": "A few sentences on the overall brand experience — what makes every touchpoint feel consistent and them."
  },
  "idealClient": {
    "name": "A memorable name/title for their dream client — e.g. 'The Ready-to-Rise Entrepreneur'",
    "description": "A rich 4-6 sentence portrait of the ideal client — personality, life stage, desires, challenges. Use the client's own language where possible.",
    "demographics": "A clear demographics paragraph — age, location, profession, tech habits, relationship status as relevant.",
    "challenges": ["4-6 specific challenges this client faces — use the client's own language where possible"],
    "motivations": ["4-6 deep desires and motivations — go beyond the surface"],
    "realQuotes": ["3-5 real-sounding client quotes from their input or extrapolated from them"],
    "objectionResponse": "2-3 sentences on the main objections and how this brand addresses them with confidence.",
    "marketingMessages": ["4-6 powerful marketing messages specific to this brand and client — not generic"]
  },
  "taglines": [
    "Tagline option 1 — short, punchy, archetype-aligned",
    "Tagline option 2 — different angle, slightly longer",
    "Tagline option 3 — question or provocation format",
    "Tagline option 4 — benefit-led",
    "Tagline option 5 — most daring option"
  ],
  "messaging": {
    "valueProposition": "2-3 sentences. What makes this business genuinely different and valuable. Be specific — not 'I help you grow your business' but the specific transformation they create.",
    "elevatorPitch": "A 3-4 sentence elevator pitch that would make someone say 'tell me more.' Start with the problem, move to the transformation, land on what makes them different."
  },
  "brandVoice": {
    "voiceChart": [
      {
        "value": "Core value 1",
        "voice": "How the voice sounds because of this value — 3-5 words",
        "means": "What this means in practice — 1 specific sentence",
        "notThis": "What this means they are NOT — 3-5 words"
      },
      {
        "value": "Core value 2",
        "voice": "How the voice sounds because of this value",
        "means": "What this means in practice",
        "notThis": "What this means they are NOT"
      },
      {
        "value": "Core value 3",
        "voice": "How the voice sounds because of this value",
        "means": "What this means in practice",
        "notThis": "What this means they are NOT"
      },
      {
        "value": "Archetype quality (${mainArchetype})",
        "voice": "How the archetype shapes their voice",
        "means": "What this looks like in their content and copy",
        "notThis": "What this brand is emphatically NOT"
      }
    ],
    "verbs": ["8-10 action verbs that sound like this brand — pulled from their language and archetype"],
    "keywords": ["10-12 power words and phrases specific to this brand and niche"],
    "buttonCopy": ["6-8 CTA button ideas — avoid generic 'Click here', make them specific to this brand voice"]
  },
  "brandStory": "A full 3-5 paragraph brand story written in third person. Pull from their past achievements, pivot points, and future vision. Make it compelling, specific, and archetype-aligned. This should feel like the 'About' page of a world-class brand.",
  "socialBio": {
    "short": "A 2-3 sentence Instagram/TikTok bio that grabs attention, says what they do clearly, and sounds exactly like their archetype. Under 150 characters ideally.",
    "long": "A 3-4 paragraph LinkedIn/website bio. Warm opening, clear positioning, social proof from their achievements, compelling close with a call to action. Write it in first person."
  },
  "contentPillars": [
    {
      "pillar": "Pillar 1 name — something specific to this brand, not generic",
      "description": "2-3 sentences on what this pillar covers and why it's perfect for this brand and audience.",
      "postIdeas": ["8-10 specific post ideas for this pillar — not vague, actually usable"]
    },
    {
      "pillar": "Pillar 2 name",
      "description": "2-3 sentences",
      "postIdeas": ["8-10 specific post ideas"]
    },
    {
      "pillar": "Pillar 3 name",
      "description": "2-3 sentences",
      "postIdeas": ["8-10 specific post ideas"]
    },
    {
      "pillar": "Pillar 4 name",
      "description": "2-3 sentences",
      "postIdeas": ["8-10 specific post ideas"]
    }
  ],
  "offerStructure": {
    "review": "2-3 sentences honestly reviewing their current offers — what's working, what could be repositioned, what's missing. Be constructive and specific.",
    "recommendedSuite": [
      {
        "tier": "Entry / Awareness",
        "name": "A name for a low-ticket or free offer that matches their style",
        "description": "2-3 sentences on what this offer is, who it's for, suggested price point, and why it makes sense for this brand."
      },
      {
        "tier": "Core / Transformation",
        "name": "Their main signature offer name",
        "description": "2-3 sentences on this offer, positioning, and why it's the centrepiece."
      },
      {
        "tier": "Premium / Signature",
        "name": "A high-touch or high-ticket offer",
        "description": "2-3 sentences on this premium tier — what makes it premium and who it's for."
      },
      {
        "tier": "Recurring / Community",
        "name": "A recurring revenue offer if relevant",
        "description": "2-3 sentences on a membership, retainer, or community offer."
      }
    ],
    "refinements": ["5-7 specific, actionable suggestions for improving or refining their offers — name things that need changing, not vague suggestions"]
  },
  "ninetyDayPlan": {
    "intro": "A 2-3 sentence personalised intro to their 90-day plan based on where they are (${fd.startingPoint || 'their current stage'}). Make it motivating and specific.",
    "weeks": [
      { "theme": "Week 1-2: [specific theme]", "tasks": ["4-6 specific, actionable tasks for this fortnight"] },
      { "theme": "Week 3-4: [specific theme]", "tasks": ["4-6 specific, actionable tasks"] },
      { "theme": "Week 5-6: [specific theme]", "tasks": ["4-6 specific, actionable tasks"] },
      { "theme": "Week 7-8: [specific theme]", "tasks": ["4-6 specific, actionable tasks"] },
      { "theme": "Week 9-10: [specific theme]", "tasks": ["4-6 specific, actionable tasks"] },
      { "theme": "Week 11-12: [specific theme]", "tasks": ["4-6 specific, actionable tasks"] }
    ]
  }
}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();

  // Extract JSON — handle any accidental markdown wrapping
  let jsonText = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  return JSON.parse(jsonText);
}

// ─── HELPERS ─────────────────────────────────────────────
function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  const cleaned = code.trim().toUpperCase();
  // Accept FLOURISH- followed by 4+ alphanumeric characters
  return /^FLOURISH-[A-Z0-9]{4,}$/.test(cleaned);
}

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
