import { parser } from "../index"; // 替换为您的模块路径
import path from "path";

const input = "src/app/main.ts";
const outDir = path.resolve(__dirname, "./fixtures/dist");
const publicPath = "/public/dist/";

describe("parser manifest.json with error", () => {

    it("should return correct script tag in development environment", async () => {
        const result = await parser({ input, outDir, publicPath, isDev: true });
        expect(result.js).toContain(`<script type="module" src="${publicPath}${input}"></script>`);
    });

    it("should handle missing manifest.json in production environment", async () => {

        await expect(parser({ input: "/test/index.ts", outDir, publicPath, isDev: false }))
            .rejects
            .toThrow("manifest.json文件中未发现入口");
    });

    // 清理 mock
    afterAll(() => {
        jest.restoreAllMocks();
    });
});


describe("parser in production environment", () => {
    it("should return correct tags when manifest.json is correct", async () => {
        const result = await parser({ input, outDir, publicPath, isDev: false });
        expect(result.js).toContain("assets/main.123abc.js");
        expect(result.css).toContain("assets/main.456def.css");
        expect(result.preload).toContain("assets/main.123abc.js");
        expect(result.preload).toContain("assets/component.789ghi.js");
    });

    it("should throw an error with invalid input", async () => {
        await expect(parser({ input: "", outDir, publicPath, isDev: false }))
            .rejects
            .toThrow("参数有误");
    });

    // 清理 mock
    afterAll(() => {
        jest.restoreAllMocks();
    });
});


describe("parser in production environment with legacy support", () => {
    it("should return correct legacy script tags when legacy entries are present", async () => {
        const result = await parser({ input, outDir: path.resolve(__dirname, "./fixtures/dist-legacy"), publicPath, isDev: false });
        // 检查是否包含legacy脚本和polyfill
        expect(result.js).toEqual("<script type=\"module\">const script=document.createElement(\"script\");try {if(!\"noModule\" in HTMLScriptElement.prototype)throw \"\";import.meta.url;import(\"_\").catch(()=>1);(async function*(){})().next();script.type = \"module\";script.src=\"/public/dist/assets/main.123abc.js\";document.body.appendChild(script);window._isRunManifestJs = true;}catch(error) {}</script><script>window.onload=function(){if(window._isRunManifestJs) return;const script = document.createElement(\"script\");script.src = \"/public/dist/assets/legacy-polyfills.ghi789.js\",script.onload= unction(){System.import(\"/public/dist/assets/main-legacy.abc123.js\");},document.body.appendChild(script);}</script>");
    });

    // 清理 mock
    afterAll(() => {
        jest.restoreAllMocks();
    });
});
