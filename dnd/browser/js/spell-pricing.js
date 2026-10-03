"use strict";

class SpellPricingService {
	static async pInit () {
		if (this._pInit) return this._pInit;
		this._pInit = (async () => {
			const data = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/spell-pricing.json`);
			this._config = data.config;
			this._prices = new Map(data.prices.map(price => [this.getSpellKey(price), price.priceGp]));
			return data;
		})();
		return this._pInit;
	}

	static getSpellKey (spell) {
		return `${encodeURIComponent(spell.name).toLowerCase()}__${encodeURIComponent(spell.source).toLowerCase()}`;
	}

	static getConfig () {
		if (!this._config) throw new Error("SpellPricingService must be initialised before calculating prices.");
		return this._config;
	}

	static getAutofillInputs (spell) {
		return {
			level: spell.level,
			utility: 4,
			isAcademy: false,
			isRare: false,
			isRitual: !!spell.meta?.ritual,
			isWizard: this.isWizardSpell(spell),
			legality: "legal",
			isPaidComponent: this.hasPaidComponent(spell),
		};
	}

	static isWizardSpell (spell) {
		return [
			...(spell.classes?.fromClassList || []),
			...(spell.classes?.fromClassListVariant || []),
		].some(cls => cls.name === "Wizard");
	}

	static hasPaidComponent (spell) {
		const material = spell.components?.m;
		if (!material) return false;
		if (typeof material === "object" && Number.isFinite(material.cost) && material.cost > 0) return true;

		const text = typeof material === "string" ? material : material.text;
		if (!text) return false;
		return /\d[\d.,]*\s*(?:po|pp|pc|gp|sp|cp)\b/i.test(text);
	}

	static calculate (inputs) {
		const config = this.getConfig();
		const level = Number(inputs.level);
		const utility = Number(inputs.utility);
		if (!Number.isInteger(level) || level < 0 || level >= config.levelBaseGp.length) throw new Error("Spell level must be between 0 and 10.");
		if (!Number.isInteger(utility) || !config.utilityMultiplier[utility]) throw new Error("Utility must be between 1 and 4.");
		if (!config.legalityMultiplier[inputs.legality]) throw new Error("Unknown legality value.");

		const breakdown = [
			{key: "level", label: `Nivel ${level}`, value: config.levelBaseGp[level], isBase: true},
			{key: "utility", label: `Utilidad ${utility}`, value: config.utilityMultiplier[utility]},
			{key: "academy", label: "Academia", value: inputs.isAcademy ? config.academyMultiplier : 1},
			{key: "rarity", label: "Rareza", value: inputs.isRare ? config.rarityMultiplier : 1},
			{key: "ritual", label: "Ritual", value: inputs.isRitual ? config.ritualMultiplier : 1},
			{key: "wizard", label: "No disponible para Wizard", value: inputs.isWizard ? 1 : config.nonWizardMultiplier},
			{key: "legality", label: "Legalidad", value: config.legalityMultiplier[inputs.legality]},
			{key: "paidComponent", label: "Componente de pago", value: inputs.isPaidComponent ? config.paidComponentMultiplier : 1},
		];

		const rawPriceGp = breakdown.reduce((total, part) => part.isBase ? part.value : total * part.value, 0);
		return {priceGp: Math.round(rawPriceGp), rawPriceGp, breakdown};
	}

	static getPriceMeta (spell) {
		const key = this.getSpellKey(spell);
		const override = this.getOverride(spell);
		if (override) return {priceGp: override.priceGp, source: "local", inputs: override.inputs};
		const importedPrice = this.getImportedPrice(spell);
		if (importedPrice != null) return {priceGp: importedPrice, source: "imported"};
		return {priceGp: null, source: "none"};
	}

	static getImportedPrice (spell) {
		return this._prices?.get(this.getSpellKey(spell)) ?? null;
	}

	static getOverride (spell) {
		return this._getOverrides()[this.getSpellKey(spell)] || null;
	}

	static getPrice (spell) {
		return this.getPriceMeta(spell).priceGp;
	}

	static getFormattedPrice (spell) {
		return this.formatPriceGp(this.getPrice(spell));
	}

	static formatPriceGp (priceGp) {
		return priceGp == null ? "Sin tasar" : `${Number(priceGp).toLocaleString("es-ES")} po`;
	}

	static saveOverride (spell, inputs) {
		if (Number(inputs.level) !== Number(spell.level)) throw new Error("No se pueden guardar tasaciones de conjuros potenciados.");
		const result = this.calculate(inputs);
		const overrides = this._getOverrides();
		overrides[this.getSpellKey(spell)] = {priceGp: result.priceGp, inputs: {...inputs}};
		StorageUtil.syncSet(this._STORAGE_KEY, overrides);
		this._dispatchChange(spell);
		return result;
	}

	static removeOverride (spell) {
		const overrides = this._getOverrides();
		delete overrides[this.getSpellKey(spell)];
		StorageUtil.syncSet(this._STORAGE_KEY, overrides);
		this._dispatchChange(spell);
	}

	static _getOverrides () {
		return {...(StorageUtil.syncGet(this._STORAGE_KEY) || {})};
	}

	static _dispatchChange (spell) {
		if (typeof window === "undefined") return;
		window.dispatchEvent(new CustomEvent("spellPriceChanged", {detail: {name: spell.name, source: spell.source}}));
	}
}

SpellPricingService._STORAGE_KEY = "spellPricingOverridesV1";
SpellPricingService._config = null;
SpellPricingService._prices = null;
SpellPricingService._pInit = null;

if (typeof module !== "undefined") module.exports = SpellPricingService;
