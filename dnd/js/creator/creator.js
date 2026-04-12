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
  compList: document.getElementById('comp-list'),
  actionsList: document.getElementById('actions-list'),
  featuresList: document.getElementById('features-list'),

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

  // Inventory
  inventoryGrid: document.getElementById('inventory-grid'),
  addInvItemBtn: document.getElementById('add-inv-item'),
  invTagFilterBtn: document.getElementById('inv-tag-filter-btn'),
  invActiveFilters: document.getElementById('inv-active-filters'),

  // Inventory Description Modal
  invDescModal: document.getElementById('inv-desc-modal'),
  invDescTagList: document.getElementById('inv-desc-tag-list'),
  invCustomTagInput: document.getElementById('inv-custom-tag-input'),
  invCustomTagAdd: document.getElementById('inv-custom-tag-add'),
  invDescTextarea: document.getElementById('inv-desc-textarea'),
  invDescSave: document.getElementById('inv-desc-save'),

  // Tag Filter Modal
  tagFilterModal: document.getElementById('tag-filter-modal'),
  tagFilterList: document.getElementById('tag-filter-list'),
  tagFilterClear: document.getElementById('tag-filter-clear'),
  tagFilterApply: document.getElementById('tag-filter-apply'),

  // Buttons
  addActionBtn: document.getElementById('add-action-module'),
  addFeatureBtn: document.getElementById('add-feature-module'),
  typePickerModal: document.getElementById('type-picker-modal'),
  typePickerGrid: document.getElementById('type-picker-grid'),
  typePickerClose: document.getElementById('type-picker-close'),
  actionsFilters: document.getElementById('actions-filters'),
  featuresFilters: document.getElementById('features-filters'),
  saveBtn: document.getElementById('save-char'),
  exportBtn: document.getElementById('export-char')
};

// Filter States
let activeActionFilters = new Set(['all']);
let activeFeatureFilters = new Set(['all']);
let activeInventoryTagFilters = new Set();
let currentDescItemIndex = null; // index of item currently being edited in desc modal
let tempTagFilterSelection = new Set(); // temporary selection in tag filter modal

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

  // Default unknown module types to 'other'
  if (character && character.modules) {
    character.modules.forEach(m => {
      if (!m.type) m.type = 'other';
    });
  }

  // Ensure inventory and customTags exist for older saved characters
  if (!character.inventory) character.inventory = [];
  if (!character.customTags) character.customTags = [];

  renderAbilities();
  renderSkills();
  renderCompetencies();
  renderModuleLists();
  renderInventory();
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

/** Render competencies list */
function renderCompetencies() {
  const categories = [
    { id: 'weapons', label: 'Weapons', presets: ['Simple', 'Martial'] },
    { id: 'armor', label: 'Armor', presets: ['Light', 'Medium', 'Heavy', 'Shields'] },
    { id: 'tools', label: 'Tools', presets: [] },
    { id: 'languages', label: 'Languages', presets: ['Common'] },
    { id: 'extras', label: 'Extras', presets: [] }
  ];

  if (!character.competencies) {
    character.competencies = { weapons: [], armor: [], tools: [], languages: [], extras: [] };
  }

  if (!elements.compList) return;

  elements.compList.innerHTML = categories.map(cat => {
    const list = character.competencies[cat.id] || [];

    // Filter out presets that are already added
    const availablePresets = cat.presets.filter(p => !list.includes(p));

    const itemsHtml = list.map(item => `
      <span class="comp-item">
        ${escapeHtml(item)}
        <button type="button" class="comp-item-delete" data-category="${cat.id}" data-item="${escapeHtml(item)}">✕</button>
      </span>
    `).join('');

    const presetsHtml = availablePresets.map(p => `
      <button type="button" class="btn--comp comp-preset" data-category="${cat.id}" data-value="${p}">${p}</button>
    `).join('');

    return `
      <div class="comp-category">
        <div class="comp-header">
          <span class="comp-label">${cat.label}</span>
          <div class="comp-items">${itemsHtml}</div>
        </div>
        <div class="comp-controls" id="comp-ctrl-${cat.id}">
          ${presetsHtml}
          <button type="button" class="btn--comp comp-custom-btn" data-category="${cat.id}">+ Custom</button>
        </div>
        <div class="comp-custom-input-group" id="comp-custom-${cat.id}" style="display: none;">
          <input type="text" class="dnd-input comp-custom-input" placeholder="Enter custom ${cat.label.toLowerCase()}">
          <button type="button" class="btn btn--outline comp-custom-add" data-category="${cat.id}" style="padding: 0.25rem 0.5rem; min-width: auto; font-size: 0.8rem;">Add</button>
        </div>
      </div>
    `;
  }).join('');
}

