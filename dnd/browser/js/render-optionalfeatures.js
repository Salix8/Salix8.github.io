class RenderOptionalFeatures {
	static $getRenderedOptionalFeature (it) {
		const potionMeta = it.potion
			? `<tr><td colspan="6"><span class="bold">Nivel: </span>${it.potion.level}</td></tr>
			<tr><td colspan="6"><span class="bold">Ingredientes: </span>${Renderer.get().render(it.potion.ingredients)}</td></tr>
			<tr><td colspan="6"><span class="bold">Alcance: </span>${Renderer.get().render(it.potion.range)}</td></tr>
			${it.potion.use ? `<tr><td colspan="6"><span class="bold">Uso: </span>${Renderer.get().render(it.potion.use)}</td></tr>` : ""}
			<tr><td colspan="6"><span class="bold">Duración: </span>${Renderer.get().render(it.potion.duration)}</td></tr>`
			: "";
		return $$`${Renderer.utils.getBorderTr()}
		${Renderer.utils.getExcludedTr(it, "optionalfeature")}
		${Renderer.utils.getNameTr(it, {page: UrlUtil.PG_OPT_FEATURES})}
		${it.prerequisite ? `<tr><td colspan="6"><i>${Renderer.utils.getPrerequisiteText(it.prerequisite)}</i></td></tr>` : ""}
		${potionMeta}
		<tr><td class="divider" colspan="6"><div></div></td></tr>
		<tr><td colspan="6">${Renderer.get().render({entries: it.entries}, 1)}</td></tr>
		${Renderer.optionalfeature.getPreviouslyPrintedText(it)}
		${Renderer.utils.getPageTr(it)}
		${Renderer.utils.getBorderTr()}`
	}
}
