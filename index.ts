import path from "path";
/**
 * 解析manifest.json文件，生成对应的代码块，方便后端集成使用
 * @param input input 入口文件，客户端项目的相对路径(manifest.json中入口文件的key值), 例如: src/app/main.ts
 * @param outDir 打包目录，请使用绝对路径 例如：path.resolve(__dirname, './app/public/dist')
 * @param publicPath 资源路径，例如：/public/dist/、 https://static.xxx.com/, 默认值 '/'
 * @param isDev 是否为开发环境，开发环境不会解析manifest.json文件，直接使用vite开发服务器，入口为 publicPath + input
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
    if (!input || !publicPath) throw Error("参数有误");

    // 没有打包，css不需要提取，前端资源通过vite开发服务器解释执行
    if (isDev) {
        return {
            preload: "",
            css: "",
            js: `<script type="module" src="${publicPath}${input}"></script>`,
        };
    }

    let manifest = {};
    try {
        manifest = await import(path.resolve(outDir, "./manifest.json"));
    } catch (error) {
        console.error("打包环境，未找到manifest.json文件");
        throw error;
    }

    if (!manifest[input]) throw Error("manifest.json文件中未发现入口");

    const pageInfo = manifest[input];
    const legacyPageInfo = manifest[input.replace(/\.jsx?$|\.tsx?$/, "-legacy$&")];
    const legacyPolyfillsInfo = manifest["vite/legacy-polyfills-legacy"];
    // 生成css link
    const cssHtml = pageInfo.css.map(cssUrl => `<link rel="stylesheet" href="${publicPath}${cssUrl}" />`).join(" ");
    // 生成preload link
    const preloadList = [input];
    if (Array.isArray(pageInfo.imports)) {
        preloadList.push(...pageInfo.imports);
    }
    const preloadHtml = preloadList.map(pre => {
        if (!manifest[pre]?.file) return "";
        return `<link rel="modulepreload" href="${publicPath}${manifest[pre].file}" />`;
    }).join(" ");

    if (!legacyPageInfo?.file || !legacyPolyfillsInfo?.file) {
        return {
            preload: preloadHtml,
            css: cssHtml,
            js: `<script type="module" src="${publicPath}${pageInfo.file}"></script>`,
        };
    }
    return {
        preload: preloadHtml,
        css: cssHtml,
        js: `<script type="module">const script=document.createElement("script");try {if(!"noModule" in HTMLScriptElement.prototype)throw "";import.meta.url;import("_").catch(()=>1);(async function*(){})().next();script.type = "module";script.src="${publicPath}${pageInfo.file}";document.body.appendChild(script);window._isRunManifestJs = true;}catch(error) {}</script><script>window.onload=function(){if(window._isRunManifestJs) return;const script = document.createElement("script");script.src = "${publicPath}${legacyPolyfillsInfo.file}",script.onload= unction(){System.import("${publicPath}${legacyPageInfo.file}");},document.body.appendChild(script);}</script>`,
    };
};
