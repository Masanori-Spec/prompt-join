import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const art = resolve("artifacts/browser");
await mkdir(art, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const originals = await Promise.all(
  ["a", "b"].map((n) => readFile(`test/fixtures/${n}.html`)),
);
const resaved = await Promise.all(
  ["a", "b"].map((n) => readFile(`test/fixtures/${n}-roundtrip.html`)),
);
const shipped = await readFile("dist/prompt-join.html");
const report = {
  status: "RUNNING",
  cases: [],
  pageErrors: [],
  consoleErrors: [],
  networkRequests: [],
  screenshots: [],
  shippedHTMLSHA256: sha(shipped),
  downloads: {},
};
const check = (name, details = {}) => {
  report.cases.push({ name, passed: true, ...details });
  console.log("PASS", name);
};
if (!process.env.CHROMIUM_PATH) throw Error("Use hosted sandboxed Chrome");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  chromiumSandbox: true,
});
report.browserVersion = browser.version();
const commands = execFileSync("ps", ["-eo", "args"], { encoding: "utf8" })
  .split("\n")
  .filter(
    (s) =>
      s.includes("--remote-debugging-pipe") &&
      s.includes("--user-data-dir=") &&
      /chrome|chromium/.test(s),
  );
if (
  !commands.length ||
  commands.some(
    (s) => s.includes("--no-sandbox") || s.includes("--disable-setuid-sandbox"),
  )
)
  throw Error("Sandboxed Chrome not established");
report.chromiumMainProcessCommands = commands;
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  acceptDownloads: true,
});
await context.setOffline(true);
const page = await context.newPage();
let downloads = 0;
page.on("pageerror", (e) => report.pageErrors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push(message.text());
});
page.on("request", (r) => {
  if (/^https?:/.test(r.url())) report.networkRequests.push(r.url());
});
page.on("download", () => downloads++);
const choice = (id) => page.locator(`select[data-cue-id="${id}"]`);
async function shot(name, locator = page) {
  await locator.screenshot({
    path: resolve(art, name),
    ...(locator === page ? { fullPage: true } : {}),
  });
  report.screenshots.push(name);
}
const payload = (
  buffers = originals,
  names = ["private-a.html", "private-b.html"],
) =>
  buffers.map((buffer, i) => ({
    name: names[i],
    mimeType: "text/html",
    buffer,
  }));
