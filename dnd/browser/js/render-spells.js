class RenderSpells {
	static $getRenderedSpell (sp, subclassLookup) {
		const renderer = Renderer.get();
		const price = typeof SpellPricingService === "undefined" ? "Sin tasar" : SpellPricingService.getFormattedPrice(sp);

		const renderStack = [];
		renderer.setFirstSection(true);

		renderStack.push(`
			${Renderer.utils.getBorderTr()}
			${Renderer.utils.getExcludedTr(sp, "spell")}
			${Renderer.utils.getNameTr(sp, {page: UrlUtil.PG_SPELLS})}
			<tr><td class="rd-spell__level-school-ritual" colspan="6"><span>${Parser.spLevelSchoolMetaToFull(sp.level, sp.school, sp.meta, sp.subschools)}</span></td></tr>
			<tr>
				<td colspan="3"><span class="bold">Casting Time: </span>${Parser.spTimeListToFull(sp.time)}</td>
				<td colspan="3"><span class="bold">Price: </span>${price}</td>
			</tr>
			<tr><td colspan="6"><span class="bold">Range: </span>${Parser.spRangeToFull(sp.range)}</td></tr>
			<tr><td colspan="6"><span class="bold">Components: </span>${Parser.spComponentsToFull(sp.components, sp.level)}</td></tr>
			<tr><td colspan="6"><span class="bold">Duration: </span>${Parser.spDurationToFull(sp.duration)}</td></tr>
			${Renderer.utils.getDividerTr()}
		`);

		const entryList = {type: "entries", entries: sp.entries};
		renderStack.push(`<tr class="text"><td colspan="6" class="text">`);
		renderer.recursiveRender(entryList, renderStack, {depth: 1});
		if (sp.entriesHigherLevel) {
			const higherLevelsEntryList = {type: "entries", entries: sp.entriesHigherLevel};
			renderer.recursiveRender(higherLevelsEntryList, renderStack, {depth: 2});
		}
		renderStack.push(`</td></tr>`);

		if (sp.classes && sp.classes.fromClassList) {
			const [current, legacy] = Parser.spClassesToCurrentAndLegacy(sp.classes);
			renderStack.push(`<tr class="text"><td colspan="6"><span class="bold">Classes: </span>${Parser.spMainClassesToFull({fromClassList: current})}</td></tr>`);
			if (legacy.length) renderStack.push(`<tr class="text"><td colspan="6"><section class="text-muted"><span class="bold">Classes (legacy): </span>${Parser.spMainClassesToFull({fromClassList: legacy})}</section></td></tr>`);
		}

		if (sp.classes && sp.classes.fromSubclass) {
			const [current, legacy] = Parser.spSubclassesToCurrentAndLegacyFull(sp.classes, subclassLookup);
			renderStack.push(`<tr class="text"><td colspan="6"><span class="bold">Subclasses: </span>${current}</td></tr>`);
			if (legacy.length) {
				renderStack.push(`<tr class="text"><td colspan="6"><section class="text-muted"><span class="bold">Subclasses (legacy): </span>${legacy}</section></td></tr>`);
			}
		}

		if (sp.classes && sp.classes.fromClassListVariant) {
			renderStack.push(`<tr class="text"><td colspan="6"><span class="bold" title="Source: ${Parser.sourceJsonToFull(SRC_UACFV)}">Variant Classes: </span>${Parser.spMainClassesToFull(sp.classes, false, "fromClassListVariant")}</td></tr>`);
		}

		if (sp.races) {
			const raceLinks = [...sp.races].sort((a, b) => SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source, b.source)).map(r => {
				const linked = DataUtil.spell.getRaceAssociationLink(r);
				const label = r.isUnavailable ? `<span title="Not available in the local catalog (${r.source})">${renderer.render(r.name)}</span>` : renderer.render(`{@race ${linked.name}|${linked.source}|${r.name}}`);
				const note = linked.source !== r.source ? ` title="Source: ${Parser.sourceJsonToFull(r.source)}; Available printing: ${Parser.sourceJsonToFull(linked.source)}"` : "";
				return `<span${SourceUtil.isNonstandardSource(r.source) ? ` class="text-muted"` : ""}${note}>${label}</span>`;
			});
			renderStack.push(`<tr class="text"><td colspan="6"><span class="bold">Races: </span>${raceLinks.join(", ")}</td></tr>`);
		}

		if (sp.backgrounds) {
			renderStack.push(`<tr class="text"><td colspan="6"><span class="bold">Backgrounds: </span>${[...sp.backgrounds].sort((a, b) => SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source, b.source)).map(r => `${SourceUtil.isNonstandardSource(r.source) ? `<span class="text-muted">` : ``}${renderer.render(`{@background ${r.name}|${r.source}}`)}${SourceUtil.isNonstandardSource(r.source) ? `</span>` : ``}`).join(", ")}</td></tr>`);
		}

		if (sp.level > 4 && [Renderer.spell.STR_ELD_KNIGHT, Renderer.spell.STR_ARC_TCKER].every(name =>
			(sp.classes?.fromSubclass || []).some(it => it.subclass.name === name && it.subclass.source === SRC_PHB))) {
			renderStack.push(`<tr class="text"><td colspan="6"><section class="text-muted">`);
			renderer.recursiveRender(`{@italic Note: Both the {@class fighter||${Renderer.spell.STR_FIGHTER} (${Renderer.spell.STR_ELD_KNIGHT})|eldritch knight} and the {@class rogue||${Renderer.spell.STR_ROGUE} (${Renderer.spell.STR_ARC_TCKER})|arcane trickster} spell lists include all {@class ${Renderer.spell.STR_WIZARD}} spells. Spells of 5th level or higher may be cast with the aid of a spell scroll or similar.}`, renderStack, {depth: 2});
			renderStack.push(`</section></td></tr>`);
		}

		renderStack.push(`
			${Renderer.utils.getPageTr(sp)}
			${Renderer.utils.getBorderTr()}
		`);

		return $(renderStack.join(""));
	}

	static async pGetSubclassLookup () {
		const subclassLookup = {};
		Object.assign(subclassLookup, await DataUtil.loadJSON(`data/generated/gendata-subclass-lookup.json`));
		RenderSpells.mergeHomebrewSubclassLookup(subclassLookup, await DataUtil.class.loadJSON());
		const homebrew = await BrewUtil.pAddBrewData();
		RenderSpells.mergeHomebrewSubclassLookup(subclassLookup, homebrew);
		return subclassLookup
	}

	static mergeHomebrewSubclassLookup (subclassLookup, homebrew) {
		// Reprints keep their association identity; links use the available, explicitly declared printing.
		for (const cls of homebrew.class || []) {
			for (const sc of cls.subclasses || []) {
				for (const classSource of [cls.source, ...(cls.otherSources || []).map(it => it.source)]) {
					for (const subclassSource of [sc.source || cls.source, ...(sc.otherSources || []).map(it => it.source)]) {
						if (classSource === cls.source && subclassSource === (sc.source || cls.source)) continue;
						const target = ((subclassLookup[classSource] ||= {})[cls.name] ||= {});
						(target[subclassSource] ||= {})[sc.shortName || sc.name] = {name: sc.name, linkClassSource: cls.source, linkSubclassSource: sc.source || cls.source};
					}
				}
			}
		}
		if (homebrew.class) {
			homebrew.class.filter(it => it.subclasses).forEach(c => {
				(subclassLookup[c.source] =
					subclassLookup[c.source] || {})[c.name] =
					subclassLookup[c.source][c.name] || {};

				const target = subclassLookup[c.source][c.name];
				c.subclasses.forEach(sc => {
					sc.source = sc.source || c.source;
					sc.shortName = sc.shortName || sc.name;
					const entries = (target[sc.source] ||= {});
					if (!entries[sc.shortName] || entries[sc.shortName].linkClassSource) entries[sc.shortName] = {name: sc.name};
				});
			})
		}

		if (homebrew.subclass) {
			homebrew.subclass.forEach(sc => {
				const clSrc = sc.classSource || SRC_PHB;
				sc.shortName = sc.shortName || sc.name;

				(subclassLookup[clSrc] =
					subclassLookup[clSrc] || {})[sc.class] =
					subclassLookup[clSrc][sc.class] || {};

				const target = subclassLookup[clSrc][sc.class];
				(target[sc.source] =
					target[sc.source] || {})[sc.shortName] =
					target[sc.source][sc.shortName] || {name: sc.name}
			})
		}
	}
}
