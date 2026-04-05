// Global state
let character = createCharacter();

// DOM Elements
const elements = {
  // Header
  name: document.getElementById('char-name'),
  race: document.getElementById('char-race'),
  charClass: document.getElementById('char-class'),
  level: document.getElementById('char-level'),
  background: document.getElementById('char-background'),

  // Containers
  abilitiesRow: document.getElementById('abilities-row'),
  skillsList: document.getElementById('skills-list'),
  modulesList: document.getElementById('modules-list'),
  
  // Combat Stats
  ac: document.getElementById('stat-ac'),
  acOverride: document.getElementById('ac-override'),
  init: document.getElementById('stat-init'),
  speed: document.getElementById('stat-speed'),
  prof: document.getElementById('stat-prof'),

  // HP & Saves
  hpMax: document.getElementById('hp-max'),
  hpCurrent: document.getElementById('hp-current'),
  hpTemp: document.getElementById('hp-temp'),
  hitDice: document.getElementById('hit-dice'),
  hdSpent: document.getElementById('hd-spent'),
  hdTotal: document.getElementById('hd-total'),
  deathSaves: document.getElementById('death-saves'),

  // Notes
  notes: document.getElementById('char-notes'),

  // Tabbed Panel
  panelTabs: document.getElementById('panel-tabs'),
  panelBody: document.getElementById('panel-body'),

  // Buttons
  addModuleBtn: document.getElementById('add-module'),
  saveBtn: document.getElementById('save-char'),
  exportBtn: document.getElementById('export-char')
};

/** Initialize the creator */
function init() {
  // Check if we are editing an existing character
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  if (editId) {
    const saved = getCharacter(editId);
    if (saved) {
      character = saved;
      elements.exportBtn.style.display = 'inline-flex';
    } else {
      showToast('Character not found. Creating new.', 'error');
    }
  }

  renderAbilities();
  renderSkills();
  renderModules();
  updateUI();
  setupEventListeners();
}

/** Render the 6 ability score cards */
function renderAbilities() {
  elements.abilitiesRow.innerHTML = ABILITY_ORDER.map(ability => {
    const abbr = ABILITY_ABBR[ability];
    const score = character.attributes[ability];
    const mod = calcModifier(score);
    const saveLevel = character.savingThrows[ability];
    const saveMod = calcSaveModifier(character, ability);

    return `
      <div class="ability-card" data-ability="${ability}">
        <span class="ability-card__name">${abbr}</span>
        <span class="ability-card__mod" id="mod-${ability}">${formatModifier(mod)}</span>
        <input type="number" class="ability-card__score" id="score-${ability}" value="${score}" min="1" max="30">
        <div class="ability-card__save">
          <button type="button" class="prof-dot-btn save-toggle" data-ability="${ability}" data-level="${saveLevel}" aria-label="Toggle saving throw proficiency">
            <span class="prof-dot"></span>
          </button>
          <span class="ability-card__save-label">Save</span>
          <span class="ability-card__save-mod" id="save-${ability}">${formatModifier(saveMod)}</span>
        </div>
      </div>
    `;
  }).join('');
}

/** Render the full skills list */
function renderSkills() {
  const skillKeys = Object.keys(SKILL_NAMES).sort((a, b) => SKILL_NAMES[a].localeCompare(SKILL_NAMES[b]));

  elements.skillsList.innerHTML = skillKeys.map(skill => {
    const name = SKILL_NAMES[skill];
    const ability = SKILL_ABILITIES[skill];
    const abbr = ABILITY_ABBR[ability];
    const level = character.skills[skill];
    const mod = calcSkillModifier(character, skill);

    return `
      <div class="skill-row">
        <button type="button" class="prof-dot-btn skill-toggle" data-skill="${skill}" data-level="${level}" aria-label="Toggle skill proficiency">
          <span class="prof-dot"></span>
          <span class="prof-dot"></span>
        </button>
        <span class="skill-row__name">${name}</span>
        <span class="skill-row__ability">(${abbr})</span>
        <span class="skill-row__mod" id="skill-mod-${skill}">${formatModifier(mod)}</span>
      </div>
    `;
  }).join('');
}

/** Render custom modules */
function renderModules() {
  elements.modulesList.innerHTML = character.modules.map((mod, index) => `
    <div class="module-card" data-index="${index}">
      <button type="button" class="module-delete" aria-label="Delete module">✕</button>
      <input type="text" class="module-input dnd-input" placeholder="Feature Title" value="${escapeHtml(mod.title)}">
      <textarea class="module-textarea dnd-input" placeholder="Description...">${escapeHtml(mod.description)}</textarea>
    </div>
  `).join('');
}

