import {SpellPricingService} from "./spell-pricing-service.js";

class SpellPricerPage {
	constructor () {
		this._service = new SpellPricingService({dataUrl: new URL("data/spell-pricing.json", window.location.href)});
		this._spell = null;
		this._defaultInputs = {
			level: 0,
			utility: 1,
			isAcademy: false,
			isRare: false,
			isRitual: false,
			isWizard: true,
			legality: "legal",
			isPaidComponent: false,
		};
		this._spells = null;
		this._fieldIds = ["level", "utility", "academy", "rarity", "ritual", "wizard", "legality", "paid-component"];
	}

	async pInit () {
		for (let level = 0; level <= 10; ++level) document.querySelector("#spricer-level").add(new Option(`${level}`, `${level}`));
		await this._service.pInit();
		this._writeInputs(this._defaultInputs);

		document.querySelector("#spricer-select-spell").addEventListener("click", () => this._pOpenSelector());
		this._fieldIds.forEach(id => document.querySelector(`#spricer-${id}`).addEventListener("change", () => this._render()));
		document.querySelector("#spricer-save").addEventListener("click", () => this._save());
		document.querySelector("#spricer-restore").addEventListener("click", () => this._restore());
			document.querySelector("#spricer-reset").addEventListener("click", () => {
				this._writeInputs(this._defaultInputs);
				this._render();
			});
		this._render();
	}

	async _pGetSpells () {
		if (this._spells) return this._spells;
		const index = await (await fetch(new URL("data/spells/index.json", window.location.href))).json();
		const datasets = await Promise.all(Object.values(index).map(async filename => (await fetch(new URL(`data/spells/${filename}`, window.location.href))).json()));
		this._spells = datasets.flatMap(data => data.spell || [])
			.map(spell => this._service.mutateSpell(spell))
			.sort((a, b) => a.name.localeCompare(b.name, "es") || a.source.localeCompare(b.source, "es"));
		return this._spells;
	}

	async _pOpenSelector () {
		const {eleModalInner, doClose} = UiUtil.getShowModal({title: "Elegir conjuro", isWidth100: true, isMaxWidth640p: true});
		eleModalInner.innerHTML = `<input id="spricer-selector-search" class="ve-form-control ve-mb-2" type="search" autocomplete="off" placeholder="Buscar por nombre o fuente…"><div id="spricer-selector-results" class="spricer__selector-results"></div>`;
		const input = eleModalInner.querySelector("#spricer-selector-search");
		const results = eleModalInner.querySelector("#spricer-selector-results");
		results.textContent = "Cargando conjuros…";

		try {
			const spells = await this._pGetSpells();
			const render = () => {
				const query = input.value.trim().toLocaleLowerCase("es");
				const matches = spells.filter(spell => !query || `${spell.name} ${spell.source}`.toLocaleLowerCase("es").includes(query)).slice(0, 150);
				results.replaceChildren(...matches.map(spell => {
					const button = document.createElement("button");
					button.type = "button";
					button.className = "spricer__selector-row";
					button.innerHTML = `<span>${spell.name}</span><small>${Parser.sourceJsonToAbv(spell.source)} · nivel ${spell.level}</small>`;
					button.addEventListener("click", () => {
						doClose(true);
						this._selectSpell(spell);
					});
					return button;
				}));
				if (!matches.length) results.textContent = "No hay conjuros que coincidan.";
			};
			input.addEventListener("input", render);
			render();
			input.focus();
		} catch (error) {
			console.error(error);
			results.textContent = "No se pudieron cargar los conjuros. Revisa la consola para más detalles.";
		}
	}

	_selectSpell (spell) {
		this._spell = structuredClone(spell);
		this._defaultInputs = this._service.getAutofillInputs(this._spell);
		const override = this._service.getOverride(this._spell);
		this._writeInputs(override?.inputs ? {...this._defaultInputs, ...override.inputs} : this._defaultInputs);
		document.querySelector("#spricer-spell-name").innerHTML = `<strong>${this._spell.name}</strong> <span class="ve-muted">(${Parser.sourceJsonToAbv(this._spell.source)})</span>`;
		this._render();
	}

