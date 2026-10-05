(() => {
	const ROOT = "https://raw.githubusercontent.com/Salix8/Salix8-assets/main/img/";

	const getEncodedPath = (path) => `${path ?? ""}`
		.replace(/^\/+/, "")
		.split("/")
		.filter(Boolean)
		.map(part => {
			try {
				return encodeURIComponent(decodeURIComponent(part));
			} catch {
				return encodeURIComponent(part);
			}
		})
		.join("/");

	const getPath = (path) => {
		const normalizedPath = `${path ?? ""}`
			.replace(/^\/+/, "")
			.split("/")
			.map(part => {
				try {
					return decodeURIComponent(part);
				} catch {
					return part;
				}
			})
			.join("/");
		const legacyTokenPath = normalizedPath.replace(/^bestiary\/tokens\//, "");
		return globalThis.SALIX_IMAGE_PATH_OVERRIDES?.[normalizedPath]
			|| globalThis.SALIX_IMAGE_PATH_OVERRIDES?.[legacyTokenPath]
			|| normalizedPath;
	};

	globalThis.SalixImageUrl = Object.freeze({
		ROOT,
		get: (path) => /^https?:\/\//i.test(`${path ?? ""}`) ? path : `${ROOT}${getEncodedPath(getPath(path))}`,
	});
})();
