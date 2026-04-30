// =========================================================
// Flourish Online — Brand Archetype Kick Start Generator
// Frontend Application
// =========================================================

// ─── STATE ────────────────────────────────────────────────
const state = {
  accessCode: null,
  retrievalCode: null,
  currentStep: 1,
  currentValuesPhase: 'a',
  formData: {},
  results: null,
  // Values quiz state
  customValues: [],
  selectedValues: [],    // Phase B selections
  top10Values: [],       // Phase C selections
  core3Values: [],       // Phase D selections
};

// ─── ALL VALUES (from FO Brand Values Discovery Worksheet) ──
const ALL_VALUES = [
  'Accountability','Achievement','Adventure','Advocacy','Ambition',
  'Appreciation','Attractiveness','Autonomy','Balance','Being the Best',
  'Benevolence','Boldness','Brilliance','Calmness','Caring',
  'Challenge','Charity','Cheerfulness','Cleverness','Collaboration',
  'Commitment','Community','Compassion','Consistency','Contribution',
  'Cooperation','Creativity','Credibility','Curiosity','Daring',
  'Decisiveness','Dedication','Dependability','Diversity','Empathy',
  'Encouragement','Enthusiasm','Ethics','Excellence','Expressiveness',
  'Fairness','Family','Flexibility','Freedom','Friendships',
  'Fun','Generosity','Grace','Growth','Happiness',
  'Health','Honesty','Humility','Humor','Inclusiveness',
  'Independence','Individuality','Innovation','Inspiration','Intelligence',
  'Intuition','Joy','Kindness','Knowledge','Leadership',
  'Learning','Love','Loyalty','Making a Difference','Mindfulness',
  'Motivation','Open-Mindedness','Optimism','Originality','Passion',
  'Peace','Performance','Personal Development','Playfulness','Popularity',
  'Power','Preparedness','Proactivity','Professionalism','Punctuality',
  'Quality','Recognition','Relationships','Reliability','Resilience',
  'Resourcefulness','Responsibility','Responsiveness','Risk Taking','Safety',
  'Security','Self-Control','Selflessness','Service','Simplicity',
  'Spirituality','Stability','Success','Teamwork','Thankfulness',
  'Thoughtfulness','Traditionalism','Trustworthiness','Understanding','Uniqueness',
  'Usefulness','Versatility','Vision','Warmth','Wealth',
  'Well-Being','Wisdom','Zeal'
];

// ─── VIEW MANAGEMENT ─────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showStep(stepNum) {
  state.currentStep = stepNum;
  document.querySelectorAll('fieldset.step').forEach(s => s.classList.remove('active'));
  document.querySelector(`.step-${stepNum}`).classList.add('active');

  document.querySelectorAll('.step-indicator').forEach(ind => {
    const stepIndex = parseInt(ind.dataset.step);
    ind.classList.remove('active', 'complete');
    if (stepIndex === stepNum) ind.classList.add('active');
    else if (stepIndex < stepNum) ind.classList.add('complete');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // When entering values step, show phase A by default
  if (stepNum === 3) {
    showValuesPhase('a');
  }
}

// ─── VALUES QUIZ PHASES ───────────────────────────────────
function showValuesPhase(phase) {
  state.currentValuesPhase = phase;

  // Hide all phases
  document.querySelectorAll('.values-phase').forEach(p => p.classList.remove('active'));
  document.getElementById(`values-phase-${phase}`).classList.add('active');

  // Update phase dots
  const phases = ['a', 'b', 'c', 'd'];
  const currentIdx = phases.indexOf(phase);
  document.querySelectorAll('.phase-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'complete');
    if (i === currentIdx) dot.classList.add('active');
    else if (i < currentIdx) dot.classList.add('complete');
  });

  // Update phase label
  const labels = {
    a: 'Part 1 of 4: Your own values',
    b: 'Part 2 of 4: Select from the full list',
    c: 'Part 3 of 4: Narrow to your top 10',
    d: 'Part 4 of 4: Choose your 3 core values',
  };
  document.getElementById('phase-label-text').textContent = labels[phase];

  // Show/hide back-to-step button
  const backBtn = document.getElementById('step-back-values');
  backBtn.style.display = phase === 'a' ? 'block' : 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── TAG INPUT (custom values) ────────────────────────────
function initTagInput() {
  const input = document.getElementById('custom-value-input');
  const tagList = document.getElementById('custom-tags');

  function addTag(value) {
    const v = value.trim();
    if (!v) return;
    // Avoid duplicates
    if (state.customValues.some(cv => cv.toLowerCase() === v.toLowerCase())) return;

    state.customValues.push(v);
    renderTags();
    input.value = '';
    autoSave();
  }

  function renderTags() {
    tagList.innerHTML = '';
    state.customValues.forEach((val, idx) => {
      const tag = document.createElement('span');
      tag.className = 'value-tag';
      tag.innerHTML = `${escapeHtml(val)} <span class="tag-remove" aria-label="Remove">×</span>`;
      tag.addEventListener('click', () => {
        state.customValues.splice(idx, 1);
        renderTags();
        autoSave();
      });
      tagList.appendChild(tag);
    });
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.value.replace(/,$/, ''));
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) addTag(input.value);
  });

  // Make wrapper clickable to focus input
  document.querySelector('.tag-input-wrapper').addEventListener('click', (e) => {
    if (e.target !== input) input.focus();
  });
}

