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

  // Spells
  spellFocusSelector: document.getElementById('spell-focus-selector'),
  spellDC: document.getElementById('spell-dc'),
  spellAtk: document.getElementById('spell-atk'),
  spellGroups: document.getElementById('spell-groups'),
  addSpellGroupBtn: document.getElementById('add-spell-group'),
  spellTagFilterBtn: document.getElementById('spell-tag-filter-btn'),
  spellActiveFilters: document.getElementById('spell-active-filters'),

  // Spell Modals
  spellTypeModal: document.getElementById('spell-type-modal'),
  spellTypeGrid: document.getElementById('spell-type-grid'),
  spellTypeClose: document.getElementById('spell-type-close'),
  spellLevelModal: document.getElementById('spell-level-modal'),
  spellLevelInput: document.getElementById('spell-level-input'),
  spellLevelCancel: document.getElementById('spell-level-cancel'),
  spellLevelConfirm: document.getElementById('spell-level-confirm'),
  spellCustomModal: document.getElementById('spell-custom-modal'),
  spellCustomUses: document.getElementById('spell-custom-uses'),
  spellCustomRecharge: document.getElementById('spell-custom-recharge'),
  spellCustomCancel: document.getElementById('spell-custom-cancel'),
  spellCustomConfirm: document.getElementById('spell-custom-confirm'),
  spellDescModal: document.getElementById('spell-desc-modal'),
  spellDescTagList: document.getElementById('spell-desc-tag-list'),
  spellCustomTagInput: document.getElementById('spell-custom-tag-input'),
  spellCustomTagAdd: document.getElementById('spell-custom-tag-add'),
  spellDescTextarea: document.getElementById('spell-desc-textarea'),
  spellDescSave: document.getElementById('spell-desc-save'),
  spellTagFilterModal: document.getElementById('spell-tag-filter-modal'),
  spellTagFilterList: document.getElementById('spell-tag-filter-list'),
  spellTagFilterClear: document.getElementById('spell-tag-filter-clear'),
  spellTagFilterApply: document.getElementById('spell-tag-filter-apply'),
  spellTooltip: document.getElementById('spell-tooltip'),
  actionTooltip: document.getElementById('action-tooltip'),

  // Module Description Modal
  moduleDescModal: document.getElementById('module-desc-modal'),
  moduleDescTextarea: document.getElementById('module-desc-textarea'),
  moduleDescSave: document.getElementById('module-desc-save'),

  // Module Calc Modal
  moduleCalcModal: document.getElementById('module-calc-modal'),
  moduleCalcType: document.getElementById('module-calc-type'),
  moduleCalcAbility: document.getElementById('module-calc-ability'),
  moduleCalcCancel: document.getElementById('module-calc-cancel'),
  moduleCalcConfirm: document.getElementById('module-calc-confirm'),

  // Custom Skill Modal
  addCustomSkillBtn: document.getElementById('add-custom-skill-btn'),
  customSkillModal: document.getElementById('custom-skill-modal'),
  customSkillName: document.getElementById('custom-skill-name'),
  customSkillAbility: document.getElementById('custom-skill-ability'),
  customSkillCancel: document.getElementById('custom-skill-cancel'),
  customSkillConfirm: document.getElementById('custom-skill-confirm'),

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
let currentDescModuleIndex = null; // index of module currently being edited in desc modal
let currentCalcModuleIndex = null; // index of module being auto-calculated
let tempTagFilterSelection = new Set(); // temporary selection in tag filter modal