/** Update the DOM to match the data model */
function updateUI() {
  // Header
  elements.name.value = character.name;
  elements.race.value = character.race;
  elements.charClass.value = character.class;
  elements.level.value = character.level;
  elements.background.value = character.background;

  // Combat Stats
  if (elements.acOverride) {
    elements.acOverride.checked = character.acOverride !== null;
    elements.ac.disabled = character.acOverride === null;
  }
  elements.ac.value = calcAC(character);
  
  elements.init.textContent = formatModifier(calcInitiative(character));
  elements.speed.value = character.speed;
  elements.prof.textContent = formatModifier(calcProficiencyBonus(character.level));

  // HP, HD & Death Saves
  elements.hpMax.value = character.hitPoints.max;
  elements.hpCurrent.value = character.hitPoints.current;
  elements.hpTemp.value = character.hitPoints.temporary;
  elements.hitDice.value = character.hitDice;
  
  if (character.hitDiceSpent === undefined) character.hitDiceSpent = 0;
  elements.hdSpent.value = character.hitDiceSpent;
  elements.hdTotal.textContent = character.level;

  // Clamp hd spent if level changed
  if (character.hitDiceSpent > character.level) {
    character.hitDiceSpent = character.level;
    elements.hdSpent.value = character.hitDiceSpent;
  }

  // Death Saves (only if the section exists in the DOM)
  if (elements.deathSaves) updateDeathSavesUI();

  // Abilities & Saves & Skills updates are handled by re-rendering or targeted updates during input
}

/** Update Death Saves DOM state */
function updateDeathSavesUI() {
  if (!elements.deathSaves) return;

  const successes = elements.deathSaves.querySelectorAll('.ds-circle--success');
  const failures = elements.deathSaves.querySelectorAll('.ds-circle--failure');

  successes.forEach((btn, i) => {
    if (i < character.deathSaves.successes) btn.classList.add('ds-circle--filled');
    else btn.classList.remove('ds-circle--filled');
  });

  failures.forEach((btn, i) => {
    if (i < character.deathSaves.failures) btn.classList.add('ds-circle--filled');
    else btn.classList.remove('ds-circle--filled');
  });
}