// ─── VALUES GRID (phase B) ────────────────────────────────
function renderValuesGrid() {
  const grid = document.getElementById('values-grid');
  grid.innerHTML = '';

  // Custom values first (with badge)
  state.customValues.forEach(val => {
    grid.appendChild(createValueCheckbox(val, true, state.selectedValues.includes(val)));
  });

  // Then standard values
  ALL_VALUES.forEach(val => {
    grid.appendChild(createValueCheckbox(val, false, state.selectedValues.includes(val)));
  });

  updateSelectedCount();
}

function createValueCheckbox(val, isCustom, isChecked) {
  const item = document.createElement('div');
  item.className = 'value-checkbox-item' + (isCustom ? ' custom-value' : '');

  const id = 'val-' + val.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = id;
  cb.value = val;
  cb.checked = isChecked;

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = val;
  if (isCustom) {
    const badge = document.createElement('span');
    badge.className = 'custom-badge';
    badge.textContent = 'yours';
    lbl.appendChild(badge);
  }

  cb.addEventListener('change', () => {
    if (cb.checked) {
      if (!state.selectedValues.includes(val)) state.selectedValues.push(val);
    } else {
      state.selectedValues = state.selectedValues.filter(v => v !== val);
    }
    updateSelectedCount();
    autoSave();
  });

  item.appendChild(cb);
  item.appendChild(lbl);
  return item;
}

function updateSelectedCount() {
  const countEl = document.getElementById('selected-count');
  if (countEl) countEl.textContent = state.selectedValues.length;
}

// ─── TOP 10 GRID (phase C) ────────────────────────────────
function renderTop10Grid() {
  const grid = document.getElementById('top10-grid');
  grid.innerHTML = '';

  state.selectedValues.forEach(val => {
    const isCustom = state.customValues.includes(val);
    const isChecked = state.top10Values.includes(val);
    const item = createTop10Checkbox(val, isCustom, isChecked);
    grid.appendChild(item);
  });

  updateTop10Count();
}

function createTop10Checkbox(val, isCustom, isChecked) {
  const item = document.createElement('div');
  item.className = 'value-checkbox-item' + (isCustom ? ' custom-value' : '');

  const id = 'top10-' + val.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = id;
  cb.value = val;
  cb.checked = isChecked;

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = val;

  cb.addEventListener('change', () => {
    if (cb.checked) {
      if (state.top10Values.length >= 10) {
        cb.checked = false;
        shakeCounter('top10-count');
        return;
      }
      if (!state.top10Values.includes(val)) state.top10Values.push(val);
    } else {
      state.top10Values = state.top10Values.filter(v => v !== val);
    }
    updateTop10Count();
    autoSave();
  });

  item.appendChild(cb);
  item.appendChild(lbl);
  return item;
}

function updateTop10Count() {
  const countEl = document.getElementById('top10-count');
  const hintEl = document.getElementById('top10-hint');
  const count = state.top10Values.length;
  if (countEl) countEl.textContent = count;
  if (hintEl) {
    if (count < 10) hintEl.textContent = ` — keep narrowing (${10 - count} to go)`;
    else if (count === 10) hintEl.textContent = ' — perfect!';
  }
}

// ─── CORE 3 GRID (phase D) ───────────────────────────────
function renderCore3Grid() {
  const grid = document.getElementById('core3-grid');
  grid.innerHTML = '';

  state.top10Values.forEach(val => {
    const isCustom = state.customValues.includes(val);
    const isChecked = state.core3Values.includes(val);
    const item = createCore3Checkbox(val, isCustom, isChecked);
    grid.appendChild(item);
  });

  updateCore3Count();
}

function createCore3Checkbox(val, isCustom, isChecked) {
  const item = document.createElement('div');
  item.className = 'value-checkbox-item' + (isCustom ? ' custom-value' : '');

  const id = 'core3-' + val.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = id;
  cb.value = val;
  cb.checked = isChecked;

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = val;

  cb.addEventListener('change', () => {
    if (cb.checked) {
      if (state.core3Values.length >= 3) {
        cb.checked = false;
        shakeCounter('core3-count');
        return;
      }
      if (!state.core3Values.includes(val)) state.core3Values.push(val);
    } else {
      state.core3Values = state.core3Values.filter(v => v !== val);
    }
    updateCore3Count();
    autoSave();
  });

  item.appendChild(cb);
  item.appendChild(lbl);
  return item;
}