async function load(buffers = originals, names) {
  await page.locator("#files").setInputFiles(payload(buffers, names));
  await expect(page.locator("#status")).not.toContainText(
    /Reading scripts|読み込んで/,
  );
}
async function approve(second = "remap:66") {
  await page.locator("#confirm-order").check();
  await choice("0:0").selectOption("retain");
  await choice("1:0").selectOption(second);
  await expect(page.locator("#export")).toBeEnabled();
}
async function save(selector, name, keyboard = false) {
  const wait = page.waitForEvent("download");
  if (keyboard) {
    await page.locator(selector).focus();
    await page.keyboard.press("Enter");
  } else await page.locator(selector).click();
  const d = await wait;
  await d.saveAs(resolve(art, name));
  return readFile(resolve(art, name));
}
async function exportMode(
  mode,
  expectedCues,
  buffers = originals,
  keyboard = false,
) {
  const html = await save("#export", `${mode}.html`, keyboard);
  const receipt = JSON.parse(
    (await save("#receipt", `${mode}-receipt.json`)).toString(),
  );
  expect(receipt.inputHashes).toEqual(buffers.map(sha));
  expect(receipt.inputs.map((f) => [f.bytes, f.sha256])).toEqual(
    buffers.map((b) => [b.length, sha(b)]),
  );
  expect(receipt.outputSHA256).toBe(sha(html));
  expect(receipt.outputBytes).toBe(html.length);
  expect(receipt.cues.map((c) => [c.text, c.positionUTF16, c.key])).toEqual(
    expectedCues,
  );
  expect(receipt.exportOrigin).toBe("browser UI download");
  report.downloads[mode] = {
    bytes: html.length,
    sha256: sha(html),
    receiptSHA256: sha(await readFile(resolve(art, `${mode}-receipt.json`))),
  };
  return { html, receipt };
}
const joinedCues = [
  ["Cue one", 14, 65],
  ["Local A", 22, 0],
  ["Cue two", 44, 66],
  ["Local B", 52, 0],
];
try {
  await page.goto(pathToFileURL(resolve("dist/prompt-join.html")).href);
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("#export")).toBeDisabled();
  await shot("01-ja-empty-desktop.png");
  check("Offline Japanese start has no scripts or automatic order approval");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace")).toBeFocused();
  const chooserWait = page.waitForEvent("filechooser");
  await page.locator("#files").focus();
  await page.keyboard.press("Enter");
  const chooser = await chooserWait;
  await chooser.setFiles(payload());
  await expect(page.locator("#order-list li")).toHaveCount(2);
  await expect(page.locator("#confirm-order")).not.toBeChecked();
  await expect(page.locator("#export")).toBeDisabled();
  check(
    "Keyboard skip and real file chooser retain explicit order confirmation",
  );
  await page.locator("#confirm-order").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#confirm-order")).toBeChecked();
  await expect(page.locator("#export")).toBeDisabled();
  await choice("0:0").focus();
  await choice("0:0").selectOption("retain");
  await expect(choice("0:0")).toBeFocused();
  await expect(page.locator("#export")).toBeDisabled();
  await choice("1:0").selectOption("remap:66");
  await expect(page.locator("#export")).toBeEnabled();
  expect(
    await page.locator("#cue-table tr td:last-child").allTextContents(),
  ).toEqual(["14", "22", "44", "52"]);
  await expect(page.locator("#preview-source")).toHaveValue("joined");
  check(
    "Every repeated key requires a decision; remap produces exact Unicode-aware positions",
  );
  const actual = await exportMode("joined", joinedCues, originals, true);
  expect(sha(actual.html)).toBe(
    "c9587c329522aec6a423e76f311eaddf3056695e366c596e28f964a9c6b417e4",
  );
  expect(actual.receipt.retainedConflicts).toEqual([]);
  await shot("02-ja-joined-desktop.png");
  check(
    "Actual keyboard HTML download matches accepted native bytes and complete receipt hashes",
    report.downloads.joined,
  );
  await page.locator("#lang-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#receipt")).toBeEnabled();
  await expect(choice("1:0")).toHaveValue("remap:66");
  await shot("03-en-joined-desktop.png");
  check(
    "Language switch preserves reviewed order, decisions and valid receipt",
  );
  const tokyo = page.locator("#preview span").filter({ hasText: "東京" });
  expect(
    await tokyo.evaluate((e) => ({
      color: getComputedStyle(e).color,
      bg: getComputedStyle(e).backgroundColor,
      weight: getComputedStyle(e).fontWeight,
      italic: getComputedStyle(e).fontStyle,
    })),
  ).toEqual({
    color: "rgb(18, 102, 170)",
    bg: "rgb(170, 255, 204)",
    weight: "700",
    italic: "normal",
  });
  await page.locator("#preview-theme").click();
  await expect(page.locator("#preview")).toHaveClass(/dark/);
  await expect(page.locator("#receipt")).toBeEnabled();
  await page.locator("#preview-theme").click();
  check(
    "Color/emphasis preview and canvas change leave export semantics intact",
  );
  for (const lang of ["ja", "en"]) {
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.locator(`#lang-${lang}`).click();
    await page.pdf({
      path: resolve(art, `review-${lang}.pdf`),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    const text = execFileSync(
      "pdftotext",
      [resolve(art, `review-${lang}.pdf`), "-"],
      { encoding: "utf8" },
    );
    for (const label of [
      "private-a.html",
      "private-b.html",
      "Cue one",
      "Cue two",
      "Local A",
      "Local B",
      "SHA-256",
    ])
      expect(text).toContain(label);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator(".table-wrap").evaluate((e) => (e.scrollLeft = 0));
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await shot(`04-${lang}-mobile-${width}.png`);
      await page
        .locator(".table-wrap")
        .evaluate((e) => (e.scrollLeft = e.scrollWidth));
      const bounds = await page.locator(".table-wrap").evaluate((e) => {
        const r = e.getBoundingClientRect(),
          c = e.querySelector("tbody tr td:last-child").getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          cellLeft: c.left,
          cellRight: c.right,
          scroll: e.scrollLeft,
        };
      });
      expect(bounds.cellLeft).toBeGreaterThanOrEqual(bounds.left - 2);
      expect(bounds.cellRight).toBeLessThanOrEqual(bounds.right + 2);
      await shot(
        `04-${lang}-mobile-${width}-positions.png`,
        page.locator("#review"),
      );
      check(
        `Native cue positions remain reachable at ${lang} ${width}px`,
        bounds,
      );
    }
  }
  check(
    "Both printed reviews include all source identities, cue labels and output hash",
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.locator("#lang-en").click();
  await page.locator(".table-wrap").evaluate((e) => (e.scrollLeft = 0));
  const summary = await page.locator("#file-summary").textContent();
  await page.locator("#files").evaluate((e) => {
    e.value = "";
    e.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#file-summary")).toHaveText(summary);
  await expect(page.locator("#receipt")).toBeEnabled();
  check("Dispatched empty file-change event preserves a valid review");
  await page.locator('[data-up="1"]').focus();
  await page.keyboard.press("Enter");
  expect(
    await page.locator("#order-list .file-name").allTextContents(),
  ).toEqual(["private-b.html", "private-a.html"]);
  await expect(page.locator('[data-file-id="1"]')).toBeFocused();
  await expect(page.locator("#confirm-order")).not.toBeChecked();
  await expect(choice("0:0")).toHaveValue("");
  await expect(page.locator("#receipt")).toBeDisabled();
  await approve();
  const reversed = await exportMode("reversed", [
    ["Cue two", 8, 66],
    ["Local B", 16, 0],
    ["Cue one", 44, 65],
    ["Local A", 52, 0],
  ]);
  expect(reversed.receipt.order).toEqual([1, 0]);
  check(
    "Keyboard reordering invalidates prior approval and maps reversed positions exactly",
  );
  await load();
  await approve("clear");
  await exportMode("cleared", [
    ["Cue one", 14, 65],
    ["Local A", 22, 0],
    ["Cue two", 44, 0],
    ["Local B", 52, 0],
  ]);
  check("Clearing a shortcut keeps its ordinary local cue and exact position");
  await choice("1:0").selectOption("retain");
  await expect(page.locator("#retained-warning")).toBeVisible();
  await expect(page.locator("#retained-warning")).toContainText("first cue");
  const duplicate = await exportMode("duplicate", [
    ["Cue one", 14, 65],
    ["Local A", 22, 0],
    ["Cue two", 44, 65],
    ["Local B", 52, 0],
  ]);
  expect(duplicate.receipt.retainedConflicts).toEqual([
    { key: 65, ids: ["0:0", "1:0"] },
  ]);
  await shot("05-en-retained-warning.png");
  check(
    "Explicit duplicate retention warns about native first-match behavior and records the choice",
  );
  await load(resaved, ["private-a-roundtrip.html", "private-b-roundtrip.html"]);
  await approve();
  await exportMode("resaved-inputs", joinedCues, resaved);
  check(
    "Actual native-saved first-character anchors remain complete cues through the UI",
  );
  await choice("0:0").selectOption("remap:66");
  await expect(page.locator("#status")).toContainText("NEW_CONFLICT");
  await expect(page.locator("#export")).toBeDisabled();
  await expect(page.locator("#receipt")).toBeDisabled();
  check("A remap introducing a collision blocks export and stale receipts");
  await page.locator('[data-remove="1"]').click();
  await expect(page.locator("#order-list li")).toHaveCount(1);
  await expect(page.locator("#confirm-order")).toBeDisabled();
  await expect(page.locator("#export")).toBeDisabled();
  check(
    "Removing a script invalidates order, decisions and export below the two-file minimum",
  );
  const badCases = [
    [
      "generic",
      Buffer.from(
        "<!doctype html><html><head></head><body><p>x</p></body></html>",
      ),
      "NATIVE_HTML",
    ],
    [
      "external",
      Buffer.from(
        originals[0]
          .toString()
          .replace('href="#"', 'href="https://example.invalid/collect"'),
      ),
      "EXTERNAL_MARKER",
    ],
    [
      "automation",
      Buffer.from(
        originals[0].toString().replace('name="key_65"', 'name="req_1"'),
      ),
      "MARKER",
    ],
    [
      "script",
      Buffer.from(
        originals[0]
          .toString()
          .replace("</head>", "<script>alert(1)</script></head>"),
      ),
      "HEAD_CONTENT",
    ],
    [
      "nested",
      Buffer.from(
        originals[0].toString().replace("Alpha ", "<s><u>Alpha </u></s>"),
      ),
      "INLINE_CONTENT",
    ],
    [
      "empty cue",
      Buffer.from(
        originals[0]
          .toString()
          .replace(
            '<a name="key_65"></a>',
            '<a name="key_65"><span></span></a>',
          ),
      ),
      "MARKER",
    ],
    ["encoding", Buffer.from([255, 255]), "UTF8"],
  ];
  for (const [label, buffer, code] of badCases) {
    await load([buffer, originals[1]]);
    await expect(page.locator("#status")).toContainText(code);
    await expect(page.locator("#export")).toBeDisabled();
    await expect(page.locator("#receipt")).toBeDisabled();
    await expect(page.locator("#preview-section")).toBeHidden();
    check(`${label} input fails closed with no stale review`);
  }
  await shot("06-en-blocked-input.png");
  await load(originals, ["script.docx", "b.html"]);
  await expect(page.locator("#status")).toContainText("FILE_TYPE");
  check("Office documents are rejected before parsing");
  await load([Buffer.alloc(2 * 1024 * 1024 + 1, 32), originals[1]]);
  await expect(page.locator("#status")).toContainText("INPUT_LIMIT");
  check("Oversized files are blocked before their contents are parsed");
  const extra =
    '<p><a href="#"><span style="text-decoration:underline overline; color:#203040;">Extra</span></a></p>'.repeat(
      101,
    );
  await load([
    Buffer.from(originals[0].toString().replace("</body>", extra + "</body>")),
    originals[1],
  ]);
  await expect(page.locator("#status")).toContainText("UI_CUE_LIMIT");
  check("UI cue-count bounds block oversized review tables");
  await load(originals, ["<img src=x onerror=alert(1)>.html", "b.html"]);
  await expect(page.locator("#order-list")).toContainText(
    "<img src=x onerror=alert(1)>.html",
  );
  expect(await page.locator("#order-list img").count()).toBe(0);
  check("Imported filenames render as inert text");
  const long = Buffer.from(
    originals[0].toString().replace("End A", "L".repeat(13000) + "🌟"),
  );
  await load([long, originals[1]]);
  await approve();
  await expect(page.locator("#preview-caption")).toContainText("12,000");
  expect(
    (await page.locator("#preview").textContent()).length,
  ).toBeLessThanOrEqual(12000);
  check(
    "Long previews are explicitly bounded while the full supported output remains available",
  );
  await page.evaluate(() => {
    window.__read = File.prototype.arrayBuffer;
    window.__pendingReads = 0;
    File.prototype.arrayBuffer = async function () {
      window.__pendingReads++;
      try {
        await new Promise((r) => setTimeout(r, 700));
        return await window.__read.call(this);
      } finally {
        window.__pendingReads--;
      }
    };
  });
  await page.locator("#files").setInputFiles(payload());
  await expect(page.locator("#status")).toContainText("Reading");
  await page.locator("#sample").click();
  await expect.poll(() => page.evaluate(() => window.__pendingReads)).toBe(0);
  expect(
    await page.locator("#order-list .file-name").allTextContents(),
  ).toEqual(["sample-a.html", "sample-b.html"]);
  await expect(page.locator("#confirm-order")).not.toBeChecked();
  check("A late file read cannot replace a newer sample");
  await page.locator("#files").setInputFiles(payload());
  await page.locator("#clear").click();
  await expect.poll(() => page.evaluate(() => window.__pendingReads)).toBe(0);
  await expect(page.locator("#file-summary")).toHaveText("No scripts selected");
  await expect(page.locator("#export")).toBeDisabled();
  check("Clear invalidates pending file reads");
  await page.evaluate(() => (File.prototype.arrayBuffer = window.__read));
  await load();
  await approve();
  await page.evaluate(() => {
    window.__digest = crypto.subtle.digest.bind(crypto.subtle);
    window.__pendingDigests = 0;
    crypto.subtle.digest = async (...args) => {
      window.__pendingDigests++;
      try {
        await new Promise((r) => setTimeout(r, 700));
        return await window.__digest(...args);
      } finally {
        window.__pendingDigests--;
      }
    };
  });
  const before = downloads;
  await page.locator("#export").click();
  await page.locator('[data-up="1"]').click();
  await expect.poll(() => page.evaluate(() => window.__pendingDigests)).toBe(0);
  expect(downloads).toBe(before);
  await expect(page.locator("#receipt")).toBeDisabled();
  check("Reordering during hashing cancels a stale HTML download");
  await page.evaluate(() => (crypto.subtle.digest = window.__digest));
  await load();
  await approve();
  const one = await save("#export", "repeat-one.html"),
    two = await save("#export", "repeat-two.html");
  expect(one).toEqual(two);
  expect(one).toEqual(actual.html);
  check("Repeated exports are byte deterministic");
  const offline = await save("#offline", "saved-offline.html");
  expect(offline.toString()).not.toContain("private-a.html");
  const fresh = await context.newPage();
  fresh.on("pageerror", (e) => report.pageErrors.push(e.message));
  fresh.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push(message.text());
  });
  fresh.on("request", (r) => {
    if (/^https?:/.test(r.url())) report.networkRequests.push(r.url());
  });
  await fresh.goto(pathToFileURL(resolve(art, "saved-offline.html")).href);
  await expect(fresh.locator("html")).toHaveAttribute("lang", "ja");
  await expect(fresh.locator("#file-summary")).toHaveText(
    "まだ選択されていません",
  );
  await expect(fresh.locator("#export")).toBeDisabled();
  await fresh.locator("#sample").click();
  await expect(fresh.locator("#order-list li")).toHaveCount(2);
  await expect(fresh.locator("#confirm-order")).not.toBeChecked();
  await fresh.close();
  check(
    "Saved offline HTML reopens clean without imported data or previous decisions",
  );
  expect(report.pageErrors).toEqual([]);
  expect(report.consoleErrors).toEqual([]);
  expect(report.networkRequests).toEqual([]);
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.reason = error.message;
  report.stack = error.stack;
  try {
    await shot("99-failure.png");
    report.layoutOverflows = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .map((e) => ({
          tag: e.tagName,
          id: e.id,
          cls: e.className,
          left: e.getBoundingClientRect().left,
          right: e.getBoundingClientRect().right,
        }))
        .filter((r) => r.left < -1 || r.right > innerWidth + 1),
    );
  } catch {}
  throw error;
} finally {
  await writeFile(
    resolve(art, "browser-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await context.close();
  await browser.close();
}
console.log(
  "PASS actual browser HTML and receipts are ready for the unchanged native oracle",
);