/** Render custom modules split into actions and features */
function renderModuleLists() {
  const renderList = (listEl, groupKey, filters) => {
    if (!listEl) return;
    const isAll = filters.has('all');
    const groupTypes = MODULE_GROUPS[groupKey];

    listEl.innerHTML = character.modules.map((mod, index) => {
      if (!groupTypes.includes(mod.type)) return '';
      if (!isAll && !filters.has(mod.type)) return '';

      const typeDef = MODULE_TYPES[mod.type];
      const shapeHtml = typeDef.shape !== 'none' ? `<span class="badge-shape badge-shape--${typeDef.shape}"></span>` : '';

      return `
        <div class="module-card" data-index="${index}">
          <div class="module-header-row">
            <span class="module-badge" style="border-color: ${typeDef.color}; color: ${typeDef.color}">
              ${shapeHtml}
              ${typeDef.label}
            </span>
            <button type="button" class="module-delete" aria-label="Delete module">✕</button>
          </div>
          <input type="text" class="module-input dnd-input" placeholder="Feature Title" value="${escapeHtml(mod.title)}">
          <textarea class="module-textarea dnd-input" placeholder="Description...">${escapeHtml(mod.description)}</textarea>
        </div>
      `;
    }).join('');
  };

  renderList(elements.actionsList, 'actions', activeActionFilters);
  renderList(elements.featuresList, 'features', activeFeatureFilters);
}

/** Get tag color by id */
function getTagColor(tagId) {
  const preset = INVENTORY_PRESET_TAGS.find(t => t.id === tagId);
  return preset ? preset.color : CUSTOM_TAG_COLOR;
}

/** Get tag label by id */
function getTagLabel(tagId) {
  const preset = INVENTORY_PRESET_TAGS.find(t => t.id === tagId);
  return preset ? preset.label : tagId;
}

/** Get all available tags (preset + custom) */
function getAllTags() {
  const presets = INVENTORY_PRESET_TAGS.map(t => ({ ...t }));
  const customs = (character.customTags || []).map(id => ({
    id,
    label: id,
    color: CUSTOM_TAG_COLOR
  }));
  return [...presets, ...customs];
}