function updateCore3Count() {
  const countEl = document.getElementById('core3-count');
  if (countEl) countEl.textContent = state.core3Values.length;
}

function shakeCounter(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.color = 'var(--crimson)';
  setTimeout(() => { el.style.color = ''; }, 600);
}

// ─── PHASE NAVIGATION ────────────────────────────────────
document.getElementById('btn-phase-a-next').addEventListener('click', () => {
  // Save custom values to hidden input
  document.getElementById('customValuesInput').value = state.customValues.join(', ');
  renderValuesGrid();
  showValuesPhase('b');
});

document.getElementById('btn-phase-b-back').addEventListener('click', () => {
  showValuesPhase('a');
});

document.getElementById('btn-phase-b-next').addEventListener('click', () => {
  if (state.selectedValues.length < 5) {
    alert('Please select at least 5 values before moving on. The more you select here, the better your narrowing down process will be.');
    return;
  }
  // Preserve top10 selections that are still valid
  state.top10Values = state.top10Values.filter(v => state.selectedValues.includes(v));
  renderTop10Grid();
  showValuesPhase('c');
});

document.getElementById('btn-phase-c-back').addEventListener('click', () => {
  state.top10Values = [];
  renderValuesGrid();
  showValuesPhase('b');
});

document.getElementById('btn-phase-c-next').addEventListener('click', () => {
  if (state.top10Values.length < 5) {
    alert('Please narrow down to at least 5 values. We recommend exactly 10 — it makes your final selection much more powerful.');
    return;
  }
  // Preserve core3 selections that are still valid
  state.core3Values = state.core3Values.filter(v => state.top10Values.includes(v));
  renderCore3Grid();
  showValuesPhase('d');
});

document.getElementById('btn-phase-d-back').addEventListener('click', () => {
  state.core3Values = [];
  renderTop10Grid();
  showValuesPhase('c');
});

document.getElementById('btn-phase-d-next').addEventListener('click', () => {
  if (state.core3Values.length < 3) {
    alert('Please select exactly 3 core values. These are your brand\'s north star — choose the ones that feel most fundamental.');
    return;
  }

  // Sync hidden inputs
  document.getElementById('customValuesInput').value = state.customValues.join(', ');
  document.getElementById('allSelectedValuesInput').value = state.selectedValues.join(', ');
  document.getElementById('top10ValuesInput').value = state.top10Values.join(', ');
  document.getElementById('core3ValuesInput').value = state.core3Values.join(', ');

  autoSave();
  showStep(4);
});

// ─── STEP NAVIGATION ─────────────────────────────────────
document.querySelectorAll('[data-next]').forEach(btn => {
  btn.addEventListener('click', () => {
    const nextStep = parseInt(btn.dataset.next);
    if (validateStep(state.currentStep)) {
      collectFormData();
      showStep(nextStep);
      autoSave();
    }
  });
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    const backStep = parseInt(btn.dataset.back);
    collectFormData();
    showStep(backStep);
  });
});