/** Setup all DOM event listeners */
function setupEventListeners() {
  // Header updates
  elements.name.addEventListener('input', e => character.name = e.target.value);
  elements.race.addEventListener('input', e => character.race = e.target.value);
  elements.charClass.addEventListener('input', e => character.class = e.target.value);
  elements.background.addEventListener('input', e => character.background = e.target.value);
  
  elements.level.addEventListener('change', e => {
    character.level = parseInt(e.target.value) || 1;
    // Level change affects prof bonus, saves, and skills
    updateAllDerivedStats();
  });

  // Ability Score updates
  elements.abilitiesRow.addEventListener('input', e => {
    if (e.target.classList.contains('ability-card__score')) {
      const ability = e.target.id.replace('score-', '');
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 10;
      
      character.attributes[ability] = val;
      updateAllDerivedStats();
    }
  });

  // Save Prof Toggles
  elements.abilitiesRow.addEventListener('click', e => {
    const btn = e.target.closest('.save-toggle');
    if (!btn) return;
    
    const ability = btn.dataset.ability;
    const current = character.savingThrows[ability];
    
    // Toggle: none -> proficient -> none
    const next = current === 'none' ? 'proficient' : 'none';
    character.savingThrows[ability] = next;
    btn.dataset.level = next;
    
    document.getElementById(`save-${ability}`).textContent = formatModifier(calcSaveModifier(character, ability));
  });

  // Skill Prof/Exp Toggles
  elements.skillsList.addEventListener('click', e => {
    const btn = e.target.closest('.skill-toggle');
    if (!btn) return;

    const skill = btn.dataset.skill;
    const current = character.skills[skill];
    
    // Cycle: none -> proficient -> expertise -> none
    let next = 'none';
    if (current === 'none') next = 'proficient';
    else if (current === 'proficient') next = 'expertise';

    character.skills[skill] = next;
    btn.dataset.level = next;
    
    document.getElementById(`skill-mod-${skill}`).textContent = formatModifier(calcSkillModifier(character, skill));
  });

  // Combat Stats
  if (elements.acOverride) {
    elements.acOverride.addEventListener('change', e => {
      const isOverride = e.target.checked;
      elements.ac.disabled = !isOverride;
      
      if (isOverride) {
        character.acOverride = parseInt(elements.ac.value) || 10;
        character.armorClass = character.acOverride;
      } else {
        character.acOverride = null;
        character.armorClass = null;
      }
      updateUI();
    });
  }

  elements.ac.addEventListener('input', e => {
    if (character.acOverride !== null) {
      character.acOverride = parseInt(e.target.value) || 10;
      character.armorClass = character.acOverride;
    }
  });

  elements.speed.addEventListener('input', e => character.speed = parseInt(e.target.value) || 30);

  // HP
  elements.hpMax.addEventListener('input', e => {
    character.hitPoints.max = parseInt(e.target.value) || 0;
    if (character.hitPoints.current > character.hitPoints.max) {
      character.hitPoints.current = character.hitPoints.max;
      elements.hpCurrent.value = character.hitPoints.current;
    }
  });

  elements.hpCurrent.addEventListener('change', e => {
    let valStr = e.target.value.trim();
    if (valStr.startsWith('+') || valStr.startsWith('-')) {
      const num = parseInt(valStr);
      if (!isNaN(num)) {
        character.hitPoints.current += num;
      }
    } else {
      character.hitPoints.current = parseInt(valStr) || 0;
    }

    // Clamp between 0 and Max HP
    if (character.hitPoints.current > character.hitPoints.max) {
      character.hitPoints.current = character.hitPoints.max;
    }
    if (character.hitPoints.current < 0) {
      character.hitPoints.current = 0;
    }
    
    // Update the input field visually
    elements.hpCurrent.value = character.hitPoints.current;
  });

  elements.hpTemp.addEventListener('input', e => character.hitPoints.temporary = parseInt(e.target.value) || 0);

  elements.hitDice.addEventListener('change', e => character.hitDice = e.target.value);
  
  elements.hdSpent.addEventListener('input', e => {
     let val = parseInt(e.target.value) || 0;
     if (val > character.level) val = character.level;
     if (val < 0) val = 0;
     character.hitDiceSpent = val;
     elements.hdSpent.value = val;
  });

  // Death Saves (only if the section exists in the DOM)
  if (elements.deathSaves) {
    elements.deathSaves.addEventListener('click', e => {
      const btn = e.target.closest('.ds-circle');
      if (!btn) return;

      const type = btn.dataset.type; // 'success' or 'failure'
      // Simple version: just cycle through 0-3
      let current = character.deathSaves[type + 'es']; // successes or failures
      if (current >= 3) current = 0;
      else current++;

      character.deathSaves[type + 'es'] = current;
      updateDeathSavesUI();
    });
  }

  // Modules
  elements.addModuleBtn.addEventListener('click', () => {
    character.modules.push({ id: generateId(), title: '', description: '' });
    renderModules();
  });

  elements.modulesList.addEventListener('click', e => {
    if (e.target.classList.contains('module-delete')) {
      const card = e.target.closest('.module-card');
      const index = parseInt(card.dataset.index);
      character.modules.splice(index, 1);
      renderModules();
    }
  });

  elements.modulesList.addEventListener('input', e => {
    const card = e.target.closest('.module-card');
    if (!card) return;
    const index = parseInt(card.dataset.index);
    
    if (e.target.classList.contains('module-input')) {
      character.modules[index].title = e.target.value;
    } else if (e.target.classList.contains('module-textarea')) {
      character.modules[index].description = e.target.value;
    }
  });

  // Notes
  elements.notes.addEventListener('input', e => character.notes = e.target.value);

  // Tabbed Panel switching
  if (elements.panelTabs) {
    elements.panelTabs.addEventListener('click', e => {
      const tab = e.target.closest('.tabbed-panel__tab');
      if (!tab) return;

      const target = tab.dataset.tab; // 'all', 'features', 'notes'

      // Update active tab
      elements.panelTabs.querySelectorAll('.tabbed-panel__tab').forEach(t => t.classList.remove('tabbed-panel__tab--active'));
      tab.classList.add('tabbed-panel__tab--active');

      // Show/hide sections
      const sections = elements.panelBody.querySelectorAll('.tabbed-panel__section');
      sections.forEach(section => {
        if (target === 'all' || section.dataset.section === target) {
          section.classList.remove('tabbed-panel__section--hidden');
        } else {
          section.classList.add('tabbed-panel__section--hidden');
        }
      });
    });
  }

  // Action Bar
  elements.saveBtn.addEventListener('click', handleSave);
  elements.exportBtn.addEventListener('click', handleExport);
}

/** Recalculate all numbers dependent on ability scores or level */
function updateAllDerivedStats() {
  // Update modifiers in Ability Row
  ABILITY_ORDER.forEach(ability => {
    const mod = calcModifier(character.attributes[ability]);
    document.getElementById(`mod-${ability}`).textContent = formatModifier(mod);
    document.getElementById(`save-${ability}`).textContent = formatModifier(calcSaveModifier(character, ability));
  });

  // Update Skills
  Object.keys(SKILL_NAMES).forEach(skill => {
    document.getElementById(`skill-mod-${skill}`).textContent = formatModifier(calcSkillModifier(character, skill));
  });

  updateUI();
}

/** Save character to localStorage and show feedback */
function handleSave() {
  if (!character.name.trim()) {
    showToast('Please enter a character name before saving.', 'error');
    elements.name.focus();
    return;
  }

  try {
    saveCharacter(character);
    showToast(`Character "${character.name}" saved successfully!`);
    
    // Update URL parameter so saving again updates instead of duplicates
    const url = new URL(window.location);
    if (!url.searchParams.has('id')) {
      url.searchParams.set('id', character.id);
      window.history.replaceState({}, '', url);
      elements.exportBtn.style.display = 'inline-flex';
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/** Export the character JSON */
function handleExport() {
  if (!character.name.trim()) return;
  
  const jsonStr = exportCharacter(character.id);
  if (!jsonStr) return;

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${character.name.toLowerCase().replace(/\s+/g, '_')}_dnd.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/** Utility: Escape HTML for modules display */
function escapeHtml(unsafe) {
  return (unsafe || '').replace(/[&<"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '"': return '&quot;';
      default: return '&#039;';
    }
  });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