/** Render the inventory grid */
function renderInventory() {
  if (!elements.inventoryGrid) return;

  const filters = activeInventoryTagFilters;
  const hasFilters = filters.size > 0;

  const filteredItems = character.inventory.filter((item, idx) => {
    if (!hasFilters) return true;
    return item.tags && item.tags.some(t => filters.has(t));
  });

  elements.inventoryGrid.innerHTML = filteredItems.length === 0 && hasFilters
    ? `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.9rem;">No items match the selected tags.</div>`
    : character.inventory.map((item, index) => {
      // Skip if filtered out
      if (hasFilters && !(item.tags && item.tags.some(t => filters.has(t)))) return '';

      const tagsHtml = (item.tags || []).map(tagId => {
        const color = getTagColor(tagId);
        const label = getTagLabel(tagId);
        return `<span class="inv-tag" style="background:${color}">#${escapeHtml(label)}</span>`;
      }).join('');

      const hasDesc = item.description && item.description.trim().length > 0;
      const descBtnClass = hasDesc ? 'inv-card__desc-btn inv-card__desc-btn--has-content' : 'inv-card__desc-btn';

      return `
        <div class="inv-card" data-inv-index="${index}">
          <button type="button" class="inv-card__delete" data-inv-delete="${index}" aria-label="Delete item">✕</button>
          <div class="inv-card__tags">${tagsHtml}</div>
          <div class="inv-card__fields">
            <input type="text" class="inv-card__title dnd-input" placeholder="Item name" value="${escapeHtml(item.title)}" data-inv-field="title">
            <button type="button" class="${descBtnClass}" data-inv-desc="${index}" title="Edit description">📝</button>
            <div class="inv-card__field-group">
              <span class="inv-card__qty-label">Qty</span>
              <input type="number" class="inv-card__qty dnd-input" value="${item.quantity}" min="0" data-inv-field="quantity">
            </div>
            <div class="inv-card__field-group">
              <span class="inv-card__weight-label">Lbs</span>
              <input type="number" class="inv-card__weight dnd-input" value="${item.weight}" min="0" step="0.1" data-inv-field="weight">
            </div>
          </div>
        </div>
      `;
    }).join('');

  // Update active filters display
  renderActiveTagFilters();
}

/** Render active tag filter pills in the toolbar */
function renderActiveTagFilters() {
  if (!elements.invActiveFilters) return;

  if (activeInventoryTagFilters.size === 0) {
    elements.invActiveFilters.innerHTML = '';
    if (elements.invTagFilterBtn) elements.invTagFilterBtn.classList.remove('btn--tag-filter--active');
    return;
  }

  if (elements.invTagFilterBtn) elements.invTagFilterBtn.classList.add('btn--tag-filter--active');

  elements.invActiveFilters.innerHTML = Array.from(activeInventoryTagFilters).map(tagId => {
    const color = getTagColor(tagId);
    const label = getTagLabel(tagId);
    return `<span class="inv-active-tag" style="background:${color}">
      #${escapeHtml(label)}
      <button type="button" class="inv-active-tag__remove" data-remove-filter="${escapeHtml(tagId)}">✕</button>
    </span>`;
  }).join('');
}

/** Open description modal for an inventory item */
function openDescModal(itemIndex) {
  currentDescItemIndex = itemIndex;
  const item = character.inventory[itemIndex];
  if (!item) return;

  // Fill textarea
  elements.invDescTextarea.value = item.description || '';

  // Render tag buttons
  renderDescTagList(item);

  elements.invDescModal.classList.remove('hidden');
}

/** Render tag buttons inside the description modal */
function renderDescTagList(item) {
  const allTags = getAllTags();
  const itemTags = new Set(item.tags || []);

  elements.invDescTagList.innerHTML = allTags.map(tag => {
    const isActive = itemTags.has(tag.id);
    const activeClass = isActive ? 'inv-desc-tag-btn--active' : '';
    const bgStyle = isActive ? `background:${tag.color};` : '';
    return `<button type="button" class="inv-desc-tag-btn ${activeClass}" style="${bgStyle}" data-tag-id="${escapeHtml(tag.id)}">
      #${escapeHtml(tag.label)}
    </button>`;
  }).join('');
}

/** Open tag filter modal */
function openTagFilterModal() {
  tempTagFilterSelection = new Set(activeInventoryTagFilters);
  renderTagFilterList();
  elements.tagFilterModal.classList.remove('hidden');
}

