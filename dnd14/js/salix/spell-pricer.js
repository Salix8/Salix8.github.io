"use strict";

class SpellPricerUIController {
	constructor () {
		this._spell = null;
		this._defaultInputs = null;
		this._fieldIds = [
			"level",
			"utility",
			"academy",
			"rarity",
			"ritual",
			"wizard",
			"legality",
			"paid-component",
		];
	}

	async pInit () {
		for (let level = 0; level <= 10; ++level) $("#spricer-level").append(`<option value="${level}">${level}</option>`);
		this._setFieldsDisabled(true);

		await Promise.all([
			SpellPricingService.pInit(),
			SearchUiUtil.pDoGlobalInit(),
		]);
		await SearchWidget.pDoGlobalInit();

		$("#spricer-select-spell").click(() => this._pSelectSpell());
		this._fieldIds.forEach(id => $(`#spricer-${id}`).change(() => this._render()));
		$("#spricer-save").click(() => this._save());
		$("#spricer-restore").click(() => this._restore());
		$("#spricer-reset").click(() => {
			this._writeInputs(this._defaultInputs);
			this._render();
		});

		window.dispatchEvent(new Event("toolsLoaded"));
	}

	async _pSelectSpell () {
		const result = await SearchWidget.pGetUserSpellSearch();
		if (!result) return;

		this._spell = MiscUtil.copy(await Renderer.hover.pCacheAndGet(result.page, result.source, result.hash, {isRaw: true}));
		this._defaultInputs = SpellPricingService.getAutofillInputs(this._spell);
		const override = SpellPricingService.getOverride(this._spell);
		this._writeInputs(override?.inputs ? {...this._defaultInputs, ...override.inputs} : this._defaultInputs);
		this._setFieldsDisabled(false);
		$("#spricer-spell-name").html(`<strong>${this._spell.name}</strong>&nbsp; <span class="text-muted">(${Parser.sourceJsonToAbv(this._spell.source)})</span>`);
		this._render();
	}

	_readInputs () {
		return {
			level: Number($("#spricer-level").val()),
			utility: Number($("#spricer-utility").val()),
			isAcademy: $("#spricer-academy").val() === "true",
			isRare: $("#spricer-rarity").val() === "true",
			isRitual: $("#spricer-ritual").val() === "true",
			isWizard: $("#spricer-wizard").val() === "true",
			legality: $("#spricer-legality").val(),
			isPaidComponent: $("#spricer-paid-component").val() === "true",
		};
	}

	_writeInputs (inputs) {
		$("#spricer-level").val(String(inputs.level));
		$("#spricer-utility").val(String(inputs.utility));
		$("#spricer-academy").val(String(inputs.isAcademy));
		$("#spricer-rarity").val(String(inputs.isRare));
		$("#spricer-ritual").val(String(inputs.isRitual));
		$("#spricer-wizard").val(String(inputs.isWizard));
		$("#spricer-legality").val(inputs.legality);
		$("#spricer-paid-component").val(String(inputs.isPaidComponent));
	}

	_setFieldsDisabled (isDisabled) {
		this._fieldIds.forEach(id => $(`#spricer-${id}`).prop("disabled", isDisabled));
		$("#spricer-reset").prop("disabled", isDisabled);
	}

	_render () {
		if (!this._spell) return;
		const inputs = this._readInputs();
		const result = SpellPricingService.calculate(inputs);
		const importedPrice = SpellPricingService.getImportedPrice(this._spell);
		const override = SpellPricingService.getOverride(this._spell);
		const isBaseLevel = inputs.level === this._spell.level;

		$("#spricer-price").text(SpellPricingService.formatPriceGp(result.priceGp));
		$("#spricer-imported-price").text(SpellPricingService.formatPriceGp(importedPrice));
		$("#spricer-local-price").text(SpellPricingService.formatPriceGp(override?.priceGp ?? null));
		$("#spricer-breakdown").html(result.breakdown.map(part => `<tr>
			<td>${part.label}</td>
			<td>${part.isBase ? SpellPricingService.formatPriceGp(part.value) : `× ${part.value.toLocaleString("es-ES")}`}</td>
		</tr>`).join(""));

		$("#spricer-save").prop("disabled", !isBaseLevel);
		$("#spricer-restore").prop("disabled", !override);
		$("#spricer-save-note").text(isBaseLevel
			? "The saved price will be applied to this spell in this browser."
			: `This estimate uses level ${inputs.level}; the original level is ${this._spell.level}. Upcast versions cannot be saved.`);
	}

	_save () {
		try {
			const result = SpellPricingService.saveOverride(this._spell, this._readInputs());
			JqueryUtil.doToast({type: "success", content: `Precio guardado: ${SpellPricingService.formatPriceGp(result.priceGp)}.`});
			this._render();
		} catch (error) {
			JqueryUtil.doToast({type: "danger", content: error.message});
		}
	}

	_restore () {
		SpellPricingService.removeOverride(this._spell);
		JqueryUtil.doToast({type: "success", content: "Se ha restaurado el precio importado."});
		this._render();
	}
}

window.addEventListener("load", () => new SpellPricerUIController().pInit());
