import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const output = await build({
  entryPoints: ["web/app.mjs"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
  legalComments: "inline",
});
const js = output.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = await readFile("web/styles.css", "utf8"),
  notices = await readFile("docs/third-party-notices.txt", "utf8");
const escaped = notices
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const html = (await readFile("web/index.html", "utf8"))
  .replace("/* APP_CSS */", () => css)
  .replace("/* THIRD_PARTY */", () => escaped)
  .replace("/* APP_JS */", () => js);
if (/\/\* (APP_CSS|APP_JS|THIRD_PARTY) \*\//.test(html))
  throw Error("Unfilled standalone template");
await mkdir("dist", { recursive: true });
await writeFile("dist/prompt-join.html", html);
console.log(`Built standalone HTML: ${Buffer.byteLength(html)} bytes`);
