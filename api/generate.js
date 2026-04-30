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
YOUR TASK — READ THIS CAREFULLY
==================================================

Generate a complete brand strategy. Be specific, personal, and draw directly from their inputs.

ARCHETYPE INTEGRATION RULES — THIS IS CRITICAL:
- The ${mainArchetype} archetype is not just background context. It must visibly shape the language, tone, framing and specific word choices in EVERY section.
- Name the archetypes explicitly in the archetypeProfile section and reference them naturally (not forcibly) in brandFoundation, weird, loveFactor, brandStory, socialBio, and contentPillars.
- The ${mainArchetype} voice (${archetypeData.voice}) must be audible throughout. Someone reading this strategy should be able to feel which archetype it was built for.
${secondaryArchetype ? `- The ${secondaryArchetype} secondary archetype adds ${(ARCHETYPES[secondaryArchetype]||{}).voice||''} to the mix — this should show up as a modifier in voice, offers, and content pillars.` : ''}
${shadowArchetype ? `- The ${shadowArchetype} shadow archetype gives this brand its edge and depth — reference it when describing what makes the brand surprising, complex, or magnetic.` : ''}
- Every tagline option should be audibly ${mainArchetype} in its energy.
- The 90-day plan should reflect how a ${mainArchetype} would naturally build momentum (not a generic checklist).

IMPORTANT: Return ONLY a valid JSON object. No markdown, no preamble, no explanation. Just the JSON.

Use this exact structure:

{
  "archetypeProfile": {
    "combinationTitle": "A memorable 3-6 word title for this specific archetype blend — e.g. 'The Fierce Nurturer', 'The Visionary Sage', 'The Wild Alchemist'. Make it feel like a brand identity in itself.",
    "combinationSummary": "3-4 sentences explaining what this specific archetype combination creates. How do the main${secondaryArchetype ? ', secondary' : ''}${shadowArchetype ? ' and shadow' : ''} archetypes interact and amplify each other? What does this combination make possible that a single archetype couldn't? Be specific about the blend — don't describe each archetype in isolation.",
    "primaryInBrand": "2-3 sentences on exactly how the ${mainArchetype} archetype shows up in THIS person's brand, based on their specific inputs. Reference their actual work, their words, their offers. Not generic archetype description — specific to them.",
    ${secondaryArchetype ? `"secondaryInBrand": "2-3 sentences on how the ${secondaryArchetype} secondary archetype modifies or layers onto the primary. What new dimension does it add to this specific brand? Where does it show up most strongly?",` : '"secondaryInBrand": null,'}
    ${shadowArchetype ? `"shadowInBrand": "2-3 sentences on how the ${shadowArchetype} shadow archetype gives this brand its edge, complexity, or unexpected quality. What makes this brand surprising or magnetic because of this shadow?",` : '"shadowInBrand": null,'}
    "archetypeInAction": [
      "6 highly specific, practical ways this archetype blend shows up in day-to-day brand decisions — content tone, offer design, client interactions, visual choices, language patterns. Each one should be actionable and specific to this combination, not generic."
    ],
    "watchOuts": [
      "3 things to watch for given this archetype mix — tendencies that can undermine brand consistency or client attraction if not managed. Be direct and honest."
    ]
  },
  "brandFoundation": {
    "why": "A polished, powerful 2-3 sentence Why statement that distils their inputs and unmistakably sounds like a ${mainArchetype}. Make it bold, specific, and archetype-aligned — someone should be able to feel the ${mainArchetype} energy in the language.",
    "vision": "A vivid 2-3 sentence Vision statement. Future-focused, inspiring, shaped by the ${mainArchetype} worldview.",
    "mission": "A clear 1-2 sentence Mission statement. Present-tense, action-oriented, with the ${mainArchetype} voice audible."
  },
  "values": {
    "core3": ["value1", "value2", "value3"],
    "top10": ["value1", "value2", "value3", "value4", "value5", "value6", "value7", "value8", "value9", "value10"],
    "coreValueStatements": [
      "A bold, specific statement for core value 1 — rooted in their work AND their ${mainArchetype} archetype. Not generic. Pull from their actual inputs.",
      "A bold, specific statement for core value 2 — same rules.",
      "A bold, specific statement for core value 3 — same rules."
    ]
  },
  "weird": {
    "uniqueness": "2-3 sentences on what makes this brand distinctly theirs. Reference the archetype combination explicitly — e.g. 'The combination of [Primary] and [Secondary] means...' Pull from their specific inputs.",
    "doList": ["5-7 specific items refined from their do list — sharpened through the lens of their archetype"],
    "dontList": ["5-7 specific items refined from their don't list — these should feel like natural ${mainArchetype} boundaries"],
    "superpower": "Their superpower in one punchy sentence that sounds like a ${mainArchetype}. Start with 'My superpower is...' or similar.",
    "archnemesisName": "A vivid 2-4 word name for what they fight — make it feel like something a ${mainArchetype} would name their enemy",
    "archnemesisDescription": "2-3 sentences — what it is, why it's harmful, and how this brand's archetype combination is uniquely positioned to fight it.",
    "brandPersonality": ["6 personality traits refined from their input — mix traits from their adjectives AND their archetype's natural qualities"]
  },
  "loveFactor": {
    "whyPeopleChoose": "2-3 sentences on why clients choose this person. Explicitly connect this to their archetype — e.g. 'People come to [name] because they're looking for a [archetype quality]...'",
    "experience": "2-3 sentences describing what it feels like to work with this person. Should be unmistakably ${mainArchetype} in its sensory quality.",
    "languageFeel": "A few sentences on how their language feels. Reference the archetype voice: ${archetypeData.voice}.",
    "brandExperience": "A few sentences on the overall brand experience — what makes it consistent and distinctly ${mainArchetype}."
  },
  "idealClient": {
    "name": "A memorable title for their dream client — e.g. 'The Ready-to-Rise Entrepreneur'",
    "description": "A rich 4-6 sentence portrait. Use the client's own language. Note why this specific client is drawn to a ${mainArchetype} brand in particular.",
    "demographics": "A clear demographics paragraph — age, location, profession, tech habits, relationship status as relevant.",
    "challenges": ["4-6 specific challenges — use the client's own language where possible"],
    "motivations": ["4-6 deep desires — go beyond surface. Include at least one that's specifically about wanting the ${mainArchetype} quality in a service provider."],
    "realQuotes": ["3-5 real-sounding client quotes from their input or extrapolated from them"],
    "objectionResponse": "2-3 sentences on main objections and how this brand — as a ${mainArchetype} — addresses them.",
    "marketingMessages": ["4-6 powerful marketing messages — each one should have the ${mainArchetype} voice audible"]
  },
  "taglines": [
    "Tagline option 1 — short and unmistakably ${mainArchetype} in energy",
    "Tagline option 2 — different angle, slightly longer, still archetype-aligned",
    "Tagline option 3 — a question or provocation in the ${mainArchetype} voice",
    "Tagline option 4 — benefit-led but with ${mainArchetype} flavour",
    "Tagline option 5 — the boldest, most distinctly ${mainArchetype} option"
  ],
  "messaging": {
    "valueProposition": "2-3 sentences. What makes this business genuinely different — specifically because of WHO this person is and which archetype they embody. Mention the archetype quality implicitly or explicitly.",
    "elevatorPitch": "A 3-4 sentence pitch. Start with the problem the ${mainArchetype} is built to solve, move to the transformation, land on what makes them different. Should sound exactly like a ${mainArchetype} said it."
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
        "value": "${mainArchetype} Archetype${secondaryArchetype ? ' + ' + secondaryArchetype : ''}",
        "voice": "The specific voice quality that comes from this archetype combination",
        "means": "What this archetype blend looks like in their content, copy and client communication",
        "notThis": "What this brand is emphatically NOT — what the ${mainArchetype} avoids: ${archetypeData.avoids}"
      }
    ],
    "verbs": ["8-10 action verbs that sound like this brand — pulled from their language AND their archetype's natural energy: ${archetypeData.voice}"],
    "keywords": ["10-12 power words and phrases specific to this brand, niche, and archetype"],
    "buttonCopy": ["6-8 CTA ideas — each one should sound like a ${mainArchetype} wrote it, not a generic marketer"]
  },
  "brandStory": "A full 3-5 paragraph brand story in third person. Pull from their past achievements, pivot points and future vision. The narrative arc should reflect the ${mainArchetype} journey — not just what they did, but HOW they moved through the world. The writing itself should have the ${mainArchetype} voice. This should feel like the About page of a world-class brand.",
  "socialBio": {
    "short": "A 2-3 sentence Instagram/TikTok bio. It should be immediately, unmistakably ${mainArchetype} in energy. Someone who knows the archetypes should be able to guess which one just from reading it.",
    "long": "A 3-4 paragraph LinkedIn/website bio. Warm opening, clear positioning, social proof from their achievements, compelling close with a CTA. Written in first person with the ${mainArchetype} voice running all the way through."
  },
  "contentPillars": [
    {
      "pillar": "Pillar 1 name — specific to this brand and archetype, not generic. Should feel like something only a ${mainArchetype} would name it.",
      "description": "2-3 sentences on what this pillar covers, why it's perfect for this brand and audience, and how it expresses the ${mainArchetype} energy.",
      "postIdeas": ["8-10 specific, usable post ideas — written in the ${mainArchetype} voice, not generic"]
    },
    {
      "pillar": "Pillar 2 name — archetype-specific",
      "description": "2-3 sentences — including how this pillar channels the archetype combination",
      "postIdeas": ["8-10 specific post ideas in the ${mainArchetype} voice"]
    },
    {
      "pillar": "Pillar 3 name — archetype-specific",
      "description": "2-3 sentences",
      "postIdeas": ["8-10 specific post ideas"]
    },
    {
      "pillar": "Pillar 4 name — archetype-specific",
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
    "intro": "A 2-3 sentence personalised intro based on where they are (${fd.startingPoint || 'their current stage'}). Frame the 90 days through the lens of the ${mainArchetype} — how does a ${mainArchetype} build momentum? What's their natural rhythm and approach?",
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
