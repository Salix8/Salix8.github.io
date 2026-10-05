import {writeFile} from "node:fs/promises";

const ASSET_TREE_URL = "https://api.github.com/repos/Salix8/Salix8-assets/git/trees/main?recursive=1";
const OUTPUT_PATH = new URL("../dnd-shared/salix-image-path-map.js", import.meta.url);
const TARGET_EXTENSIONS = [".webp", ".jpg", ".png"];

const response = await fetch(ASSET_TREE_URL, {headers: {"User-Agent": "Salix8-image-map-generator"}});
if (!response.ok) throw new Error(`Could not read Salix8-assets tree: ${response.status} ${response.statusText}`);

const {tree} = await response.json();
const byStem = new Map();
for (const {path, type} of tree) {
	if (type !== "blob" || !path.startsWith("img/")) continue;
	const relativePath = path.slice("img/".length);
	const extensionIndex = relativePath.lastIndexOf(".");
	if (extensionIndex < 0) continue;
	const extension = relativePath.slice(extensionIndex).toLowerCase();
	if (!TARGET_EXTENSIONS.includes(extension)) continue;
	const stem = relativePath.slice(0, extensionIndex);
	const paths = byStem.get(stem) || new Map();
	paths.set(extension, relativePath);
	byStem.set(stem, paths);
}

const overrides = {};
for (const [stem, paths] of byStem) {
	const fallback = paths.get(".jpg") || paths.get(".png");
	for (const extension of TARGET_EXTENSIONS) {
		const requestedPath = `${stem}${extension}`;
		const availablePath = paths.get(extension) || fallback;
		if (availablePath && availablePath !== requestedPath) overrides[requestedPath] = availablePath;
	}
}

const contents = `// Generated from the public Salix8-assets tree. Run \`node node/generate-salix-image-path-map.mjs\` after changing image assets.\n` +
	`globalThis.SALIX_IMAGE_PATH_OVERRIDES = Object.freeze(${JSON.stringify(overrides, null, "\t")});\n`;
await writeFile(OUTPUT_PATH, contents);
console.log(`Generated ${Object.keys(overrides).length} image path overrides.`);