/** Render tag buttons inside the filter modal */
function renderTagFilterList() {
  const allTags = getAllTags();

  elements.tagFilterList.innerHTML = allTags.map(tag => {
    const isActive = tempTagFilterSelection.has(tag.id);
    const activeClass = isActive ? 'tag-filter-btn--active' : '';
    const bgStyle = isActive ? `background:${tag.color}; border-color:${tag.color};` : '';
    return `<button type="button" class="tag-filter-btn ${activeClass}" style="${bgStyle}" data-filter-tag="${escapeHtml(tag.id)}">
      <span class="tag-filter-btn__check">✓</span>
      #${escapeHtml(tag.label)}
    </button>`;
  }).join('');
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

  // Competencies
  if (elements.compList) {
    elements.compList.addEventListener('click', e => {
      // Add preset
      if (e.target.classList.contains('comp-preset')) {
        const cat = e.target.dataset.category;
        const val = e.target.dataset.value;
        if (!character.competencies[cat].includes(val)) {
          character.competencies[cat].push(val);
          renderCompetencies();
        }
      }

      // Delete item
      if (e.target.classList.contains('comp-item-delete')) {
        const cat = e.target.dataset.category;
        const val = e.target.dataset.item;
        character.competencies[cat] = character.competencies[cat].filter(i => i !== val);
        renderCompetencies();
      }

      // Show custom input
      if (e.target.classList.contains('comp-custom-btn')) {
        const cat = e.target.dataset.category;
        const inputGroup = document.getElementById(`comp-custom-${cat}`);
        const ctrlGroup = document.getElementById(`comp-ctrl-${cat}`);
        inputGroup.style.display = 'flex';
        ctrlGroup.style.display = 'none';
        inputGroup.querySelector('input').focus();
      }

      // Add custom
      if (e.target.classList.contains('comp-custom-add')) {
        const cat = e.target.dataset.category;
        const input = document.getElementById(`comp-custom-${cat}`).querySelector('input');
        const val = input.value.trim();
        if (val && !character.competencies[cat].includes(val)) {
          character.competencies[cat].push(val);
          renderCompetencies();
        } else if (val === '') {
          // just cancel
          renderCompetencies();
        }
      }
    });

    // Handle Enter key on custom input
    elements.compList.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.classList.contains('comp-custom-input')) {
        e.preventDefault();
        const btn = e.target.nextElementSibling;
        btn.click();
      }
    });
  }

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
  function showTypePicker(groupKey) {
    if (!elements.typePickerGrid) return;
    const types = MODULE_GROUPS[groupKey];
    elements.typePickerGrid.innerHTML = types.map(type => {
      const typeDef = MODULE_TYPES[type];
      const shapeHtml = typeDef.shape !== 'none' ? `<span class="badge-shape badge-shape--${typeDef.shape}"></span>` : '';
      return `
        <button type="button" class="btn--type" data-type="${type}">
          ${shapeHtml}
          ${typeDef.label}
        </button>
      `;
    }).join('');
    elements.typePickerModal.classList.remove('hidden');
  }

  if (elements.addActionBtn) {
    elements.addActionBtn.addEventListener('click', () => showTypePicker('actions'));
  }
  if (elements.addFeatureBtn) {
    elements.addFeatureBtn.addEventListener('click', () => showTypePicker('features'));
  }

  if (elements.typePickerClose) {
    elements.typePickerClose.addEventListener('click', () => {
      elements.typePickerModal.classList.add('hidden');
    });
  }

  if (elements.typePickerGrid) {
    elements.typePickerGrid.addEventListener('click', e => {
      const btn = e.target.closest('.btn--type');
      if (!btn) return;
      const type = btn.dataset.type;
      character.modules.push({ id: generateId(), type: type, title: '', description: '' });
      elements.typePickerModal.classList.add('hidden');
      renderModuleLists();
    });
  }

  elements.panelBody.addEventListener('click', e => {
    if (e.target.classList.contains('module-delete')) {
      const card = e.target.closest('.module-card');
      const index = parseInt(card.dataset.index);
      character.modules.splice(index, 1);
      renderModuleLists();
    }
  });

  elements.panelBody.addEventListener('input', e => {
    const card = e.target.closest('.module-card');
    if (!card) return;
    const index = parseInt(card.dataset.index);

    if (e.target.classList.contains('module-input')) {
      character.modules[index].title = e.target.value;
    } else if (e.target.classList.contains('module-textarea')) {
      character.modules[index].description = e.target.value;
    }
  });

  function setupFilterListeners(container, filterSet) {
    if (!container) return;
    container.addEventListener('click', e => {
      const btn = e.target.closest('.sub-filter');
      if (!btn) return;

      const filter = btn.dataset.filter;

      if (filter === 'all') {
        filterSet.clear();
        filterSet.add('all');
      } else {
        filterSet.delete('all');
        if (filterSet.has(filter)) filterSet.delete(filter);
        else filterSet.add(filter);

        if (filterSet.size === 0) filterSet.add('all');
      }

      container.querySelectorAll('.sub-filter').forEach(f => {
        const fType = f.dataset.filter;
        if (filterSet.has(fType)) f.classList.add('sub-filter--active');
        else f.classList.remove('sub-filter--active');
      });

      renderModuleLists();
    });
  }

  setupFilterListeners(elements.actionsFilters, activeActionFilters);
  setupFilterListeners(elements.featuresFilters, activeFeatureFilters);

  // Notes
  if (elements.notes) {
    elements.notes.addEventListener('input', e => character.notes = e.target.value);
  }

  // Tabbed Panel switching
  if (elements.panelTabs) {
    elements.panelTabs.addEventListener('click', e => {
      const tab = e.target.closest('.tabbed-panel__tab');
      if (!tab) return;

      const target = tab.dataset.tab; // 'actions', 'features', 'notes'

      // Update active tab
      elements.panelTabs.querySelectorAll('.tabbed-panel__tab').forEach(t => t.classList.remove('tabbed-panel__tab--active'));
      tab.classList.add('tabbed-panel__tab--active');

      // Show/hide sections
      const sections = elements.panelBody.querySelectorAll('.tabbed-panel__section');
      sections.forEach(section => {
        if (section.dataset.section === target) {
          section.classList.remove('tabbed-panel__section--hidden');
        } else {
          section.classList.add('tabbed-panel__section--hidden');
        }
      });
    });
  }

  // ===== INVENTORY EVENT LISTENERS =====

  // Add inventory item
  if (elements.addInvItemBtn) {
    elements.addInvItemBtn.addEventListener('click', () => {
      character.inventory.push({
        id: generateId(),
        title: '',
        description: '',
        quantity: 1,
        weight: 0,
        tags: []
      });
      renderInventory();
    });
  }

  // Inventory grid events (delete, description btn, inline editing)
  if (elements.inventoryGrid) {
    elements.inventoryGrid.addEventListener('click', e => {
      // Delete item
      const delBtn = e.target.closest('[data-inv-delete]');
      if (delBtn) {
        const idx = parseInt(delBtn.dataset.invDelete);
        character.inventory.splice(idx, 1);
        renderInventory();
        return;
      }

      // Open description modal
      const descBtn = e.target.closest('[data-inv-desc]');
      if (descBtn) {
        const idx = parseInt(descBtn.dataset.invDesc);
        openDescModal(idx);
        return;
      }
    });

    elements.inventoryGrid.addEventListener('input', e => {
      const card = e.target.closest('.inv-card');
      if (!card) return;
      const idx = parseInt(card.dataset.invIndex);
      const field = e.target.dataset.invField;
      if (!field) return;

      if (field === 'title') {
        character.inventory[idx].title = e.target.value;
      } else if (field === 'quantity') {
        character.inventory[idx].quantity = parseInt(e.target.value) || 0;
      } else if (field === 'weight') {
        character.inventory[idx].weight = parseFloat(e.target.value) || 0;
      }
    });
  }

  // Description modal — toggle tags
  if (elements.invDescTagList) {
    elements.invDescTagList.addEventListener('click', e => {
      const btn = e.target.closest('.inv-desc-tag-btn');
      if (!btn) return;
      const tagId = btn.dataset.tagId;
      if (currentDescItemIndex === null) return;

      const item = character.inventory[currentDescItemIndex];
      if (!item.tags) item.tags = [];

      const idx = item.tags.indexOf(tagId);
      if (idx >= 0) {
        item.tags.splice(idx, 1);
      } else {
        item.tags.push(tagId);
      }

      renderDescTagList(item);
    });
  }

  // Description modal — add custom tag
  if (elements.invCustomTagAdd) {
    const addCustomTag = () => {
      const input = elements.invCustomTagInput;
      let val = input.value.trim();
      if (!val) return;

      // Normalize: remove leading # if present
      if (val.startsWith('#')) val = val.slice(1);
      val = val.trim();
      if (!val) return;

      // Check if already exists (preset or custom)
      const existing = INVENTORY_PRESET_TAGS.find(t => t.id === val || t.label.toLowerCase() === val.toLowerCase());
      if (existing) {
        // Just toggle it on the item
        const item = character.inventory[currentDescItemIndex];
        if (!item.tags.includes(existing.id)) {
          item.tags.push(existing.id);
        }
        renderDescTagList(item);
        input.value = '';
        return;
      }

      // Add as custom tag if not already added
      if (!character.customTags.includes(val)) {
        character.customTags.push(val);
      }

      // Add to current item
      const item = character.inventory[currentDescItemIndex];
      if (!item.tags) item.tags = [];
      if (!item.tags.includes(val)) {
        item.tags.push(val);
      }

      renderDescTagList(item);
      input.value = '';
    };

    elements.invCustomTagAdd.addEventListener('click', addCustomTag);
    elements.invCustomTagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomTag();
      }
    });
  }

  // Description modal — save & close
  if (elements.invDescSave) {
    elements.invDescSave.addEventListener('click', () => {
      if (currentDescItemIndex !== null) {
        character.inventory[currentDescItemIndex].description = elements.invDescTextarea.value;
      }
      elements.invDescModal.classList.add('hidden');
      currentDescItemIndex = null;
      renderInventory();
    });
  }

  // Close desc modal when clicking overlay
  if (elements.invDescModal) {
    elements.invDescModal.addEventListener('click', e => {
      if (e.target === elements.invDescModal) {
        // Save before closing
        if (currentDescItemIndex !== null) {
          character.inventory[currentDescItemIndex].description = elements.invDescTextarea.value;
        }
        elements.invDescModal.classList.add('hidden');
        currentDescItemIndex = null;
        renderInventory();
      }
    });
  }

  // Tag filter button — open filter modal
  if (elements.invTagFilterBtn) {
    elements.invTagFilterBtn.addEventListener('click', () => {
      openTagFilterModal();
    });
  }

  // Tag filter modal — toggle tags
  if (elements.tagFilterList) {
    elements.tagFilterList.addEventListener('click', e => {
      const btn = e.target.closest('.tag-filter-btn');
      if (!btn) return;
      const tagId = btn.dataset.filterTag;

      if (tempTagFilterSelection.has(tagId)) {
        tempTagFilterSelection.delete(tagId);
      } else {
        tempTagFilterSelection.add(tagId);
      }

      renderTagFilterList();
    });
  }

  // Tag filter modal — clear all
  if (elements.tagFilterClear) {
    elements.tagFilterClear.addEventListener('click', () => {
      tempTagFilterSelection.clear();
      renderTagFilterList();
    });
  }

  // Tag filter modal — apply
  if (elements.tagFilterApply) {
    elements.tagFilterApply.addEventListener('click', () => {
      activeInventoryTagFilters = new Set(tempTagFilterSelection);
      elements.tagFilterModal.classList.add('hidden');
      renderInventory();
    });
  }

  // Close tag filter modal when clicking overlay
  if (elements.tagFilterModal) {
    elements.tagFilterModal.addEventListener('click', e => {
      if (e.target === elements.tagFilterModal) {
        elements.tagFilterModal.classList.add('hidden');
      }
    });
  }

  // Remove individual active filter tags from toolbar
  if (elements.invActiveFilters) {
    elements.invActiveFilters.addEventListener('click', e => {
      const removeBtn = e.target.closest('[data-remove-filter]');
      if (!removeBtn) return;
      const tagId = removeBtn.dataset.removeFilter;
      activeInventoryTagFilters.delete(tagId);
      renderInventory();
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
  return (unsafe || '').replace(/[&<"']/g, function (m) {
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