	_readInputs () {
		return {
			level: Number(document.querySelector("#spricer-level").value),
			utility: Number(document.querySelector("#spricer-utility").value),
			isAcademy: document.querySelector("#spricer-academy").value === "true",
			isRare: document.querySelector("#spricer-rarity").value === "true",
			isRitual: document.querySelector("#spricer-ritual").value === "true",
			isWizard: document.querySelector("#spricer-wizard").value === "true",
			legality: document.querySelector("#spricer-legality").value,
			isPaidComponent: document.querySelector("#spricer-paid-component").value === "true",
		};
	}

	_writeInputs (inputs) {
		document.querySelector("#spricer-level").value = `${inputs.level}`;
		document.querySelector("#spricer-utility").value = `${inputs.utility}`;
		document.querySelector("#spricer-academy").value = `${inputs.isAcademy}`;
		document.querySelector("#spricer-rarity").value = `${inputs.isRare}`;
		document.querySelector("#spricer-ritual").value = `${inputs.isRitual}`;
		document.querySelector("#spricer-wizard").value = `${inputs.isWizard}`;
		document.querySelector("#spricer-legality").value = inputs.legality;
		document.querySelector("#spricer-paid-component").value = `${inputs.isPaidComponent}`;
	}

	_render () {
		const inputs = this._readInputs();
		const result = this._service.calculate(inputs);
		const imported = this._spell ? this._service.getImportedPrice(this._spell) : null;
		const override = this._spell ? this._service.getOverride(this._spell) : null;
		const isBaseLevel = this._spell && inputs.level === this._spell.level;
		document.querySelector("#spricer-price").textContent = this._service.formatPriceGp(result.priceGp);
		document.querySelector("#spricer-provisional-price").textContent = this._service.formatPriceGp(result.priceGp);
		document.querySelector("#spricer-imported-price").textContent = this._service.formatPriceGp(imported);
		document.querySelector("#spricer-local-price").textContent = this._service.formatPriceGp(override?.priceGp ?? null);
		document.querySelector("#spricer-breakdown").innerHTML = result.breakdown.map(part => `<tr><td>${part.label}</td><td>${part.isBase ? this._service.formatPriceGp(part.value) : `× ${part.value.toLocaleString("es-ES")}`}</td></tr>`).join("");
		document.querySelector("#spricer-save").disabled = !isBaseLevel;
		document.querySelector("#spricer-restore").disabled = !override;
		document.querySelector("#spricer-save-note").textContent = !this._spell
			? "Puedes tasar manualmente. Selecciona un conjuro del catálogo para guardar su precio en este navegador."
			: isBaseLevel
				? "El precio guardado se aplicará a este conjuro solo en este navegador."
				: `La tasación usa nivel ${inputs.level}; el nivel base es ${this._spell.level}. Las versiones potenciadas no se pueden guardar.`;
	}

	_save () {
		try {
			if (!this._spell) throw new Error("Selecciona un conjuro del catálogo antes de guardar un precio.");
			const result = this._service.saveOverride(this._spell, this._readInputs());
			JqueryUtil.doToast({type: "success", content: `Precio guardado: ${this._service.formatPriceGp(result.priceGp)}.`});
			this._render();
		} catch (error) {
			JqueryUtil.doToast({type: "danger", content: error.message});
		}
	}

	_restore () {
		if (!this._spell) return;
		this._service.removeOverride(this._spell);
		JqueryUtil.doToast({type: "success", content: "Se ha restaurado el precio importado."});
		this._render();
	}
}

window.addEventListener("load", () => new SpellPricerPage().pInit().catch(error => {
	console.error(error);
	JqueryUtil.doToast({type: "danger", content: "No se pudo iniciar el tasador. Revisa la consola para más detalles."});
}));