// Spell States
let activeSpellTagFilters = new Set();
let currentDescSpellGroupId = null;
let currentDescSpellId = null;
let tempSpellTagFilterSelection = new Set();

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

  // Default unknown module types to 'other' and ensure new fields exist
  if (character && character.modules) {
    character.modules.forEach(m => {
      if (!m.type) m.type = 'other';
      if (m.dealsDamage === undefined) m.dealsDamage = false;
      if (m.attackBonus === undefined) m.attackBonus = '';
      if (m.damageOrEffect === undefined) m.damageOrEffect = '';
      if (m.calcType === undefined) m.calcType = 'none';
      if (m.calcAbility === undefined) m.calcAbility = 'strength';
    });
  }

  // Ensure inventory and customTags exist for older saved characters
  if (!character.inventory) character.inventory = [];
  if (!character.customTags) character.customTags = [];

  // Ensure spellcasting exists for older saved characters
  if (!character.spellcasting) {
    character.spellcasting = { focus: null, groups: [], customTags: [] };
  }
  if (!character.spellcasting.groups) character.spellcasting.groups = [];
  if (!character.spellcasting.customTags) character.spellcasting.customTags = [];

  renderAbilities();
  renderSkills();
  renderCompetencies();
  renderModuleLists();
  renderInventory();
  renderSpells();
  updateSpellStats();
  updateSpellFocusUI();
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

  let html = skillKeys.map(skill => {
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

  if (character.customSkills && character.customSkills.length > 0) {
    html += '<div style="margin: 0.5rem 0; border-top: 1px solid var(--border-color);"></div>';
    html += character.customSkills.map(cSkill => {
      const abbr = ABILITY_ABBR[cSkill.ability];
      const mod = calcCustomSkillModifier(character, cSkill);
      return `
        <div class="skill-row custom-skill-row" style="position: relative; padding-right: 1.5rem;">
          <button type="button" class="prof-dot-btn skill-toggle" data-custom-skill="${cSkill.id}" data-level="${cSkill.level}" aria-label="Toggle custom skill proficiency">
            <span class="prof-dot"></span>
            <span class="prof-dot"></span>
          </button>
          <span class="skill-row__name" style="color: var(--text-base);">${escapeHtml(cSkill.name)}</span>
          <span class="skill-row__ability">(${abbr})</span>
          <span class="skill-row__mod" id="custom-skill-mod-${cSkill.id}">${formatModifier(mod)}</span>
          <button type="button" class="skill-delete-btn" data-custom-skill-del="${cSkill.id}" style="position: absolute; right: 0; font-size: 0.7rem; color: var(--text-muted); background: transparent; border: none; cursor: pointer; padding: 0.2rem;" aria-label="Delete Custom Skill">✕</button>
        </div>
      `;
    }).join('');
  }

  elements.skillsList.innerHTML = html;
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
    const isActionsGroup = groupKey === 'actions';

    listEl.innerHTML = character.modules.map((mod, index) => {
      if (!groupTypes.includes(mod.type)) return '';
      if (!isAll && !filters.has(mod.type)) return '';

      const typeDef = MODULE_TYPES[mod.type];
      const shapeHtml = typeDef.shape !== 'none' ? `<span class="badge-shape badge-shape--${typeDef.shape}"></span>` : '';

      const hasDesc = mod.description && mod.description.trim().length > 0;
      const descBtnClass = hasDesc ? 'module-card__desc-btn module-card__desc-btn--has-content' : 'module-card__desc-btn';

      // Damage row (only for action group)
      let damageRowHtml = '';
      let damageCheckHtml = '';
      if (isActionsGroup) {
        const checked = mod.dealsDamage ? 'checked' : '';
        const fieldsStyle = mod.dealsDamage ? '' : 'style="display:none;"';

        damageCheckHtml = `
          <label class="module-calc-toggle" style="margin-left: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.65rem; color: var(--text-muted); cursor: pointer;" title="Toggle Damage/Effect Fields">
            <input type="checkbox" data-mod-damage-check ${checked} style="accent-color: var(--accent-1); cursor: pointer;">
            ⚔️
          </label>
        `;

        damageRowHtml = `
          <div class="module-card__damage-row" ${fieldsStyle}>
            <div class="module-card__damage-fields" style="grid-template-columns: 85px 1fr; gap: 0.5rem;">
              <div class="module-card__damage-field">
                <div style="display:flex; justify-content: space-between; width: 100%;">
                  <span class="module-card__damage-field-label">Atk / CD</span>
                  <button type="button" class="module-calc-btn" data-mod-calc="${index}" style="font-size: 0.6rem; background: transparent; border: none; cursor: pointer; color: var(--text-muted);" title="Auto Calculate">⚙️</button>
                </div>
                <input type="text" class="module-card__damage-input dnd-input" placeholder="+7 / 15" value="${escapeHtml(mod.attackBonus || '')}" data-mod-field="attackBonus" ${mod.calcType !== 'none' ? 'readonly' : ''}>
              </div>
              <div class="module-card__damage-field">
                <span class="module-card__damage-field-label">Dmg / Effect</span>
                <input type="text" class="module-card__damage-input dnd-input" placeholder="4d6 / Stun" value="${escapeHtml(mod.damageOrEffect || '')}" data-mod-field="damageOrEffect">
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="module-card" data-index="${index}">
          <div class="module-header-row">
            <div style="display: flex; align-items: center;">
              <span class="module-badge" style="border-color: ${typeDef.color}; color: ${typeDef.color}">
                ${shapeHtml}
                ${typeDef.label}
              </span>
              ${damageCheckHtml}
            </div>
            <button type="button" class="module-delete" aria-label="Delete module">✕</button>
          </div>
          <div class="module-card__fields">
            <input type="text" class="module-input dnd-input" placeholder="Title" value="${escapeHtml(mod.title)}">
            <button type="button" class="${descBtnClass}" data-mod-desc="${index}" title="Edit description">📝</button>
          </div>
          ${damageRowHtml}
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

/** Open description modal for a module (action/feature) */
function openModuleDescModal(modIndex) {
  currentDescModuleIndex = modIndex;
  const mod = character.modules[modIndex];
  if (!mod) return;

  elements.moduleDescTextarea.value = mod.description || '';
  elements.moduleDescModal.classList.remove('hidden');
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

// ===== SPELLS RENDERING =====

/** Get spell tag color by id */
function getSpellTagColor(tagId) {
  const preset = SPELL_PRESET_TAGS.find(t => t.id === tagId);
  return preset ? preset.color : CUSTOM_SPELL_TAG_COLOR;
}

/** Get spell tag label by id */
function getSpellTagLabel(tagId) {
  const preset = SPELL_PRESET_TAGS.find(t => t.id === tagId);
  return preset ? preset.label : tagId;
}

/** Get all available spell tags (preset + custom) */
function getAllSpellTags() {
  const presets = SPELL_PRESET_TAGS.map(t => ({ ...t }));
  const customs = (character.spellcasting.customTags || []).map(id => ({
    id,
    label: id,
    color: CUSTOM_SPELL_TAG_COLOR
  }));
  return [...presets, ...customs];
}

/** Render all spell groups */
function renderSpells() {
  if (!elements.spellGroups) return;

  const groups = character.spellcasting.groups;
  const hasTagFilters = activeSpellTagFilters.size > 0;

  if (groups.length === 0) {
    elements.spellGroups.innerHTML = '';
    renderActiveSpellTagFilters();
    return;
  }

  elements.spellGroups.innerHTML = groups.map(group => {
    // Build header badge
    let badgeHtml = '';
    let groupTitle = '';

    if (group.type === 'cantrip') {
      const color = getSpellLevelColor(0);
      badgeHtml = `<span class="spell-group__level-badge" style="background:${color}">Cantrips</span>`;
    } else if (group.type === 'level') {
      const color = getSpellLevelColor(group.level);
      const ordinal = group.level === 1 ? '1st' : group.level === 2 ? '2nd' : group.level === 3 ? '3rd' : `${group.level}th`;
      badgeHtml = `<span class="spell-group__level-badge" style="background:${color}">${ordinal} Level</span>`;
    } else if (group.type === 'custom') {
      badgeHtml = `<span class="spell-group__custom-badge">${group.uses || '?'} / ${escapeHtml(group.recharge || '?')}</span>`;
      groupTitle = group.label ? `<span class="spell-group__title">${escapeHtml(group.label)}</span>` : '';
    }

    // Build spell items — filter if tags are active
    const spellsHtml = (group.spells || []).map(spell => {
      // Tag filtering
      if (hasTagFilters) {
        const spellTags = spell.tags || [];
        const matchesAny = spellTags.some(t => activeSpellTagFilters.has(t));
        if (!matchesAny) return '';
      }

      const tagsHtml = (spell.tags || []).map(tagId => {
        const color = getSpellTagColor(tagId);
        return `<span class="spell-item__tag" style="background:${color}">${escapeHtml(getSpellTagLabel(tagId))}</span>`;
      }).join('');

      const hasDesc = spell.description && spell.description.trim().length > 0;
      const descBtnClass = hasDesc ? 'spell-item__desc-btn spell-item__desc-btn--has-content' : 'spell-item__desc-btn';

      return `
        <div class="spell-item" data-group-id="${group.id}" data-spell-id="${spell.id}">
          <input type="text" class="spell-item__name" placeholder="Spell name" value="${escapeHtml(spell.name)}" data-spell-name>
          <div class="spell-item__tags">${tagsHtml}</div>
          <button type="button" class="${descBtnClass}" data-spell-desc="${spell.id}" data-spell-group="${group.id}" title="Edit spell details">📝</button>
          <button type="button" class="spell-item__delete" data-spell-del="${spell.id}" data-spell-del-group="${group.id}" aria-label="Delete spell">✕</button>
        </div>
      `;
    }).join('');

    return `
      <div class="spell-group-card" data-group-id="${group.id}">
        <div class="spell-group__header">
          <div class="spell-group__header-left">
            ${badgeHtml}
            ${groupTitle}
          </div>
          <div class="spell-group__header-right">
            <button type="button" class="spell-group__delete" data-del-group="${group.id}" aria-label="Delete group">✕</button>
          </div>
        </div>
        <div class="spell-items">${spellsHtml}</div>
        <button type="button" class="spell-group__add" data-add-spell="${group.id}">+ Add Spell</button>
      </div>
    `;
  }).join('');

  renderActiveSpellTagFilters();
}

/** Update Spell DC & Attack badges */
function updateSpellStats() {
  if (!elements.spellDC || !elements.spellAtk) return;

  const dc = calcSpellDC(character);
  const atk = calcSpellAttack(character);

  elements.spellDC.textContent = dc !== null ? dc : '—';
  elements.spellAtk.textContent = atk !== null ? formatModifier(atk) : '—';
}

/** Update focus selector button states */
function updateSpellFocusUI() {
  if (!elements.spellFocusSelector) return;
  const focus = character.spellcasting.focus;

  elements.spellFocusSelector.querySelectorAll('.spell-focus-btn').forEach(btn => {
    if (btn.dataset.focus === focus) {
      btn.classList.add('spell-focus-btn--active');
    } else {
      btn.classList.remove('spell-focus-btn--active');
    }
  });
}

/** Open spell description modal */
function openSpellDescModal(groupId, spellId) {
  currentDescSpellGroupId = groupId;
  currentDescSpellId = spellId;

  const group = character.spellcasting.groups.find(g => g.id === groupId);
  if (!group) return;
  const spell = group.spells.find(s => s.id === spellId);
  if (!spell) return;

  elements.spellDescTextarea.value = spell.description || '';
  renderSpellDescTagList(spell);
  elements.spellDescModal.classList.remove('hidden');
}

/** Render spell tag buttons inside description modal */
function renderSpellDescTagList(spell) {
  const allTags = getAllSpellTags();
  const spellTags = new Set(spell.tags || []);

  elements.spellDescTagList.innerHTML = allTags.map(tag => {
    const isActive = spellTags.has(tag.id);
    const activeClass = isActive ? 'inv-desc-tag-btn--active' : '';
    const bgStyle = isActive ? `background:${tag.color};` : '';
    return `<button type="button" class="inv-desc-tag-btn ${activeClass}" style="${bgStyle}" data-spell-tag-toggle="${escapeHtml(tag.id)}">
      #${escapeHtml(tag.label)}
    </button>`;
  }).join('');
}

/** Open spell tag filter modal */
function openSpellTagFilterModal() {
  tempSpellTagFilterSelection = new Set(activeSpellTagFilters);
  renderSpellTagFilterList();
  elements.spellTagFilterModal.classList.remove('hidden');
}

/** Render spell tag filter buttons */
function renderSpellTagFilterList() {
  const allTags = getAllSpellTags();

  elements.spellTagFilterList.innerHTML = allTags.map(tag => {
    const isActive = tempSpellTagFilterSelection.has(tag.id);
    const activeClass = isActive ? 'tag-filter-btn--active' : '';
    const bgStyle = isActive ? `background:${tag.color}; border-color:${tag.color};` : '';
    return `<button type="button" class="tag-filter-btn ${activeClass}" style="${bgStyle}" data-spell-filter-tag="${escapeHtml(tag.id)}">
      <span class="tag-filter-btn__check">✓</span>
      #${escapeHtml(tag.label)}
    </button>`;
  }).join('');
}

/** Render active spell tag filter pills */
function renderActiveSpellTagFilters() {
  if (!elements.spellActiveFilters) return;

  if (activeSpellTagFilters.size === 0) {
    elements.spellActiveFilters.innerHTML = '';
    if (elements.spellTagFilterBtn) elements.spellTagFilterBtn.classList.remove('btn--tag-filter--active');
    return;
  }

  if (elements.spellTagFilterBtn) elements.spellTagFilterBtn.classList.add('btn--tag-filter--active');

  elements.spellActiveFilters.innerHTML = Array.from(activeSpellTagFilters).map(tagId => {
    const color = getSpellTagColor(tagId);
    const label = getSpellTagLabel(tagId);
    return `<span class="inv-active-tag" style="background:${color}">
      #${escapeHtml(label)}
      <button type="button" class="inv-active-tag__remove" data-remove-spell-filter="${escapeHtml(tagId)}">✕</button>
    </span>`;
  }).join('');
}

/** Show spell tooltip on hover */
function showSpellTooltip(e, groupId, spellId) {
  const group = character.spellcasting.groups.find(g => g.id === groupId);
  if (!group) return;
  const spell = group.spells.find(s => s.id === spellId);
  if (!spell) return;

  // Only show if description or tags exist
  if ((!spell.description || !spell.description.trim()) && (!spell.tags || spell.tags.length === 0)) return;

  const tooltip = elements.spellTooltip;

  let html = '';
  if (spell.name) {
    html += `<div class="spell-tooltip__title">${escapeHtml(spell.name)}</div>`;
  }
  if (spell.tags && spell.tags.length > 0) {
    const tagsHtml = spell.tags.map(tagId => {
      const color = getSpellTagColor(tagId);
      return `<span class="spell-item__tag" style="background:${color}">${escapeHtml(getSpellTagLabel(tagId))}</span>`;
    }).join('');
    html += `<div class="spell-tooltip__tags">${tagsHtml}</div>`;
  }
  if (spell.description && spell.description.trim()) {
    html += `<div class="spell-tooltip__body">${escapeHtml(spell.description)}</div>`;
  }

  tooltip.innerHTML = html;

  // Position near the cursor
  const rect = e.target.closest('.spell-item').getBoundingClientRect();
  let left = rect.right + 10;
  let top = rect.top;

  // Keep tooltip within viewport
  if (left + 350 > window.innerWidth) {
    left = rect.left - 350;
    if (left < 0) left = 10;
  }
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 220;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  tooltip.classList.add('spell-tooltip--visible');
}

/** Hide spell tooltip */
function hideSpellTooltip() {
  if (elements.spellTooltip) {
    elements.spellTooltip.classList.remove('spell-tooltip--visible');
  }
}

/** Show action tooltip on hover */
function showActionTooltip(e, modIndex) {
  const mod = character.modules[modIndex];
  if (!mod) return;

  // Only show if description exists
  if (!mod.description || !mod.description.trim()) return;

  const tooltip = elements.actionTooltip;
  const typeDef = MODULE_TYPES[mod.type];

  let html = '';
  if (mod.title) {
    html += `<div class="spell-tooltip__title">${escapeHtml(mod.title)}</div>`;
  }
  if (typeDef) {
    html += `<div class="spell-tooltip__tags"><span class="spell-item__tag" style="background:${typeDef.color}">${typeDef.label}</span></div>`;
  }
  html += `<div class="spell-tooltip__body">${escapeHtml(mod.description)}</div>`;

  tooltip.innerHTML = html;

  // Position near the card
  const rect = e.target.closest('.module-card').getBoundingClientRect();
  let left = rect.right + 10;
  let top = rect.top;

  // Keep tooltip within viewport
  if (left + 350 > window.innerWidth) {
    left = rect.left - 350;
    if (left < 0) left = 10;
  }
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 220;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  tooltip.classList.add('spell-tooltip--visible');
}

/** Hide action tooltip */
function hideActionTooltip() {
  if (elements.actionTooltip) {
    elements.actionTooltip.classList.remove('spell-tooltip--visible');
  }
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

  if (character.hitDiceSpent === undefined) character.hitDiceSpent = character.level;
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
    const oldLevel = character.level;
    character.level = parseInt(e.target.value) || 1;
    const delta = character.level - oldLevel;

    // Adjust available hit dice by the level delta
    if (character.hitDiceSpent === undefined) character.hitDiceSpent = character.level;
    else {
      character.hitDiceSpent += delta;
      if (character.hitDiceSpent < 0) character.hitDiceSpent = 0;
      if (character.hitDiceSpent > character.level) character.hitDiceSpent = character.level;
    }

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
    // Delete Custom Skill
    const delBtn = e.target.closest('[data-custom-skill-del]');
    if (delBtn) {
      const id = delBtn.dataset.customSkillDel;
      character.customSkills = character.customSkills.filter(s => s.id !== id);
      renderSkills();
      return;
    }

    const btn = e.target.closest('.skill-toggle');
    if (!btn) return;

    const skill = btn.dataset.skill;
    const customId = btn.dataset.customSkill;

    // Cycle: none -> proficient -> expertise -> none
    function cycleProf(current) {
      if (current === 'none') return 'proficient';
      if (current === 'proficient') return 'expertise';
      return 'none';
    }

    let next;
    if (skill) {
      const current = character.skills[skill];
      next = cycleProf(current);
      character.skills[skill] = next;
      btn.dataset.level = next;
      document.getElementById(`skill-mod-${skill}`).textContent = formatModifier(calcSkillModifier(character, skill));
    } else if (customId) {
      const cs = character.customSkills.find(s => s.id === customId);
      if (cs) {
        next = cycleProf(cs.level);
        cs.level = next;
        btn.dataset.level = next;
        document.getElementById(`custom-skill-mod-${customId}`).textContent = formatModifier(calcCustomSkillModifier(character, cs));
      }
    }
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

  elements.hpCurrent.addEventListener('focus', e => e.target.select());
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

  elements.hpTemp.addEventListener('focus', e => e.target.select());
  elements.hpTemp.addEventListener('change', e => {
    let valStr = e.target.value.trim();
    if (valStr.startsWith('-')) {
      const damage = -parseInt(valStr);
      if (!isNaN(damage)) {
        if (damage > character.hitPoints.temporary) {
          const remainingDamage = damage - character.hitPoints.temporary;
          character.hitPoints.temporary = 0;
          character.hitPoints.current -= remainingDamage;
          if (character.hitPoints.current < 0) character.hitPoints.current = 0;
          elements.hpCurrent.value = character.hitPoints.current;
        } else {
          character.hitPoints.temporary -= damage;
        }
      }
    } else if (valStr.startsWith('+')) {
      const num = parseInt(valStr);
      if (!isNaN(num)) {
        character.hitPoints.temporary += num;
      }
    } else {
      character.hitPoints.temporary = parseInt(valStr) || 0;
    }

    if (character.hitPoints.temporary < 0) {
      character.hitPoints.temporary = 0;
    }

    elements.hpTemp.value = character.hitPoints.temporary;
  });

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
      character.modules.push({
        id: generateId(),
        type: type,
        title: '',
        description: '',
        dealsDamage: false,
        attackBonus: '',
        damageOrEffect: '',
        calcType: 'none',
        calcAbility: 'strength'
      });
      elements.typePickerModal.classList.add('hidden');
      renderModuleLists();
    });
  }

  elements.panelBody.addEventListener('click', e => {
    // Delete module
    if (e.target.classList.contains('module-delete')) {
      const card = e.target.closest('.module-card');
      const index = parseInt(card.dataset.index);
      character.modules.splice(index, 1);
      renderModuleLists();
      return;
    }

    // Open calc modal
    const calcBtn = e.target.closest('[data-mod-calc]');
    if (calcBtn) {
      const idx = parseInt(calcBtn.dataset.modCalc);
      currentCalcModuleIndex = idx;
      const mod = character.modules[idx];
      elements.moduleCalcType.value = mod.calcType || 'none';
      elements.moduleCalcAbility.value = mod.calcAbility || 'strength';
      elements.moduleCalcModal.classList.remove('hidden');
      return;
    }

    // Open description modal for module
    const descBtn = e.target.closest('[data-mod-desc]');
    if (descBtn) {
      const idx = parseInt(descBtn.dataset.modDesc);
      openModuleDescModal(idx);
      return;
    }
  });

  elements.panelBody.addEventListener('input', e => {
    const card = e.target.closest('.module-card');
    if (!card) return;
    const index = parseInt(card.dataset.index);

    if (e.target.classList.contains('module-input')) {
      character.modules[index].title = e.target.value;
    } else if (e.target.dataset.modField === 'attackBonus') {
      character.modules[index].attackBonus = e.target.value;
    } else if (e.target.dataset.modField === 'damageOrEffect') {
      character.modules[index].damageOrEffect = e.target.value;
    }
  });

  // Damage checkbox toggle
  elements.panelBody.addEventListener('change', e => {
    if (e.target.hasAttribute('data-mod-damage-check')) {
      const card = e.target.closest('.module-card');
      if (!card) return;
      const index = parseInt(card.dataset.index);
      character.modules[index].dealsDamage = e.target.checked;

      // Show/hide damage row explicitly
      const row = card.querySelector('.module-card__damage-row');
      if (row) {
        row.style.display = e.target.checked ? '' : 'none';
      }
    }
  });

  // Action tooltip on hover
  elements.panelBody.addEventListener('mouseenter', e => {
    const card = e.target.closest('.module-card');
    if (!card) return;
    const index = parseInt(card.dataset.index);
    showActionTooltip(e, index);
  }, true);

  elements.panelBody.addEventListener('mouseleave', e => {
    const card = e.target.closest('.module-card');
    if (!card) return;
    hideActionTooltip();
  }, true);

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

  // Module description modal — save & close
  if (elements.moduleDescSave) {
    elements.moduleDescSave.addEventListener('click', () => {
      if (currentDescModuleIndex !== null) {
        character.modules[currentDescModuleIndex].description = elements.moduleDescTextarea.value;
      }
      elements.moduleDescModal.classList.add('hidden');
      currentDescModuleIndex = null;
      renderModuleLists();
    });
  }

  // Close module desc modal when clicking overlay
  if (elements.moduleDescModal) {
    elements.moduleDescModal.addEventListener('click', e => {
      if (e.target === elements.moduleDescModal) {
        if (currentDescModuleIndex !== null) {
          character.modules[currentDescModuleIndex].description = elements.moduleDescTextarea.value;
        }
        elements.moduleDescModal.classList.add('hidden');
        currentDescModuleIndex = null;
        renderModuleLists();
      }
    });
  }

  // Module calculation modal — cancel & apply
  if (elements.moduleCalcCancel) {
    elements.moduleCalcCancel.addEventListener('click', () => {
      elements.moduleCalcModal.classList.add('hidden');
      currentCalcModuleIndex = null;
    });
  }

  if (elements.moduleCalcConfirm) {
    elements.moduleCalcConfirm.addEventListener('click', () => {
      if (currentCalcModuleIndex !== null) {
        const mod = character.modules[currentCalcModuleIndex];
        const oldType = mod.calcType;
        mod.calcType = elements.moduleCalcType.value;
        mod.calcAbility = elements.moduleCalcAbility.value;

        // Reset to empty when switching from automated to manual
        if (mod.calcType === 'none' && oldType !== 'none') {
          mod.attackBonus = '';
        }
      }
      elements.moduleCalcModal.classList.add('hidden');
      currentCalcModuleIndex = null;
      updateAllDerivedStats(); // recalculate and re-render
    });
  }

  // Close calc modal when clicking overlay
  if (elements.moduleCalcModal) {
    elements.moduleCalcModal.addEventListener('click', e => {
      if (e.target === elements.moduleCalcModal) {
        elements.moduleCalcModal.classList.add('hidden');
        currentCalcModuleIndex = null;
      }
    });
  }

  // Custom Skill Modal Add
  if (elements.addCustomSkillBtn) {
    elements.addCustomSkillBtn.addEventListener('click', () => {
      elements.customSkillName.value = '';
      elements.customSkillAbility.value = 'strength'; // default
      elements.customSkillModal.classList.remove('hidden');
    });
  }

  if (elements.customSkillCancel) {
    elements.customSkillCancel.addEventListener('click', () => {
      elements.customSkillModal.classList.add('hidden');
    });
  }

  if (elements.customSkillConfirm) {
    elements.customSkillConfirm.addEventListener('click', () => {
      const title = elements.customSkillName.value.trim();
      if (!title) return;

      if (!character.customSkills) character.customSkills = [];

      character.customSkills.push({
        id: generateId(),
        name: title,
        ability: elements.customSkillAbility.value,
        level: 'proficient'
      });

      elements.customSkillModal.classList.add('hidden');
      renderSkills();
    });
  }

  if (elements.customSkillModal) {
    elements.customSkillModal.addEventListener('click', e => {
      if (e.target === elements.customSkillModal) {
        elements.customSkillModal.classList.add('hidden');
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

  // ===== SPELL EVENT LISTENERS =====

  // Spell Focus Selector
  if (elements.spellFocusSelector) {
    elements.spellFocusSelector.addEventListener('click', e => {
      const btn = e.target.closest('.spell-focus-btn');
      if (!btn) return;
      const focus = btn.dataset.focus;

      // Toggle: if already selected, deselect
      if (character.spellcasting.focus === focus) {
        character.spellcasting.focus = null;
      } else {
        character.spellcasting.focus = focus;
      }

      updateSpellFocusUI();
      updateSpellStats();
    });
  }

  // Add Spell Group button — open type picker modal
  if (elements.addSpellGroupBtn) {
    elements.addSpellGroupBtn.addEventListener('click', () => {
      elements.spellTypeModal.classList.remove('hidden');
    });
  }

  // Spell type picker — close
  if (elements.spellTypeClose) {
    elements.spellTypeClose.addEventListener('click', () => {
      elements.spellTypeModal.classList.add('hidden');
    });
  }

  // Spell type picker — overlay close
  if (elements.spellTypeModal) {
    elements.spellTypeModal.addEventListener('click', e => {
      if (e.target === elements.spellTypeModal) {
        elements.spellTypeModal.classList.add('hidden');
      }
    });
  }

  // Spell type picker — select type
  if (elements.spellTypeGrid) {
    elements.spellTypeGrid.addEventListener('click', e => {
      const btn = e.target.closest('[data-spell-type]');
      if (!btn) return;
      const type = btn.dataset.spellType;

      elements.spellTypeModal.classList.add('hidden');

      if (type === 'cantrip') {
        character.spellcasting.groups.push({
          id: generateId(),
          type: 'cantrip',
          spells: []
        });
        renderSpells();
      } else if (type === 'level') {
        elements.spellLevelInput.value = 1;
        elements.spellLevelModal.classList.remove('hidden');
      } else if (type === 'custom') {
        elements.spellCustomUses.value = 1;
        elements.spellCustomRecharge.value = '';
        elements.spellCustomModal.classList.remove('hidden');
      }
    });
  }

  // Spell level picker — confirm
  if (elements.spellLevelConfirm) {
    elements.spellLevelConfirm.addEventListener('click', () => {
      let level = parseInt(elements.spellLevelInput.value);
      if (isNaN(level) || level < 1) level = 1;

      character.spellcasting.groups.push({
        id: generateId(),
        type: 'level',
        level: level,
        spells: []
      });

      elements.spellLevelModal.classList.add('hidden');
      renderSpells();
    });
  }

  // Spell level picker — cancel
  if (elements.spellLevelCancel) {
    elements.spellLevelCancel.addEventListener('click', () => {
      elements.spellLevelModal.classList.add('hidden');
    });
  }

  // Spell level modal — overlay close
  if (elements.spellLevelModal) {
    elements.spellLevelModal.addEventListener('click', e => {
      if (e.target === elements.spellLevelModal) {
        elements.spellLevelModal.classList.add('hidden');
      }
    });
  }

  // Custom spell group — confirm
  if (elements.spellCustomConfirm) {
    elements.spellCustomConfirm.addEventListener('click', () => {
      let uses = parseInt(elements.spellCustomUses.value);
      if (isNaN(uses) || uses < 1) uses = 1;
      const recharge = elements.spellCustomRecharge.value.trim() || 'Rest';

      character.spellcasting.groups.push({
        id: generateId(),
        type: 'custom',
        uses: uses,
        recharge: recharge,
        spells: []
      });

      elements.spellCustomModal.classList.add('hidden');
      renderSpells();
    });
  }

  // Custom spell group — cancel
  if (elements.spellCustomCancel) {
    elements.spellCustomCancel.addEventListener('click', () => {
      elements.spellCustomModal.classList.add('hidden');
    });
  }

  // Custom spell modal — overlay close
  if (elements.spellCustomModal) {
    elements.spellCustomModal.addEventListener('click', e => {
      if (e.target === elements.spellCustomModal) {
        elements.spellCustomModal.classList.add('hidden');
      }
    });
  }

  // Spell groups container — delegated events
  if (elements.spellGroups) {
    // Click events: delete group, add spell, delete spell, open desc modal
    elements.spellGroups.addEventListener('click', e => {
      // Delete group
      const delGroupBtn = e.target.closest('[data-del-group]');
      if (delGroupBtn) {
        const groupId = delGroupBtn.dataset.delGroup;
        character.spellcasting.groups = character.spellcasting.groups.filter(g => g.id !== groupId);
        renderSpells();
        return;
      }

      // Add spell to group
      const addSpellBtn = e.target.closest('[data-add-spell]');
      if (addSpellBtn) {
        const groupId = addSpellBtn.dataset.addSpell;
        const group = character.spellcasting.groups.find(g => g.id === groupId);
        if (group) {
          group.spells.push({
            id: generateId(),
            name: '',
            description: '',
            tags: []
          });
          renderSpells();
          // Focus the new spell name input
          const groupCard = elements.spellGroups.querySelector(`[data-group-id="${groupId}"]`);
          if (groupCard) {
            const inputs = groupCard.querySelectorAll('.spell-item__name');
            const lastInput = inputs[inputs.length - 1];
            if (lastInput) lastInput.focus();
          }
        }
        return;
      }

      // Delete spell
      const delSpellBtn = e.target.closest('[data-spell-del]');
      if (delSpellBtn) {
        const spellId = delSpellBtn.dataset.spellDel;
        const groupId = delSpellBtn.dataset.spellDelGroup;
        const group = character.spellcasting.groups.find(g => g.id === groupId);
        if (group) {
          group.spells = group.spells.filter(s => s.id !== spellId);
          renderSpells();
        }
        return;
      }

      // Open spell desc modal
      const descBtn = e.target.closest('[data-spell-desc]');
      if (descBtn) {
        const spellId = descBtn.dataset.spellDesc;
        const groupId = descBtn.dataset.spellGroup;
        openSpellDescModal(groupId, spellId);
        return;
      }
    });

    // Inline spell name editing
    elements.spellGroups.addEventListener('input', e => {
      if (e.target.hasAttribute('data-spell-name')) {
        const item = e.target.closest('.spell-item');
        if (!item) return;
        const groupId = item.dataset.groupId;
        const spellId = item.dataset.spellId;
        const group = character.spellcasting.groups.find(g => g.id === groupId);
        if (group) {
          const spell = group.spells.find(s => s.id === spellId);
          if (spell) spell.name = e.target.value;
        }
      }
    });

    // Hover tooltip
    elements.spellGroups.addEventListener('mouseenter', e => {
      const item = e.target.closest('.spell-item');
      if (!item) return;
      showSpellTooltip(e, item.dataset.groupId, item.dataset.spellId);
    }, true);

    elements.spellGroups.addEventListener('mouseleave', e => {
      const item = e.target.closest('.spell-item');
      if (!item) return;
      hideSpellTooltip();
    }, true);
  }

  // Spell desc modal — toggle tags
  if (elements.spellDescTagList) {
    elements.spellDescTagList.addEventListener('click', e => {
      const btn = e.target.closest('[data-spell-tag-toggle]');
      if (!btn) return;
      const tagId = btn.dataset.spellTagToggle;
      if (!currentDescSpellGroupId || !currentDescSpellId) return;

      const group = character.spellcasting.groups.find(g => g.id === currentDescSpellGroupId);
      if (!group) return;
      const spell = group.spells.find(s => s.id === currentDescSpellId);
      if (!spell) return;

      if (!spell.tags) spell.tags = [];
      const idx = spell.tags.indexOf(tagId);
      if (idx >= 0) {
        spell.tags.splice(idx, 1);
      } else {
        spell.tags.push(tagId);
      }

      renderSpellDescTagList(spell);
    });
  }

  // Spell desc modal — add custom tag
  if (elements.spellCustomTagAdd) {
    const addSpellCustomTag = () => {
      const input = elements.spellCustomTagInput;
      let val = input.value.trim();
      if (!val) return;
      if (val.startsWith('#')) val = val.slice(1);
      val = val.trim();
      if (!val) return;

      // Check if already a preset
      const existing = SPELL_PRESET_TAGS.find(t => t.id === val || t.label.toLowerCase() === val.toLowerCase());
      if (existing) {
        const group = character.spellcasting.groups.find(g => g.id === currentDescSpellGroupId);
        if (group) {
          const spell = group.spells.find(s => s.id === currentDescSpellId);
          if (spell && !spell.tags.includes(existing.id)) {
            spell.tags.push(existing.id);
          }
          renderSpellDescTagList(spell);
        }
        input.value = '';
        return;
      }

      // Add as custom tag
      if (!character.spellcasting.customTags.includes(val)) {
        character.spellcasting.customTags.push(val);
      }

      const group = character.spellcasting.groups.find(g => g.id === currentDescSpellGroupId);
      if (group) {
        const spell = group.spells.find(s => s.id === currentDescSpellId);
        if (spell) {
          if (!spell.tags) spell.tags = [];
          if (!spell.tags.includes(val)) {
            spell.tags.push(val);
          }
          renderSpellDescTagList(spell);
        }
      }
      input.value = '';
    };

    elements.spellCustomTagAdd.addEventListener('click', addSpellCustomTag);
    elements.spellCustomTagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSpellCustomTag();
      }
    });
  }

  // Spell desc modal — save & close
  if (elements.spellDescSave) {
    elements.spellDescSave.addEventListener('click', () => {
      if (currentDescSpellGroupId && currentDescSpellId) {
        const group = character.spellcasting.groups.find(g => g.id === currentDescSpellGroupId);
        if (group) {
          const spell = group.spells.find(s => s.id === currentDescSpellId);
          if (spell) spell.description = elements.spellDescTextarea.value;
        }
      }
      elements.spellDescModal.classList.add('hidden');
      currentDescSpellGroupId = null;
      currentDescSpellId = null;
      renderSpells();
    });
  }

  // Close spell desc modal on overlay click
  if (elements.spellDescModal) {
    elements.spellDescModal.addEventListener('click', e => {
      if (e.target === elements.spellDescModal) {
        if (currentDescSpellGroupId && currentDescSpellId) {
          const group = character.spellcasting.groups.find(g => g.id === currentDescSpellGroupId);
          if (group) {
            const spell = group.spells.find(s => s.id === currentDescSpellId);
            if (spell) spell.description = elements.spellDescTextarea.value;
          }
        }
        elements.spellDescModal.classList.add('hidden');
        currentDescSpellGroupId = null;
        currentDescSpellId = null;
        renderSpells();
      }
    });
  }

  // Spell tag filter button — open filter modal
  if (elements.spellTagFilterBtn) {
    elements.spellTagFilterBtn.addEventListener('click', () => {
      openSpellTagFilterModal();
    });
  }

  // Spell tag filter modal — toggle
  if (elements.spellTagFilterList) {
    elements.spellTagFilterList.addEventListener('click', e => {
      const btn = e.target.closest('[data-spell-filter-tag]');
      if (!btn) return;
      const tagId = btn.dataset.spellFilterTag;

      if (tempSpellTagFilterSelection.has(tagId)) {
        tempSpellTagFilterSelection.delete(tagId);
      } else {
        tempSpellTagFilterSelection.add(tagId);
      }
      renderSpellTagFilterList();
    });
  }

  // Spell tag filter modal — clear
  if (elements.spellTagFilterClear) {
    elements.spellTagFilterClear.addEventListener('click', () => {
      tempSpellTagFilterSelection.clear();
      renderSpellTagFilterList();
    });
  }

  // Spell tag filter modal — apply
  if (elements.spellTagFilterApply) {
    elements.spellTagFilterApply.addEventListener('click', () => {
      activeSpellTagFilters = new Set(tempSpellTagFilterSelection);
      elements.spellTagFilterModal.classList.add('hidden');
      renderSpells();
    });
  }

  // Close spell tag filter modal on overlay click
  if (elements.spellTagFilterModal) {
    elements.spellTagFilterModal.addEventListener('click', e => {
      if (e.target === elements.spellTagFilterModal) {
        elements.spellTagFilterModal.classList.add('hidden');
      }
    });
  }

  // Remove individual active spell tag filters from toolbar
  if (elements.spellActiveFilters) {
    elements.spellActiveFilters.addEventListener('click', e => {
      const removeBtn = e.target.closest('[data-remove-spell-filter]');
      if (!removeBtn) return;
      const tagId = removeBtn.dataset.removeSpellFilter;
      activeSpellTagFilters.delete(tagId);
      renderSpells();
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

  // Update Custom Skills
  if (character.customSkills) {
    character.customSkills.forEach(cs => {
      const el = document.getElementById(`custom-skill-mod-${cs.id}`);
      if (el) {
        el.textContent = formatModifier(calcCustomSkillModifier(character, cs));
      }
    });
  }

  // Update Spell Stats (DC and Attack depend on ability mods and prof)
  updateSpellStats();

  // Recalculate module attacks/DCs
  character.modules.forEach(mod => {
    if (mod.calcType === 'attack') {
      const modVal = calcModifier(character.attributes[mod.calcAbility]);
      const prof = calcProficiencyBonus(character.level);
      mod.attackBonus = formatModifier(modVal + prof);
    } else if (mod.calcType === 'dc') {
      const modVal = calcModifier(character.attributes[mod.calcAbility]);
      const prof = calcProficiencyBonus(character.level);
      mod.attackBonus = 'DC ' + (8 + modVal + prof);
    }
  });

  updateUI();
  renderModuleLists();
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
