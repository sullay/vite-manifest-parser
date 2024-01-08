import path from "path";

/**
 * Parses the manifest.json file to generate corresponding code blocks for easy backend integration.
 * In the development environment, the manifest.json file will not be parsed, and the entry will use the Vite development server directly at publicPath + input.
 * @param input The entry file, which is the relative path in the client project (the key value in the manifest.json), for example: src/app/main.ts
 * @param outDir The build directory, please use an absolute path, for example: path.resolve(__dirname, './app/public/dist')
 * @param publicPath The resource path, such as: /public/dist/, https://static.xxx.com/; the default value is '/'
 * @param isDev Indicates whether it is a development environment
 */
export const parser = async ({
    input,
    outDir = "",
    publicPath = "/",
    isDev = false
}: {
  input: string,
  outDir?: string,
  publicPath?: string,
  isDev?: boolean
}) => {
    if (!input || !publicPath) throw Error("Invalid parameters");

    // When not bundled, CSS is not extracted, and frontend resources are served through the Vite development server.
    if (isDev) {
        return {
            preload: "",
            css: "",
            js: `<script type="module" src="${publicPath}${input}"></script>`,
        };
    }

    let manifest = {};
    try {
        // Attempt to dynamically import the manifest.json file
        manifest = await import(path.resolve(outDir, "./manifest.json"));
    } catch (error) {
        // If the manifest.json file is not found in the production environment, log an error and throw
        console.error("In the production environment, the manifest.json file was not found");
        throw error;
    }

    // If the entry specified in the manifest.json file is not found, throw an error
    if (!manifest[input]) throw Error("Entry not found in the manifest.json file");

    const pageInfo = manifest[input];
    // Attempt to retrieve legacy pageInfo for older browsers
    const legacyPageInfo = manifest[input.replace(/\.jsx?$|\.tsx?$/, "-legacy$&")];
    // Retrieve information for legacy polyfills if available
    const legacyPolyfillsInfo = manifest["vite/legacy-polyfills-legacy"];
    // Generate HTML for CSS links
    const cssHtml = pageInfo.css.map(cssUrl => `<link rel="stylesheet" href="${publicPath}${cssUrl}" />`).join(" ");
    // Generate HTML for preload links
    const preloadList = [input];
    if (Array.isArray(pageInfo.imports)) {
        preloadList.push(...pageInfo.imports);
    }
    const preloadHtml = preloadList.map(pre => {
        if (!manifest[pre]?.file) return "";
        return `<link rel="modulepreload" href="${publicPath}${manifest[pre].file}" />`;
    }).join(" ");

    // If legacy fileInfo is not available, return the standard script tags
    if (!legacyPageInfo?.file || !legacyPolyfillsInfo?.file) {
        return {
            preload: preloadHtml,
            css: cssHtml,
            js: `<script type="module" src="${publicPath}${pageInfo.file}"></script>`,
        };
    }
    // If legacy fileInfo is available, return the necessary scripts to load legacy and polyfill files conditionally
    return {
        preload: preloadHtml,
        css: cssHtml,
        js: `<script type="module">const script=document.createElement("script");try {if(!"noModule" in HTMLScriptElement.prototype) throw "";import.meta.url;import("_").catch(()=>1);(async function*(){})().next();script.type = "module";script.src="${publicPath}${pageInfo.file}";document.body.appendChild(script);window._isRunManifestJs = true;}catch(error) {}</script><script>window.onload=function(){if(window._isRunManifestJs) return;const script = document.createElement("script");script.src = "${publicPath}${legacyPolyfillsInfo.file}",script.onload=function(){System.import("${publicPath}${legacyPageInfo.file}");},document.body.appendChild(script);}</script>`,
    };
};
