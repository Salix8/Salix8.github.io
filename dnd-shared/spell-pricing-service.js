export class SpellPricingService {
	static STORAGE_KEY = "spellPricingOverridesV1";

	constructor ({dataUrl}) {
		this._dataUrl = dataUrl;
		this._config = null;
		this._prices = new Map();
		this._pInit = null;
	}

	async pInit () {
		if (this._pInit) return this._pInit;
		this._pInit = (async () => {
			const response = await fetch(this._dataUrl);
			if (!response.ok) throw new Error(`No se pudo cargar el catálogo de precios (${response.status}).`);
			const data = await response.json();
			this._config = data.config;
			this._prices = new Map(data.prices.map(price => [this.getSpellKey(price), price.priceGp]));
		})();
		return this._pInit;
	}

	getSpellKey (spell) {
		return `${encodeURIComponent(spell.name).toLowerCase()}__${encodeURIComponent(spell.source).toLowerCase()}`;
	}

	mutateSpell (spell) {
		spell.priceGp = this.getImportedPrice(spell);
		return spell;
	}

	getImportedPrice (spell) {
		return this._prices.get(this.getSpellKey(spell)) ?? null;
	}

	getOverride (spell) {
		return {...(StorageUtil.syncGet(SpellPricingService.STORAGE_KEY) || {})}[this.getSpellKey(spell)] || null;
	}

	getPriceMeta (spell) {
		const override = this.getOverride(spell);
		if (override) return {priceGp: override.priceGp, source: "local", inputs: override.inputs};
		const priceGp = spell.priceGp ?? this.getImportedPrice(spell);
		return {priceGp, source: priceGp == null ? "none" : "imported"};
	}

	getFormattedPrice (spell) {
		return this.formatPriceGp(this.getPriceMeta(spell).priceGp);
	}

	formatPriceGp (priceGp) {
		return priceGp == null ? "Sin tasar" : `${Number(priceGp).toLocaleString("es-ES")} po`;
	}

	getAutofillInputs (spell) {
		return {
			level: spell.level,
			utility: 1,
			isAcademy: false,
			isRare: false,
			isRitual: !!spell.meta?.ritual,
			isWizard: true,
			legality: "legal",
			isPaidComponent: this.hasPaidComponent(spell),
		};
	}

	hasPaidComponent (spell) {
		const material = spell.components?.m;
		if (!material) return false;
		if (typeof material === "object" && Number.isFinite(material.cost) && material.cost > 0) return true;
		const text = typeof material === "string" ? material : material.text;
		return !!text && /\d[\d.,]*\s*(?:po|pp|pc|gp|sp|cp)\b/i.test(text);
	}

	calculate (inputs) {
		const {levelBaseGp, utilityMultiplier, academyMultiplier, rarityMultiplier, ritualMultiplier, nonWizardMultiplier, legalityMultiplier, paidComponentMultiplier} = this._config;
		const level = Number(inputs.level);
		const utility = Number(inputs.utility);
		if (!Number.isInteger(level) || level < 0 || level >= levelBaseGp.length) throw new Error("El nivel debe estar entre 0 y 10.");
		if (!Number.isInteger(utility) || !utilityMultiplier[utility]) throw new Error("La utilidad debe estar entre 1 y 4.");
		if (!legalityMultiplier[inputs.legality]) throw new Error("La legalidad seleccionada no es válida.");

		const breakdown = [
			{label: `Nivel ${level}`, value: levelBaseGp[level], isBase: true},
			{label: `Utilidad ${utility}`, value: utilityMultiplier[utility]},
			{label: "Academia", value: inputs.isAcademy ? academyMultiplier : 1},
			{label: "Rareza", value: inputs.isRare ? rarityMultiplier : 1},
			{label: "Ritual", value: inputs.isRitual ? ritualMultiplier : 1},
			{label: "No disponible para Wizard", value: inputs.isWizard ? 1 : nonWizardMultiplier},
			{label: "Legalidad", value: legalityMultiplier[inputs.legality]},
			{label: "Componente de pago", value: inputs.isPaidComponent ? paidComponentMultiplier : 1},
		];
		const rawPriceGp = breakdown.reduce((total, part) => part.isBase ? part.value : total * part.value, 0);
		return {priceGp: Math.round(rawPriceGp), breakdown};
	}

	saveOverride (spell, inputs) {
		if (Number(inputs.level) !== Number(spell.level)) throw new Error("No se pueden guardar tasaciones de conjuros potenciados.");
		const result = this.calculate(inputs);
		const overrides = {...(StorageUtil.syncGet(SpellPricingService.STORAGE_KEY) || {})};
		overrides[this.getSpellKey(spell)] = {priceGp: result.priceGp, inputs: {...inputs}};
		StorageUtil.syncSet(SpellPricingService.STORAGE_KEY, overrides);
		return result;
	}

	removeOverride (spell) {
		const overrides = {...(StorageUtil.syncGet(SpellPricingService.STORAGE_KEY) || {})};
		delete overrides[this.getSpellKey(spell)];
		StorageUtil.syncSet(SpellPricingService.STORAGE_KEY, overrides);
	}
}