function validateStep(stepNum) {
  const step = document.querySelector(`.step-${stepNum}`);
  if (!step) return true;

  const requiredFields = step.querySelectorAll('[required]');
  let valid = true;
  let firstInvalid = null;

  requiredFields.forEach(field => {
    const val = field.value.trim();
    const isEmpty = !val;

    // Special case: radio group
    if (field.type === 'radio') {
      const groupName = field.name;
      const anyChecked = step.querySelector(`[name="${groupName}"]:checked`);
      if (!anyChecked) {
        if (!firstInvalid) firstInvalid = field;
        valid = false;
        // Highlight radio group
        const radioGroup = step.querySelector('.radio-group');
        if (radioGroup) radioGroup.style.outline = '2px solid var(--crimson)';
      }
      return;
    }

    if (isEmpty) {
      field.style.borderColor = 'var(--crimson)';
      if (!firstInvalid) firstInvalid = field;
      valid = false;
    } else {
      field.style.borderColor = '';
    }
  });

  if (!valid && firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

// Clear validation styling on input
document.getElementById('form-main').addEventListener('input', (e) => {
  if (e.target.style) e.target.style.borderColor = '';
  // Clear radio group outline
  const radioGroup = e.target.closest('.radio-group');
  if (radioGroup) radioGroup.style.outline = '';
});

// ─── FORM DATA COLLECTION ─────────────────────────────────
function collectFormData() {
  const form = document.getElementById('form-main');
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    if (value !== undefined && value !== null) {
      state.formData[key] = value;
    }
  }

  // Values state
  state.formData.customValues = state.customValues.join(', ');
  state.formData.allSelectedValues = state.selectedValues.join(', ');
  state.formData.top10Values = state.top10Values.join(', ');
  state.formData.core3Values = state.core3Values.join(', ');
}

function restoreFormData(data) {
  if (!data) return;

  Object.entries(data).forEach(([key, value]) => {
    // Skip values quiz hidden inputs — handled separately
    if (['customValues', 'allSelectedValues', 'top10Values', 'core3Values'].includes(key)) return;

    const field = document.querySelector(`[name="${key}"]`);
    if (!field) return;

    if (field.type === 'radio') {
      const radio = document.querySelector(`[name="${key}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      field.value = value;
    }
  });

  // Restore values quiz state
  if (data.customValues) {
    state.customValues = data.customValues.split(',').map(v => v.trim()).filter(Boolean);
    // Re-render tags
    renderRestoredTags();
  }
  if (data.allSelectedValues) {
    state.selectedValues = data.allSelectedValues.split(',').map(v => v.trim()).filter(Boolean);
  }
  if (data.top10Values) {
    state.top10Values = data.top10Values.split(',').map(v => v.trim()).filter(Boolean);
  }
  if (data.core3Values) {
    state.core3Values = data.core3Values.split(',').map(v => v.trim()).filter(Boolean);
  }
}

function renderRestoredTags() {
  const tagList = document.getElementById('custom-tags');
  if (!tagList) return;
  tagList.innerHTML = '';
  state.customValues.forEach((val, idx) => {
    const tag = document.createElement('span');
    tag.className = 'value-tag';
    tag.innerHTML = `${escapeHtml(val)} <span class="tag-remove">×</span>`;
    tag.addEventListener('click', () => {
      state.customValues.splice(idx, 1);
      renderRestoredTags();
      autoSave();
    });
    tagList.appendChild(tag);
  });
}

// ─── AUTO-SAVE ────────────────────────────────────────────
let autoSaveTimer = null;

function autoSave() {
  // Always save to localStorage immediately
  collectFormData();
  try {
    localStorage.setItem('fo_kickstart_draft', JSON.stringify({
      formData: state.formData,
      customValues: state.customValues,
      selectedValues: state.selectedValues,
      top10Values: state.top10Values,
      core3Values: state.core3Values,
      savedAt: Date.now(),
    }));
    showAutosaveIndicator();
  } catch (e) {
    // localStorage full or unavailable
  }

  // Debounce server save (only if we have a retrieval code)
  if (state.retrievalCode) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => serverSaveProgress(), 5000);
  }
}

function showAutosaveIndicator() {
  const indicator = document.getElementById('autosave-indicator');
  if (!indicator) return;
  indicator.hidden = false;
  clearTimeout(indicator._hideTimer);
  indicator._hideTimer = setTimeout(() => { indicator.hidden = true; }, 3000);
}

// Auto-save on every input change
document.getElementById('form-main').addEventListener('input', () => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSave, 1500);
});

// ─── ACCESS GATE ──────────────────────────────────────────
document.getElementById('form-access').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('access-code').value.trim().toUpperCase();
  const errorEl = document.getElementById('access-error');
  errorEl.hidden = true;

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.textContent = 'Checking...';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: code }),
    });
    const data = await res.json();

    if (res.ok && data.valid) {
      state.accessCode = code;
      sessionStorage.setItem('fo_access', code);
      // Check for localStorage draft
      loadLocalDraftIfAvailable();
      showView('view-form');
      showStep(1);
    } else {
      errorEl.textContent = data.error || "That code didn't work. Please check it and try again.";
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again in a moment.';
    errorEl.hidden = false;
  } finally {
    submitBtn.textContent = 'Continue';
    submitBtn.disabled = false;
  }
});

// ─── LOAD PROGRESS ───────────────────────────────────────
document.getElementById('form-load').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('retrieval-code').value.trim().toUpperCase();
  const errorEl = document.getElementById('load-error');
  errorEl.hidden = true;

  if (!code) {
    errorEl.textContent = 'Please enter a retrieval code.';
    errorEl.hidden = false;
    return;
  }

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Loading...';

  try {
    const res = await fetch('/api/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retrievalCode: code }),
    });
    const data = await res.json();

    if (res.ok && data.found) {
      state.retrievalCode = code;
      state.accessCode = data.accessCode;

      if (data.results) {
        state.results = data.results;
        state.formData = data.formData || {};
        renderResults();
        showView('view-results');
        document.getElementById('retrieval-banner').hidden = false;
        document.getElementById('retrieval-display').textContent = code;
      } else if (data.formData) {
        state.formData = data.formData;
        restoreFormData(data.formData);
        showView('view-form');
        showStep(1);
      }
    } else {
      errorEl.textContent = data.error || "We couldn't find that code. Please check and try again.";
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.';
    errorEl.hidden = false;
  } finally {
    submitBtn.textContent = 'Load my progress';
    submitBtn.disabled = false;
  }
});

// ─── LOCAL DRAFT RESTORE ─────────────────────────────────
function loadLocalDraftIfAvailable() {
  try {
    const raw = localStorage.getItem('fo_kickstart_draft');
    if (!raw) return;

    const draft = JSON.parse(raw);
    const ageHours = (Date.now() - (draft.savedAt || 0)) / 3600000;
    if (ageHours > 72) return; // Don't restore drafts older than 3 days

    if (draft.formData && Object.keys(draft.formData).length > 2) {
      if (confirm('We found a saved draft from your previous session. Would you like to restore it?')) {
        state.formData = draft.formData;
        state.customValues = draft.customValues || [];
        state.selectedValues = draft.selectedValues || [];
        state.top10Values = draft.top10Values || [];
        state.core3Values = draft.core3Values || [];
        restoreFormData(draft.formData);
      }
    }
  } catch (e) {
    // Silently fail
  }
}

// ─── SAVE PROGRESS (server) ───────────────────────────────
document.getElementById('btn-save-progress').addEventListener('click', async () => {
  collectFormData();
  if (!Object.keys(state.formData).length) {
    alert('Fill in at least a few fields before saving.');
    return;
  }
  await serverSaveProgress(true);
});

async function serverSaveProgress(showAlert = false) {
  const btn = document.getElementById('btn-save-progress');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

  try {
    const res = await fetch('/api/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: state.accessCode,
        formData: state.formData,
        retrievalCode: state.retrievalCode,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      state.retrievalCode = data.retrievalCode;

      // Also save to localStorage
      try {
        localStorage.setItem('fo_kickstart_retrieval', data.retrievalCode);
      } catch (e) {}

      if (showAlert) {
        alert(
          `Your progress has been saved!\n\nYour retrieval code is:\n\n${data.retrievalCode}\n\nSave this somewhere safe. You can return to this page at any time and load your progress using this code.`
        );
      }
    } else {
      if (showAlert) alert(data.error || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    if (showAlert) alert('Something went wrong saving your progress. Please try again.');
  } finally {
    if (btn) { btn.textContent = origText; btn.disabled = false; }
  }
}

// ─── MAIN FORM SUBMISSION ─────────────────────────────────
document.getElementById('form-main').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateStep(7)) return;
  collectFormData();

  // Validate values quiz was completed
  if (!state.core3Values.length) {
    alert('Please complete the Values quiz (Step 3) before generating your strategy — your values are the heart of everything.');
    showStep(3);
    return;
  }

  showView('view-loading');
  startLoadingMessages();

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: state.accessCode,
        formData: state.formData,
        retrievalCode: state.retrievalCode,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Generation failed');
    }

    const data = await res.json();
    state.results = data.results;
    state.retrievalCode = data.retrievalCode;

    // Clear local draft
    try { localStorage.removeItem('fo_kickstart_draft'); } catch (e) {}

    renderResults();
    showView('view-results');

    document.getElementById('retrieval-banner').hidden = false;
    document.getElementById('retrieval-display').textContent = data.retrievalCode;

  } catch (err) {
    alert(
      `Something went wrong generating your Brand Strategy: ${err.message}\n\nPlease try again in a moment. If it keeps failing, email hello@flourishonline.com.au`
    );
    showView('view-form');
  }
});

// ─── LOADING MESSAGES ─────────────────────────────────────
const loadingMessages = [
  'Reading your archetype...',
  'Building your brand foundation...',
  'Crafting your values framework...',
  'Defining your brand personality...',
  'Writing your tagline options...',
  'Mapping your ideal client...',
  'Building your content pillars...',
  'Structuring your offer suite...',
  'Writing your brand story...',
  'Creating your voice chart...',
  'Mapping your 90-day plan...',
  'Almost there, polishing it all up...',
];

let loadingInterval = null;

function startLoadingMessages() {
  let i = 0;
  const msgEl = document.getElementById('loading-message');
  if (!msgEl) return;
  msgEl.textContent = loadingMessages[0];
  clearInterval(loadingInterval);
  loadingInterval = setInterval(() => {
    if (!document.getElementById('view-loading').classList.contains('active')) {
      clearInterval(loadingInterval);
      return;
    }
    i = (i + 1) % loadingMessages.length;
    msgEl.textContent = loadingMessages[i];
  }, 7000);
}

// ─── RESULTS RENDERING ────────────────────────────────────
function renderResults() {
  const r = state.results;
  if (!r) return;

  const name = state.formData.yourName || 'You';
  const archetype = state.formData.archetypeMain || '';
  document.getElementById('results-name').textContent = name;
  document.getElementById('results-archetype').textContent = archetype ? `${archetype} Archetype` : '';
  document.getElementById('results-title').textContent = `${name}'s Brand Kick Start`;

  const container = document.getElementById('results-content');
  container.innerHTML = '';

  // ── Section 0: Archetype Profile (hero section, dark styling) ──
  if (r.archetypeProfile) {
    container.appendChild(makeArchetypeSection(r));
  }

  // ── Section 1: Brand Foundation ─────────────────────────
  container.appendChild(makeSection('1 · Brand Foundation', buildBrandFoundationHtml(r)));

  // ── Section 2: Your Values ──────────────────────────────
  container.appendChild(makeSection('2 · Your Values', buildValuesHtml(r)));

  // ── Section 3: Your Weird ───────────────────────────────
  container.appendChild(makeSection('3 · Your Weird', buildWeirdHtml(r)));

  // ── Section 4: Your Love Factor ─────────────────────────
  container.appendChild(makeSection('4 · Your Love Factor', buildLoveFactorHtml(r)));

  // ── Section 5: Your People ──────────────────────────────
  container.appendChild(makeSection('5 · Your People', buildPeopleHtml(r)));

  // ── Section 6: Brand Messaging ──────────────────────────
  container.appendChild(makeSection('6 · Brand Messaging', buildMessagingHtml(r)));

  // ── Section 7: Brand Voice & Tone ───────────────────────
  container.appendChild(makeSection('7 · Brand Voice & Tone', buildVoiceHtml(r)));

  // ── Section 8: Brand Story ──────────────────────────────
  container.appendChild(makeSection('8 · Your Brand Story', buildBrandStoryHtml(r)));

  // ── Section 9: Social Bio ───────────────────────────────
  container.appendChild(makeSection('9 · Social Bio', buildSocialBioHtml(r)));

  // ── Section 10: Content Pillars ─────────────────────────
  container.appendChild(makeSection('10 · Content Pillars', buildContentPillarsHtml(r)));

  // ── Section 11: Offer Structure ─────────────────────────
  container.appendChild(makeSection('11 · Offer Structure', buildOfferStructureHtml(r)));

  // ── Section 12: 90-Day Plan ─────────────────────────────
  container.appendChild(makeSection('12 · Your 90-Day Kick Start Plan', buildNinetyDayHtml(r)));
}

function makeSection(title, innerHtml) {
  const section = document.createElement('section');
  section.className = 'result-section';
  section.innerHTML = `<h2 class="result-section-title">${escapeHtml(title)}</h2>${innerHtml}`;
  return section;
}

function makeArchetypeSection(r) {
  const ap = r.archetypeProfile;
  const mainArchetype = state.formData.archetypeMain || '';
  const secondary = state.formData.archetypeSecondary && state.formData.archetypeSecondary !== 'None / not sure yet'
    ? state.formData.archetypeSecondary : null;
  const shadow = state.formData.archetypeShadow && state.formData.archetypeShadow !== 'None / not sure yet'
    ? state.formData.archetypeShadow : null;

  // Build archetype badges
  const badges = `
    <div class="archetype-badges">
      <span class="archetype-badge primary">${escapeHtml(mainArchetype)} <span class="badge-role">Primary</span></span>
      ${secondary ? `<span class="archetype-badge secondary">${escapeHtml(secondary)} <span class="badge-role">Secondary</span></span>` : ''}
      ${shadow ? `<span class="archetype-badge shadow">${escapeHtml(shadow)} <span class="badge-role">Shadow</span></span>` : ''}
    </div>
  `;

  const inActionItems = (ap.archetypeInAction || [])
    .map(item => `<li>${escapeHtml(item)}</li>`).join('');

  const watchOuts = (ap.watchOuts || [])
    .map(item => `<li>${escapeHtml(item)}</li>`).join('');

  const primaryBlock = ap.primaryInBrand
    ? `<div class="archetype-detail-block primary-block">
        <div class="archetype-detail-label">${escapeHtml(mainArchetype)} — Primary Archetype</div>
        <p>${escapeHtml(ap.primaryInBrand)}</p>
       </div>` : '';

  const secondaryBlock = secondary && ap.secondaryInBrand
    ? `<div class="archetype-detail-block secondary-block">
        <div class="archetype-detail-label">${escapeHtml(secondary)} — Secondary Archetype</div>
        <p>${escapeHtml(ap.secondaryInBrand)}</p>
       </div>` : '';

  const shadowBlock = shadow && ap.shadowInBrand
    ? `<div class="archetype-detail-block shadow-block">
        <div class="archetype-detail-label">${escapeHtml(shadow)} — Shadow Archetype</div>
        <p>${escapeHtml(ap.shadowInBrand)}</p>
       </div>` : '';

  const section = document.createElement('section');
  section.className = 'result-section archetype-hero-section';
  section.innerHTML = `
    <div class="archetype-hero-inner">
      <div class="archetype-eyebrow">YOUR ARCHETYPE PROFILE</div>
      <h2 class="archetype-combo-title">${escapeHtml(ap.combinationTitle || mainArchetype)}</h2>
      ${badges}
      <p class="archetype-summary">${escapeHtml(ap.combinationSummary || '')}</p>

      <div class="archetype-detail-blocks">
        ${primaryBlock}
        ${secondaryBlock}
        ${shadowBlock}
      </div>

      ${inActionItems ? `
        <div class="archetype-in-action">
          <h4 class="archetype-subheading">Your archetype combination in action</h4>
          <ul>${inActionItems}</ul>
        </div>
      ` : ''}

      ${watchOuts ? `
        <div class="archetype-watchouts">
          <h4 class="archetype-subheading">Things to watch for</h4>
          <ul>${watchOuts}</ul>
        </div>
      ` : ''}
    </div>
  `;
  return section;
}

function buildBrandFoundationHtml(r) {
  const f = r.brandFoundation || {};
  return `
    <h3>Your Why</h3>
    <p>${escapeHtml(f.why || '')}</p>
    <h3>Your Vision</h3>
    <p>${escapeHtml(f.vision || '')}</p>
    <h3>Your Mission</h3>
    <p>${escapeHtml(f.mission || '')}</p>
  `;
}

function buildValuesHtml(r) {
  const v = r.values || {};
  const core3 = v.core3 || state.core3Values || [];
  const top10 = v.top10 || state.top10Values || [];
  const supporting = top10.filter(val => !core3.includes(val));

  return `
    <h4>Core Brand Values</h4>
    <div class="values-display">
      ${core3.map(v => `<span class="value-pill core">${escapeHtml(v)}</span>`).join('')}
    </div>
    <h4>Top 10 Values</h4>
    <div class="values-display">
      ${top10.map(v => `<span class="value-pill top10">${escapeHtml(v)}</span>`).join('')}
    </div>
    <h3>Your Core Value Statements</h3>
    ${v.coreValueStatements ? v.coreValueStatements.map(s => `<p>→ ${escapeHtml(s)}</p>`).join('') : ''}
  `;
}

function buildWeirdHtml(r) {
  const w = r.weird || {};
  const doList = w.doList || [];
  const dontList = w.dontList || [];

  return `
    <h3>What Makes You Uniquely You</h3>
    <p>${escapeHtml(w.uniqueness || '')}</p>

    <div class="do-dont-grid">
      <div class="do-column">
        <h5>We Do</h5>
        <ul>${doList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>
      <div class="dont-column">
        <h5>We Don't Do</h5>
        <ul>${dontList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>
    </div>

    <h3>Your Superpower</h3>
    <p>${escapeHtml(w.superpower || '')}</p>

    <h3>Your Archnemesis</h3>
    <p><strong>${escapeHtml(w.archnemesisName || '')}</strong></p>
    <p>${escapeHtml(w.archnemesisDescription || '')}</p>

    <h3>Your Brand Personality</h3>
    <div class="values-display">
      ${(w.brandPersonality || []).map(t => `<span class="value-pill supporting">${escapeHtml(t)}</span>`).join('')}
    </div>
  `;
}

function buildLoveFactorHtml(r) {
  const l = r.loveFactor || {};
  return `
    <h3>Why People Choose You</h3>
    <p>${escapeHtml(l.whyPeopleChoose || '')}</p>
    <h3>The Experience of Working With You</h3>
    <p>${escapeHtml(l.experience || '')}</p>
    <h3>Your Language Feels</h3>
    <p>${escapeHtml(l.languageFeel || '')}</p>
    <h3>Your Brand Experience Feels</h3>
    <p>${escapeHtml(l.brandExperience || '')}</p>
  `;
}

function buildPeopleHtml(r) {
  const p = r.idealClient || {};
  return `
    <h3>${escapeHtml(p.name || 'Your Dream Client')}</h3>
    <p>${escapeHtml(p.description || '')}</p>
    <h3>Demographics</h3>
    <p>${escapeHtml(p.demographics || '')}</p>
    <h3>Their Challenges</h3>
    ${renderList(p.challenges)}
    <h3>Their Deepest Desires</h3>
    ${renderList(p.motivations)}
    <h3>What They Actually Say</h3>
    ${(p.realQuotes || []).map(q => `<blockquote>"${escapeHtml(q)}"</blockquote>`).join('')}
    <h3>Potential Objections &amp; How to Address Them</h3>
    <p>${escapeHtml(p.objectionResponse || '')}</p>
    <h3>Marketing Messages That Land</h3>
    ${renderList(p.marketingMessages)}
  `;
}

function buildMessagingHtml(r) {
  const m = r.messaging || {};
  const taglines = r.taglines || [];
  return `
    <h3>Your Tagline Options</h3>
    ${taglines.map(t => `<div class="tagline-option">${escapeHtml(t)}</div>`).join('')}
    <h3>Your Value Proposition</h3>
    <p>${escapeHtml(m.valueProposition || '')}</p>
    <h3>Your Elevator Pitch</h3>
    <p>${escapeHtml(m.elevatorPitch || '')}</p>
  `;
}

function buildVoiceHtml(r) {
  const v = r.brandVoice || {};
  const chart = v.voiceChart || [];

  let tableHtml = '';
  if (chart.length) {
    tableHtml = `
      <table class="voice-chart-table">
        <thead>
          <tr>
            <th>Because we value</th>
            <th>Our voice is</th>
            <th>This means</th>
            <th>We are NOT</th>
          </tr>
        </thead>
        <tbody>
          ${chart.map(row => `
            <tr>
              <td><strong>${escapeHtml(row.value || '')}</strong></td>
              <td>${escapeHtml(row.voice || '')}</td>
              <td>${escapeHtml(row.means || '')}</td>
              <td>${escapeHtml(row.notThis || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `
    <h3>Brand Voice Chart</h3>
    ${tableHtml}
    <h3>Words That Sound Like Us</h3>
    <h4>Go-to Verbs</h4>
    <p>${(v.verbs || []).map(w => `<strong>${escapeHtml(w)}</strong>`).join(' · ')}</p>
    <h4>Power Words &amp; Keywords</h4>
    <p>${(v.keywords || []).map(w => `<strong>${escapeHtml(w)}</strong>`).join(' · ')}</p>
    <h4>Button Copy Ideas</h4>
    ${renderList(v.buttonCopy)}
  `;
}

function buildBrandStoryHtml(r) {
  const s = r.brandStory || '';
  return `<p>${escapeHtml(s).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
}

function buildSocialBioHtml(r) {
  const b = r.socialBio || {};
  return `
    <h4>Short version (Instagram, TikTok, Twitter/X)</h4>
    <p>${escapeHtml(b.short || '')}</p>
    <h4>Long version (LinkedIn, About page, Email signature)</h4>
    <p>${escapeHtml(b.long || '').replace(/\n/g, '<br>')}</p>
  `;
}

function buildContentPillarsHtml(r) {
  const pillars = r.contentPillars || [];
  return pillars.map(p => `
    <h3>${escapeHtml(p.pillar || '')}</h3>
    <p>${escapeHtml(p.description || '')}</p>
    <h4>Content ideas</h4>
    ${renderList(p.postIdeas)}
  `).join('');
}

function buildOfferStructureHtml(r) {
  const o = r.offerStructure || {};
  const suite = o.recommendedSuite || [];

  return `
    <h3>Your Current Offers, Reviewed</h3>
    <p>${escapeHtml(o.review || '').replace(/\n/g, '<br>')}</p>
    <h3>Recommended Offer Suite</h3>
    ${suite.map(offer => `
      <div class="offer-tier">
        <div class="offer-tier-label">${escapeHtml(offer.tier || '')}</div>
        <h4>${escapeHtml(offer.name || '')}</h4>
        <p>${escapeHtml(offer.description || '')}</p>
      </div>
    `).join('')}
    <h3>Key Refinements</h3>
    ${renderList(o.refinements)}
  `;
}

function buildNinetyDayHtml(r) {
  const plan = r.ninetyDayPlan || {};
  const weeks = plan.weeks || [];

  return `
    <p><em>${escapeHtml(plan.intro || '')}</em></p>
    ${weeks.map((w, i) => `
      <div class="week-block">
        <h4>Week ${i + 1} · ${escapeHtml(w.theme || '')}</h4>
        ${renderList(w.tasks)}
      </div>
    `).join('')}
  `;
}

// ─── HELPERS ─────────────────────────────────────────────
function renderList(items) {
  if (!items || !items.length) return '';
  return `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── DOWNLOAD ────────────────────────────────────────────
document.getElementById('btn-download-pdf').addEventListener('click', () => downloadFile('pdf'));
document.getElementById('btn-download-docx').addEventListener('click', () => downloadFile('docx'));

async function downloadFile(format) {
  const btn = format === 'pdf'
    ? document.getElementById('btn-download-pdf')
    : document.getElementById('btn-download-docx');
  const orig = btn.textContent;
  btn.textContent = 'Preparing...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/download?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: state.results, formData: state.formData }),
    });

    if (!res.ok) throw new Error('Download failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (state.formData.yourName || 'My').replace(/\s+/g, '_');
    const archetype = (state.formData.archetypeMain || 'Brand').replace(/\s+/g, '_');
    a.href = url;
    a.download = `${name}_${archetype}_Brand_Strategy.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed. Please try again or use your browser\'s print function as an alternative.');
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
  }
}

// ─── SAVE RESULTS ────────────────────────────────────────
document.getElementById('btn-save-results').addEventListener('click', () => {
  if (state.retrievalCode) {
    alert(`Your retrieval code is:\n\n${state.retrievalCode}\n\nYou can return to this app at any time and enter this code to view your Brand Strategy again.`);
  } else {
    alert('Your Brand Strategy has been automatically saved. Use the retrieval code shown above to access it again.');
  }
});

// ─── INIT ─────────────────────────────────────────────────
(function init() {
  initTagInput();

  // Pre-fill access code from session if available
  const savedAccess = sessionStorage.getItem('fo_access');
  if (savedAccess) {
    // Don't auto-advance — always require re-entry
  }
})();
