import { readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = "downloaded-browser/artifacts/browser",
  sha = (b) => createHash("sha256").update(b).digest("hex");
const report = JSON.parse(
  await readFile(`${base}/browser-report.json`, "utf8"),
);
if (
  report.status !== "PASS" ||
  report.pageErrors.length ||
  report.consoleErrors.length ||
  report.networkRequests.length
)
  throw Error("Browser acceptance did not pass");
const shipped = await readFile("dist/prompt-join.html"),
  tested = await readFile("downloaded-browser/dist/prompt-join.html");
if (!shipped.equals(tested) || report.shippedHTMLSHA256 !== sha(shipped))
  throw Error("Tested browser HTML does not match this source head");
const modes = ["joined", "reversed", "cleared", "resaved-inputs", "duplicate"];
if (
  JSON.stringify(Object.keys(report.downloads).sort()) !==
  JSON.stringify([...modes].sort())
)
  throw Error("Incomplete browser download set");
for (const name of [
  "a.html",
  "b.html",
  "a-roundtrip.html",
  "b-roundtrip.html",
]) {
  if (
    !(await readFile(`artifacts/native/${name}`)).equals(
      await readFile(`test/fixtures/${name}`),
    )
  )
    throw Error("Fresh native fixture differs from original input");
}
const files = [];
for (const mode of modes) {
  const html = await readFile(`${base}/${mode}.html`),
    receiptBytes = await readFile(`${base}/${mode}-receipt.json`),
    receipt = JSON.parse(receiptBytes.toString());
  const recorded = report.downloads[mode];
  if (
    sha(html) !== recorded.sha256 ||
    html.length !== recorded.bytes ||
    sha(receiptBytes) !== recorded.receiptSHA256 ||
    receipt.outputSHA256 !== sha(html) ||
    receipt.outputBytes !== html.length ||
    receipt.exportOrigin !== "browser UI download"
  )
    throw Error("Actual browser download/receipt parity failed");
  await copyFile(`${base}/${mode}.html`, `artifacts/native/${mode}.html`);
  await copyFile(
    `${base}/${mode}-receipt.json`,
    `artifacts/native/${mode}-receipt.json`,
  );
  files.push({ mode, bytes: html.length, sha256: sha(html) });
}
const joined = (await readFile("artifacts/native/joined.html")).toString();
if (joined.split("#cc2244").length !== 2 || joined.split("End B").length !== 2)
  throw Error("Fault sentinel must occur exactly once");
await writeFile(
  "artifacts/native/wrong-color.html",
  joined.replace("#cc2244", "#008800"),
);
await writeFile(
  "artifacts/native/wrong-text.html",
  joined.replace("End B", "Bad B"),
);
await writeFile(
  "artifacts/native/browser-input-provenance.json",
  JSON.stringify(
    {
      origin:
        "Five actual sandboxed browser UI downloads; no prototype output replacement",
      testedHTMLSHA256: sha(shipped),
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "PASS exact actual browser downloads routed unchanged into the native gate",
);
