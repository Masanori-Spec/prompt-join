import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { joinScripts } from "../src/core.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const sources = await Promise.all(
  ["a", "b"].map(async (n) => {
    const bytes = await readFile(`artifacts/native/${n}.html`);
    const fixture = await readFile(`test/fixtures/${n}.html`);
    if (!bytes.equals(fixture))
      throw Error(
        "Fresh native-authored fixture differs from retained original",
      );
    return { name: `${n}.html`, bytes };
  }),
);
const inputHashes = sources.map((s) => sha(s.bytes));
const remap = {
  "0:0": { action: "retain" },
  "1:0": { action: "remap", key: 66 },
};
const resaved = await Promise.all(
  ["a", "b"].map(async (n) => {
    const bytes = await readFile(`artifacts/native/${n}-roundtrip.html`);
    if (!bytes.equals(await readFile(`test/fixtures/${n}-roundtrip.html`)))
      throw Error(
        "Fresh native roundtrip fixture differs from retained original",
      );
    return { name: `${n}-roundtrip.html`, bytes };
  }),
);
const rejoined = joinScripts(resaved, { order: [0, 1], decisions: remap });
await writeFile("artifacts/native/resaved-inputs.html", rejoined.html);
await writeFile(
  "artifacts/native/resaved-inputs-receipt.json",
  JSON.stringify(
    {
      ...rejoined.receipt,
      inputHashes: resaved.map((s) => sha(s.bytes)),
      outputSHA256: sha(rejoined.html),
    },
    null,
    2,
  ) + "\n",
);
for (const [mode, order, decisions] of [
  ["joined", [0, 1], remap],
  ["reversed", [1, 0], remap],
  [
    "cleared",
    [0, 1],
    { "0:0": { action: "retain" }, "1:0": { action: "clear" } },
  ],
  [
    "duplicate",
    [0, 1],
    { "0:0": { action: "retain" }, "1:0": { action: "retain" } },
  ],
]) {
  const result = joinScripts(sources, { order, decisions });
  await writeFile(`artifacts/native/${mode}.html`, result.html);
  await writeFile(
    `artifacts/native/${mode}-receipt.json`,
    JSON.stringify(
      { ...result.receipt, inputHashes, outputSHA256: sha(result.html) },
      null,
      2,
    ) + "\n",
  );
}
const joined = await readFile("artifacts/native/joined.html", "utf8");
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
for (let i = 0; i < sources.length; i++) {
  if (
    sha(sources[i].bytes) !== inputHashes[i] ||
    sha(await readFile(`artifacts/native/${sources[i].name}`)) !==
      inputHashes[i]
  )
    throw Error("Native input bytes changed");
}
console.log(
  "PASS generated chosen-order joins and deliberate controls from exact native fixture bytes",
);
