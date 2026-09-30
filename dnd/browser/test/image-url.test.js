"use strict";

const assert = require("assert");
const fs = require("fs");
require("../js/utils.js");

assert.strictEqual(
	UrlUtil.getImageUrl("bestiary/MM/Aarakocra.jpg"),
	"https://raw.githubusercontent.com/Salix8/Salix8-assets/main/img/bestiary/MM/Aarakocra.jpg"
);
assert.strictEqual(
	UrlUtil.getImageUrl("AI/Ancient Deep Crow.png"),
	"https://raw.githubusercontent.com/Salix8/Salix8-assets/main/img/AI/Ancient%20Deep%20Crow.png"
);
assert.strictEqual(
	UrlUtil.getImageUrl("/book/PHB/Point of Origin #1.png"),
	"https://raw.githubusercontent.com/Salix8/Salix8-assets/main/img/book/PHB/Point%20of%20Origin%20%231.png"
);

const style = fs.readFileSync(`${__dirname}/../css/style.css`, "utf8");
assert.ok(style.includes("https://raw.githubusercontent.com/Salix8/Salix8-assets/main/img/bestiary/stat-block-top-texture.png"));
assert.ok(!style.includes("../img/bestiary/stat-block-top-texture.png"));

console.log("PASS: las imágenes internas se resuelven desde Salix8-assets.");
