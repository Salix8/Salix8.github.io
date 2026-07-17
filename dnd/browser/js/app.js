import { DND_CATEGORIES, DND_COMPENDIUM } from "../data/compendium.js";

const STORAGE_KEY = "salix8.dnd.manager";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `character-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class DndDataService {
  constructor(categories, entries) {
    this.categories = categories;
    this.entries = entries;
  }

  getCategoriesByGroup(group) {
    return this.categories.filter((category) => category.group === group);
  }

  getCategory(categoryId) {
    return this.categories.find((category) => category.id === categoryId);
  }

  getSources() {
    return [...new Set(this.entries.map((entry) => entry.source))].sort();
  }

  search({ categoryId, query, source }) {
    const normalizedQuery = query.trim().toLowerCase();

    return this.entries.filter((entry) => {
      const matchesCategory = !categoryId || entry.category === categoryId;
      const matchesSource = source === "all" || entry.source === source;
      const searchableText = [
        entry.name,
        entry.summary,
        entry.source,
        ...entry.tags
      ].join(" ").toLowerCase();

      return matchesCategory && matchesSource && searchableText.includes(normalizedQuery);
    });
  }
}

class DndStateService {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  load() {
    const storedState = localStorage.getItem(this.storageKey);

    if (!storedState) {
      return { characters: [] };
    }

    try {
      return JSON.parse(storedState);
    } catch {
      return { characters: [] };
    }
  }

  save(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  export(state) {
    return JSON.stringify(state, null, 2);
  }
}

class DndBrowserView {
  constructor(dataService, stateService) {
    this.dataService = dataService;
    this.stateService = stateService;
    this.state = {
      ...this.stateService.load(),
      activeCategoryId: "classes",
      selectedEntryId: null,
      query: "",
      source: "all"
    };

    this.elements = {
      categoryLists: document.querySelectorAll("[data-category-list]"),
      search: document.querySelector("[data-search]"),
      sourceFilter: document.querySelector("[data-source-filter]"),
      activeCategory: document.querySelector("[data-active-category]"),
      resultCount: document.querySelector("[data-result-count]"),
      entryList: document.querySelector("[data-entry-list]"),
      detailPanel: document.querySelector("[data-detail-panel]"),
      characterList: document.querySelector("[data-character-list]"),
      characterForm: document.querySelector("[data-character-form]"),
      importInput: document.querySelector("[data-action='import']")
    };
  }

  init() {
    this.renderCategories();
    this.renderSourceFilter();
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.elements.search.addEventListener("input", (event) => {
      this.state.query = event.target.value;
      this.state.selectedEntryId = null;
      this.render();
    });

    this.elements.sourceFilter.addEventListener("change", (event) => {
      this.state.source = event.target.value;
      this.state.selectedEntryId = null;
      this.render();
    });

    document.querySelector("[data-action='new-character']").addEventListener("click", () => {
      this.elements.characterForm.hidden = false;
      this.elements.characterForm.elements.name.focus();
    });

    document.querySelector("[data-action='cancel-character']").addEventListener("click", () => {
      this.hideCharacterForm();
    });

    document.querySelector("[data-action='export']").addEventListener("click", () => {
      this.downloadState();
    });

    this.elements.importInput.addEventListener("change", (event) => {
      this.importState(event.target.files[0]);
    });

    this.elements.characterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.createCharacter(new FormData(event.currentTarget));
    });
  }

  renderCategories() {
    this.elements.categoryLists.forEach((list) => {
      const group = list.dataset.categoryList;
      list.innerHTML = this.dataService.getCategoriesByGroup(group)
        .map((category) => `
          <button class="dnd-category" type="button" data-category-id="${escapeHtml(category.id)}">
            <span>${escapeHtml(category.icon)}</span>
            ${escapeHtml(category.label)}
          </button>
        `)
        .join("");

      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category-id]");
        if (!button) {
          return;
        }

        this.state.activeCategoryId = button.dataset.categoryId;
        this.state.selectedEntryId = null;
        this.render();
      });
    });
  }

  renderSourceFilter() {
    const options = this.dataService.getSources()
      .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`)
      .join("");

    this.elements.sourceFilter.insertAdjacentHTML("beforeend", options);
  }

  render() {
    const entries = this.dataService.search({
      categoryId: this.state.activeCategoryId,
      query: this.state.query,
      source: this.state.source
    });
    const activeCategory = this.dataService.getCategory(this.state.activeCategoryId);

    if (!entries.some((entry) => entry.id === this.state.selectedEntryId)) {
      this.state.selectedEntryId = entries[0]?.id ?? null;
    }

    this.elements.activeCategory.textContent = activeCategory?.label ?? "Compendio";
    this.elements.resultCount.textContent = `${entries.length} resultado${entries.length === 1 ? "" : "s"}`;

    this.renderActiveCategory();
    this.renderEntries(entries);
    this.renderDetail(entries);
    this.renderCharacters();
  }

  renderActiveCategory() {
    document.querySelectorAll("[data-category-id]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.categoryId === this.state.activeCategoryId);
    });
  }

  renderEntries(entries) {
    if (entries.length === 0) {
      this.elements.entryList.innerHTML = `<p class="dnd-muted">No hay resultados con estos filtros.</p>`;
      return;
    }

    this.elements.entryList.innerHTML = entries.map((entry) => `
      <button class="dnd-entry ${entry.id === this.state.selectedEntryId ? "is-active" : ""}" type="button" data-entry-id="${escapeHtml(entry.id)}">
        <span class="dnd-entry__name">${escapeHtml(entry.name)}</span>
        <span class="dnd-entry__meta">${escapeHtml(entry.source)} · ${escapeHtml(entry.tags.join(", "))}</span>
      </button>
    `).join("");

    this.elements.entryList.querySelectorAll("[data-entry-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.state.selectedEntryId = button.dataset.entryId;
        this.render();
      });
    });
  }

  renderDetail(entries) {
    const entry = entries.find((candidate) => candidate.id === this.state.selectedEntryId);

    if (!entry) {
      this.elements.detailPanel.innerHTML = `
        <div class="dnd-empty-state">
          <h2>Sin resultados</h2>
          <p>Ajusta la busqueda o cambia de categoria.</p>
        </div>
      `;
      return;
    }

    this.elements.detailPanel.innerHTML = `
      <header class="dnd-detail__header">
        <div>
          <p class="dnd-detail__source">${escapeHtml(entry.source)}</p>
          <h2>${escapeHtml(entry.name)}</h2>
        </div>
        <span class="dnd-detail__category">${escapeHtml(this.dataService.getCategory(entry.category)?.label ?? entry.category)}</span>
      </header>
      <p class="dnd-detail__summary">${escapeHtml(entry.summary)}</p>
      <ul class="dnd-detail__list">
        ${entry.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
      </ul>
      <div class="dnd-tag-list">
        ${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
    `;
  }

  renderCharacters() {
    if (this.state.characters.length === 0) {
      this.elements.characterList.innerHTML = `
        <div class="dnd-empty-state dnd-empty-state--compact">
          <h3>No hay personajes</h3>
          <p>Crea una ficha minima para preparar el futuro constructor.</p>
        </div>
      `;
      return;
    }

    this.elements.characterList.innerHTML = this.state.characters.map((character) => `
      <article class="dnd-character-card">
        <div>
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.className || "Sin clase")} · Nivel ${escapeHtml(character.level)}</p>
        </div>
        <button type="button" aria-label="Eliminar ${escapeHtml(character.name)}" data-delete-character="${escapeHtml(character.id)}">×</button>
      </article>
    `).join("");

    this.elements.characterList.querySelectorAll("[data-delete-character]").forEach((button) => {
      button.addEventListener("click", () => {
        this.state.characters = this.state.characters.filter((character) => character.id !== button.dataset.deleteCharacter);
        this.persistState();
        this.renderCharacters();
      });
    });
  }

  createCharacter(formData) {
    const character = {
      id: createId(),
      name: formData.get("name").trim(),
      className: formData.get("className").trim(),
      level: Number(formData.get("level")) || 1
    };

    this.state.characters = [...this.state.characters, character];
    this.persistState();
    this.hideCharacterForm();
    this.renderCharacters();
  }

  hideCharacterForm() {
    this.elements.characterForm.reset();
    this.elements.characterForm.hidden = true;
  }

  persistState() {
    this.stateService.save({ characters: this.state.characters });
  }

  downloadState() {
    const blob = new Blob([this.stateService.export({ characters: this.state.characters })], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "salix8-dnd-manager.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async importState(file) {
    if (!file) {
      return;
    }

    const importedState = JSON.parse(await file.text());
    this.state.characters = Array.isArray(importedState.characters) ? importedState.characters : [];
    this.persistState();
    this.renderCharacters();
    this.elements.importInput.value = "";
  }
}

const dataService = new DndDataService(DND_CATEGORIES, DND_COMPENDIUM);
const stateService = new DndStateService(STORAGE_KEY);
const browserView = new DndBrowserView(dataService, stateService);

browserView.init();
