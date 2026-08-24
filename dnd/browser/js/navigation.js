"use strict";

class NavBar {
	static init () {
		this._initInstallPrompt();
		this._pCleanLegacyServiceWorker();
		// render the visible elements ASAP
		window.addEventListener(
			"DOMContentLoaded",
			function () {
				NavBar.initElements();
				NavBar.highlightCurrentPage();
			}
		);
		window.addEventListener("load", NavBar.initHandlers);
	}

	static _initInstallPrompt () {
		NavBar._cachedInstallEvent = null;
		window.addEventListener("beforeinstallprompt", e => NavBar._cachedInstallEvent = e);
	}

	static async _pCleanLegacyServiceWorker () {
		if (!("serviceWorker" in navigator)) return;

		try {
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations
				.filter(reg => reg.active && /\/sw\.js(?:\?|$)/.test(reg.active.scriptURL))
				.map(reg => reg.unregister()));

			if ("caches" in window) {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames
					.filter(name => /^(\d+\.)+\d+$/.test(name) || /^5etools/i.test(name))
					.map(name => caches.delete(name)));
			}
		} catch (e) {
			console.warn(`Could not clean legacy service worker/cache state: ${e.message}`);
		}
	}

	static initElements () {
		const navBar = document.getElementById("navbar");

		// create mobile "Menu" button
		const btnShowHide = document.createElement("button");
		btnShowHide.className = "btn btn-default page__btn-toggle-nav";
		btnShowHide.innerHTML = "Menu";
		btnShowHide.onclick = () => {
			$(btnShowHide).toggleClass("active");
			$(`.page__nav-hidden-mobile`).toggleClass("block", $(btnShowHide).hasClass("active"));
		};
		document.getElementById("navigation").prepend(btnShowHide);

		addLi(navBar, "index.html", "Home", {isRoot: true});

		const ulRules = addDropdown(navBar, "Rules");
		addLi(ulRules, "quickreference.html", "Quick Reference");
		addLi(ulRules, "variantrules.html", "Variant & Optional Rules/Misc");
		addLi(ulRules, "tables.html", "Tables");
		addDivider(ulRules);
		addLi(ulRules, "books.html", "Books");

		const ulPlayers = addDropdown(navBar, "Player");
		addLi(ulPlayers, "classes.html", "Classes");
		addLi(ulPlayers, "backgrounds.html", "Backgrounds");
		addLi(ulPlayers, "feats.html", "Feats");
		addLi(ulPlayers, "races.html", "Races");
		addDivider(ulPlayers);
		addLi(ulPlayers, "statgen.html", "Statgen");
		addLi(ulPlayers, "characterbuilder.html", "Character Builder");
		addDivider(ulPlayers);
		addLi(ulPlayers, "lifegen.html", "This Is Your Life");
		addLi(ulPlayers, "names.html", "Names");

		const ulDms = addDropdown(navBar, "Dungeon Master");
		addLi(ulDms, "dmscreen.html", "DM Screen");
		addDivider(ulDms);
		addLi(ulDms, "cultsboons.html", "Cults & Supernatural Boons");
		addLi(ulDms, "objects.html", "Objects");
		addLi(ulDms, "trapshazards.html", "Traps & Hazards");
		addDivider(ulDms);
		addLi(ulDms, "crcalculator.html", "CR Calculator");
		addLi(ulDms, "encountergen.html", "Encounter Generator");
		addLi(ulDms, "lootgen.html", "Loot Generator");

		const ulReferences = addDropdown(navBar, "References");
		addLi(ulReferences, "actions.html", "Actions");
		addLi(ulReferences, "bestiary.html", "Bestiary");
		addLi(ulReferences, "conditionsdiseases.html", "Conditions & Diseases");
		addLi(ulReferences, "deities.html", "Deities");
		addLi(ulReferences, "items.html", "Items");
		addLi(ulReferences, "languages.html", "Languages");
		addLi(ulReferences, "optionalfeatures.html", "Other Options and Features");
		addLi(ulReferences, "rewards.html", "Other Rewards");
		addLi(ulReferences, "psionics.html", "Psionics");
		addLi(ulReferences, "spells.html", "Spells");
		addLi(ulReferences, "vehicles.html", "Vehicles");

		const ulUtils = addDropdown(navBar, "Utilities");
		addLi(ulUtils, "blacklist.html", "Content Blacklist");
		addLi(ulUtils, "makebrew.html", "Homebrew Builder");
		addLi(ulUtils, "managebrew.html", "Homebrew Manager");
		addDivider(ulUtils);
		addLi(ulUtils, "inittrackerplayerview.html", "Initiative Tracker Player View");
		addDivider(ulUtils);
		addLi(ulUtils, "makecards.html", "RPG Cards JSON Builder");
		addLi(ulUtils, "converter.html", "Text Converter");

		const ulSettings = addDropdown(navBar, "Settings");
		addButton(
			ulSettings,
			{
				html: styleSwitcher.getActiveStyleSheet() === StyleSwitcher.STYLE_DAY ? "Night Mode" : "Day Mode",
				click: (evt) => {
					evt.preventDefault();
					styleSwitcher.toggleActiveStyleSheet();
				},
				className: "nightModeToggle"
			}
		);
		addDivider(ulSettings);
		addButton(
			ulSettings,
			{
				html: "Save State to File",
				click: async (evt) => {
					evt.preventDefault();
					const sync = StorageUtil.syncGetDump();
					const async = await StorageUtil.pGetDump();
					const dump = {sync, async};
					DataUtil.userDownload("5etools", dump);
				},
				title: "Save any locally-stored data (loaded homebrew, active blacklists, DM Screen configuration,...) to a file."
			}
		);
		addButton(
			ulSettings,
			{
				html: "Load State from File",
				click: async (evt) => {
					evt.preventDefault();
					const dump = await DataUtil.pUserUpload();

					StorageUtil.syncSetFromDump(dump.sync);
					await StorageUtil.pSetFromDump(dump.async);
					location.reload();
				},
				title: "Load previously-saved data (loaded homebrew, active blacklists, DM Screen configuration,...) from a file."
			}
		);
		addButton(
			ulSettings,
			{
				html: "Reset Local State",
				click: async (evt) => {
					evt.preventDefault();
					if (!confirm("Reset local filters, loaded homebrew, blacklists, and saved page state?")) return;
					localStorage.clear();
					if (window.localforage) await window.localforage.clear();
					location.reload();
				},
				title: "Clear local filters, source selections, homebrew, blacklists, and saved page state, then reload the page."
			}
		);

		/**
		 * Adds a new item to the navigation bar. Can be used either in root, or in a different UL.
		 * @param appendTo - Element to append this link to.
		 * @param aHref - Where does this link to.
		 * @param aText - What text does this link have.
		 * @param [opts] - Options object.
		 * @param [opts.isSide] - True if this item is part of a side menu.
		 * @param [opts.aHash] - Optional hash to be appended to the base href
		 * @param [opts.isRoot] - If the item is a root navbar element.
		 * @param [opts.isExternal] - If the item is an external link.
		 */
		function addLi (appendTo, aHref, aText, opts) {
			opts = opts || {};
			const hashPart = opts.aHash ? `#${opts.aHash}`.toLowerCase() : "";

			const li = document.createElement("li");
			li.setAttribute("role", "presentation");
			li.setAttribute("id", aText.toLowerCase().replace(/\s+/g, ""));
			li.setAttribute("data-page", `${aHref}${hashPart}`);
			if (opts.isRoot) {
				li.classList.add("page__nav-hidden-mobile");
				li.classList.add("page__btn-nav-root");
			}
			if (opts.isSide) {
				li.onmouseenter = function () { NavBar.handleSideItemMouseEnter(this) }
			} else {
				li.onmouseenter = function () { NavBar.handleItemMouseEnter(this) };
				li.onclick = function () { NavBar._dropdowns.forEach(ele => ele.classList.remove("open")) }
			}

			const a = document.createElement("a");
			a.href = `${aHref}${hashPart}`;
			a.innerHTML = aText;
			a.classList.add("nav__link");

			if (opts.isExternal) {
				a.setAttribute("target", "_blank");
				a.classList.add("inline-split-v-center");
				a.classList.add("w-100");
				a.innerHTML = `<span>${aText}</span><span class="glyphicon glyphicon-new-window"/>`
			}

			li.appendChild(a);
			appendTo.appendChild(li);
		}

		function addDivider (appendTo) {
			const li = document.createElement("li");
			li.setAttribute("role", "presentation");
			li.className = "divider";

			appendTo.appendChild(li);
		}

		/**
		 * Adds a new dropdown starting list to the navigation bar
		 * @param {String} appendTo - Element to append this link to.
		 * @param {String} text - Dropdown text.
		 * @param {boolean} [isSide=false] - If this is a sideways dropdown.
		 */
		function addDropdown (appendTo, text, isSide = false) {
			const li = document.createElement("li");
			li.setAttribute("role", "presentation");
			li.className = `dropdown dropdown--navbar page__nav-hidden-mobile ${isSide ? "" : "page__btn-nav-root"}`;
			if (isSide) {
				li.onmouseenter = function () { NavBar.handleSideItemMouseEnter(this); };
			} else {
				li.onmouseenter = function () { NavBar.handleItemMouseEnter(this); };
			}

			const a = document.createElement("a");
			a.className = "dropdown-toggle";
			a.href = "#";
			a.setAttribute("role", "button");
			a.onclick = function (event) { NavBar.handleDropdownClick(this, event, isSide); };
			if (isSide) {
				a.onmouseenter = function () { NavBar.handleSideDropdownMouseEnter(this); };
				a.onmouseleave = function () { NavBar.handleSideDropdownMouseLeave(this); };
			}
			a.innerHTML = `${text} <span class="caret ${isSide ? "caret--right" : ""}"></span>`;

			const ul = document.createElement("li");
			ul.className = `dropdown-menu ${isSide ? "dropdown-menu--side" : ""}`;
			ul.onclick = function (event) { event.stopPropagation(); };

			li.appendChild(a);
			li.appendChild(ul);
			appendTo.appendChild(li);
			return ul;
		}

		/**
		 * Special LI for buttong
		 * @param appendTo The element to append to.
		 * @param options Options.
		 * @param options.html Button text.
		 * @param options.click Button click handler.
		 * @param options.title Button title.
		 * @param options.className Additional button classes.
		 */
		function addButton (appendTo, options) {
			const li = document.createElement("li");
			li.setAttribute("role", "presentation");

			const a = document.createElement("a");
			a.href = "#";
			if (options.className) a.className = options.className;
			a.onclick = options.click;
			a.innerHTML = options.html;

			if (options.title) li.setAttribute("title", options.title);

			li.appendChild(a);
			appendTo.appendChild(li);
		}
	}

	static getCurrentPage () {
		let currentPage = window.location.pathname;
		currentPage = currentPage.substr(currentPage.lastIndexOf("/") + 1);

		if (!currentPage) currentPage = "5etools.html";
		return currentPage.trim();
	}

	static highlightCurrentPage () {
		let currentPage = NavBar.getCurrentPage();

		let isSecondLevel = false;
		if (currentPage.toLowerCase() === "book.html") {
			const hashPart = window.location.hash.split(",")[0];
			currentPage += hashPart.toLowerCase();
		}

		if (typeof _SEO_PAGE !== "undefined") currentPage = `${_SEO_PAGE}.html`;

		try {
			let current = document.querySelector(`li[data-page="${currentPage}"]`);
			if (current == null) {
				currentPage = currentPage.split("#")[0];
				if (NavBar.ALT_CHILD_PAGES[currentPage]) currentPage = NavBar.ALT_CHILD_PAGES[currentPage];
				current = document.querySelector(`li[data-page="${currentPage}"]`);
			}
			current.parentNode.childNodes.forEach(n => n.classList && n.classList.remove("active"));
			current.classList.add("active");

			let closestLi = current.parentNode;
			const setNearestParentActive = () => {
				while (closestLi !== null && (closestLi.nodeName !== "LI" || !closestLi.classList.contains("dropdown"))) closestLi = closestLi.parentNode;
				closestLi && closestLi.classList.add("active");
			};
			setNearestParentActive();
			if (isSecondLevel) {
				closestLi = closestLi.parentNode;
				setNearestParentActive();
			}
		} catch (ignored) { setTimeout(() => { throw ignored }); }
	}

	static initHandlers () {
		NavBar._dropdowns = [...document.getElementById("navbar").querySelectorAll(`li.dropdown--navbar`)];
		document.addEventListener("click", () => NavBar._dropdowns.forEach(ele => ele.classList.remove("open")));
		document.addEventListener("mousemove", evt => {
			NavBar._mouseX = evt.clientX;
			NavBar._mouseY = evt.clientY;
		});

		NavBar._clearAllTimers();
	}

	static handleDropdownClick (ele, event, isSide) {
		event.preventDefault();
		event.stopPropagation();
		if (isSide) return;
		const isOpen = ele.parentNode.classList.contains("open");
		if (isOpen) NavBar._dropdowns.forEach(ele => ele.classList.remove("open"));
		else NavBar._openDropdown(ele);
	}

	static _openDropdown (fromLink) {
		const noRemove = new Set();
		let parent = fromLink.parentNode;
		parent.classList.add("open");
		noRemove.add(parent);

		while (parent.nodeName !== "NAV") {
			parent = parent.parentNode;
			if (parent.nodeName === "LI") {
				parent.classList.add("open");
				noRemove.add(parent);
			}
		}

		NavBar._dropdowns.filter(ele => !noRemove.has(ele)).forEach(ele => ele.classList.remove("open"));
	}

	static handleItemMouseEnter (ele) {
		const $ele = $(ele);
		const timerIds = $ele.siblings("[data-timer-id]").map((i, e) => ({$ele: $(e), timerId: $(e).data("timer-id")})).get();
		timerIds.forEach(({$ele, timerId}) => {
			if (NavBar._timersOpen[timerId]) {
				clearTimeout(NavBar._timersOpen[timerId]);
				delete NavBar._timersOpen[timerId];
			}

			if (!NavBar._timersClose[timerId] && $ele.hasClass("open")) {
				const getTimeoutFn = () => {
					if (NavBar._timerMousePos[timerId]) {
						const [xStart, yStart] = NavBar._timerMousePos[timerId];
						// for generalised use, this should be made check against the bounding box for the side menu
						// and possibly also check Y pos; e.g.
						// || NavBar._mouseY > yStart + NavBar.MIN_MOVE_PX
						if (NavBar._mouseX > xStart + NavBar.MIN_MOVE_PX) {
							NavBar._timerMousePos[timerId] = [NavBar._mouseX, NavBar._mouseY];
							NavBar._timersClose[timerId] = setTimeout(() => getTimeoutFn(), NavBar.DROP_TIME / 2);
						} else {
							$ele.removeClass("open");
							delete NavBar._timersClose[timerId];
						}
					} else {
						$ele.removeClass("open");
						delete NavBar._timersClose[timerId];
					}
				};

				NavBar._timersClose[timerId] = setTimeout(() => getTimeoutFn(), NavBar.DROP_TIME);
			}
		});
	}

	static handleSideItemMouseEnter (ele) {
		const timerId = $(ele).closest(`li.dropdown`).data("timer-id");
		if (NavBar._timersClose[timerId]) {
			clearTimeout(NavBar._timersClose[timerId]);
			delete NavBar._timersClose[timerId];
			delete NavBar._timerMousePos[timerId];
		}
	}

	static handleSideDropdownMouseEnter (ele) {
		const $ele = $(ele);
		const timerId = $ele.parent().data("timer-id") || NavBar._timerId++;
		$ele.parent().attr("data-timer-id", timerId);

		if (NavBar._timersClose[timerId]) {
			clearTimeout(NavBar._timersClose[timerId]);
			delete NavBar._timersClose[timerId];
		}

		if (!NavBar._timersOpen[timerId]) {
			NavBar._timersOpen[timerId] = setTimeout(() => {
				NavBar._openDropdown(ele);
				delete NavBar._timersOpen[timerId];
				NavBar._timerMousePos[timerId] = [NavBar._mouseX, NavBar._mouseY];
			}, NavBar.DROP_TIME);
		}
	}

	static handleSideDropdownMouseLeave (ele) {
		const $ele = $(ele);
		if (!$ele.parent().data("timer-id")) return;
		const timerId = $ele.parent().data("timer-id");
		clearTimeout(NavBar._timersOpen[timerId]);
		delete NavBar._timersOpen[timerId];
	}

	static _clearAllTimers () {
		Object.entries(NavBar._timersOpen).forEach(([k, v]) => {
			clearTimeout(v);
			delete NavBar._timersOpen[k];
		});
	}
}
NavBar.DROP_TIME = 250;
NavBar.MIN_MOVE_PX = 7;
NavBar.ALT_CHILD_PAGES = {
	"book.html": "books.html"
};
NavBar._timerId = 1;
NavBar._timersOpen = {};
NavBar._timersClose = {};
NavBar._timerMousePos = {};
NavBar._mouseX = null;
NavBar._mouseY = null;
NavBar._cachedInstallEvent = null;
NavBar._downloadBarMeta = null;
NavBar.init();
