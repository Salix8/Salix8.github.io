"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

require("../js/utils.js");
require("../js/render.js");

const utilsPath = path.join(__dirname, "..", "js", "utils.js");
const utilsSource = fs.readFileSync(utilsPath, "utf8");

assert.strictEqual(Parser.sourceJsonToColor("TCE"), "sourceTCE");
assert.strictEqual(Parser.sourceJsonToColor("Himo"), "sourceHimo");
assert.match(utilsSource, /TCE: "#b07d62"/);
assert.match(utilsSource, /Himo: "#e6ab94"/);
assert.match(utilsSource, /scrollbar-color:#555 #222/);
assert.match(utilsSource, /::-webkit-scrollbar-thumb\{background:#555/);

const rendered = Renderer.get().render({
	name: "Source Colour Test",
	source: "TCE",
	page: 65,
	entries: ["Test entry."],
});

assert.match(rendered, /rd__title-link sourceTCE/);
assert.match(rendered, />TCE<\/span> p65/);

console.log("PASS: los libros reciben clases y colores de fuente, también en encabezados.");
