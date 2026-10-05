import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

await import("./dnd-shared/salix-image-path-map.js");
await import("./dnd-shared/salix-image-url.js");

const ROOT = "https://raw.githubusercontent.com/Salix8/Salix8-assets/main/img/";

assert.equal(globalThis.SalixImageUrl.ROOT, ROOT);
assert.equal(globalThis.SalixImageUrl.get("/bestiary/MM/Aarakocra.jpg"), `${ROOT}bestiary/MM/Aarakocra.jpg`);
assert.equal(globalThis.SalixImageUrl.get("bestiary/MM/Aarakocra.webp"), `${ROOT}bestiary/MM/Aarakocra.jpg`);
assert.equal(globalThis.SalixImageUrl.get("bestiary/AI/Deep Crow.webp"), `${ROOT}bestiary/AI/Deep%20Crow.jpg`);
assert.equal(globalThis.SalixImageUrl.get("bestiary/AI/Deep%20Crow.webp"), `${ROOT}bestiary/AI/Deep%20Crow.jpg`);

for (const edition of ["dnd14", "dnd24"]) {
	await import(`./${edition}/js/parser.js`);
	await import(`./${edition}/js/utils.js`);
	await import(`./${edition}/js/render.js`);

	assert.equal(Renderer.get().getMediaUrl("img", "dmscreen/moon.webp"), `${ROOT}dmscreen/moon.png`, `${edition}: recurso de DM Screen`);
	assert.equal(Renderer.get().getMediaUrl("img", "bestiary/AI/Deep Crow.webp"), `${ROOT}bestiary/AI/Deep%20Crow.jpg`, `${edition}: ruta con espacios`);
	assert.equal(Renderer.monster.getTokenUrl({name: "Aarakocra", source: "MM"}), `${ROOT}MM/Aarakocra.png`, `${edition}: token de bestiario`);
	assert.equal(
		Renderer.utils.getEntryMediaUrl({href: {type: "external", url: "https://example.com/homebrew image.png"}}, "href", "img"),
		"https://example.com/homebrew image.png",
		`${edition}: URL externa de homebrew`,
	);

	const makebrew = await readFile(`./${edition}/js/makebrew/makebrew-builder-base.js`, "utf8");
	assert.doesNotMatch(makebrew, /window\.location\.origin.*\/img\//, `${edition}: el editor no debe generar URLs locales`);
	assert.match(makebrew, /SalixImageUrl\.get\(href\.path\)/, `${edition}: el editor debe usar el resolvedor compartido`);
}

console.log("PASS: imágenes externas, rutas codificadas, tokens, DM Screen y editor de criaturas.");
