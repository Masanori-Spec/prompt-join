import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  inspectScript,
  analyzeScripts,
  joinScripts,
  JoinError,
  LIMITS,
} from "../src/core.mjs";
const a = readFileSync(new URL("./fixtures/a.html", import.meta.url));
const b = readFileSync(new URL("./fixtures/b.html", import.meta.url));
const input = () => [
  { name: "a.html", bytes: a },
  { name: "b.html", bytes: b },
];
const options = () => ({
  order: [0, 1],
  decisions: {
    "0:0": { action: "retain" },
    "1:0": { action: "remap", key: 66 },
  },
});
const rejects = (fn, code) =>
  assert.throws(
    fn,
    (e) => e instanceof JoinError && (!code || e.code === code),
  );
const replace = (from, to) => a.toString().replace(from, to);

test("native-saved first-letter anchors and underlined continuations retain full cues", () => {
  const resaved = ["a", "b"].map((n) => ({
    name: `${n}.html`,
    bytes: readFileSync(
      new URL(`./fixtures/${n}-roundtrip.html`, import.meta.url),
    ),
  }));
  const result = joinScripts(resaved, options());
  assert.deepEqual(
    result.receipt.cues.map((c) => [c.text, c.positionUTF16, c.key]),
    [
      ["Cue one", 14, 65],
      ["Local A", 22, 0],
      ["Cue two", 44, 66],
      ["Local B", 52, 0],
    ],
  );
});

test("actual native fixtures have literal Unicode text and UTF-16 cues", () => {
  const r = analyzeScripts(input());
  assert.equal(r.scripts[0].text, "Alpha café 🌟\nCue one\nLocal A\nEnd A");
  assert.equal(r.scripts[1].text, "Beta 東京\nCue two\nLocal B\nEnd B");
  assert.deepEqual(
    r.scripts.map((s) => s.cues.map((c) => [c.text, c.position, c.key])),
    [
      [
        ["Cue one", 14, 65],
        ["Local A", 22, 0],
      ],
      [
        ["Cue two", 8, 65],
        ["Local B", 16, 0],
      ],
    ],
  );
  assert.deepEqual(r.conflicts, [{ key: 65, ids: ["0:0", "1:0"] }]);
});
test("chosen order and explicit remap produce literal positions", () => {
  const r = joinScripts(input(), options());
  assert.equal(
    r.text,
    "Alpha café 🌟\nCue one\nLocal A\nEnd A\nBeta 東京\nCue two\nLocal B\nEnd B",
  );
  assert.deepEqual(
    r.receipt.cues.map((c) => [c.text, c.positionUTF16, c.key]),
    [
      ["Cue one", 14, 65],
      ["Local A", 22, 0],
      ["Cue two", 44, 66],
      ["Local B", 52, 0],
    ],
  );
  assert.equal(r.receipt.sources[1].startUTF16, 36);
  assert.deepEqual(r.receipt.retainedConflicts, []);
});
test("reversed order changes only the intended source sequence", () => {
  const o = options();
  o.order.reverse();
  const r = joinScripts(input(), o);
  assert.equal(
    r.text,
    "Beta 東京\nCue two\nLocal B\nEnd B\nAlpha café 🌟\nCue one\nLocal A\nEnd A",
  );
  assert.deepEqual(
    r.receipt.cues.map((c) => [c.positionUTF16, c.key]),
    [
      [8, 66],
      [16, 0],
      [44, 65],
      [52, 0],
    ],
  );
});
test("body defaults become per-run styles without leaking between scripts", () => {
  const r = inspectScript(joinScripts(input(), options()).html);
  const first = r.blocks[0].runs[0].style,
    second = r.blocks[4].runs[0].style;
  assert.deepEqual(
    [first.family, first.weight, first.italic, first.foreground],
    ["DejaVu Sans", 400, false, "#203040"],
  );
  assert.deepEqual(
    [second.family, second.weight, second.italic, second.foreground],
    ["DejaVu Serif", 600, true, "#405060"],
  );
  const em = r.blocks[4].runs[1].style;
  assert.deepEqual(
    [em.weight, em.italic, em.foreground, em.background],
    [700, false, "#1266aa", "#aaffcc"],
  );
});
test("native-normalized size declarations are disclosed and not claimed preserved", () => {
  const r = joinScripts(input(), options());
  assert.deepEqual(
    r.receipt.sources.map((s) => s.normalizedSizeDeclarations),
    [
      [{ property: "font-size", value: "24pt" }],
      [{ property: "font-size", value: "36pt" }],
    ],
  );
  assert.ok(!r.html.includes("font-size"));
});
test("every duplicate cue requires an explicit decision", () => {
  rejects(() => joinScripts(input(), { order: [0, 1] }), "KEY_CONFLICT");
  rejects(
    () =>
      joinScripts(input(), {
        order: [0, 1],
        decisions: { "1:0": { action: "clear" } },
      }),
    "KEY_CONFLICT",
  );
});
test("explicit duplicate retention remains visible in the receipt", () => {
  const o = options();
  o.decisions["1:0"] = { action: "retain" };
  assert.deepEqual(joinScripts(input(), o).receipt.retainedConflicts, [
    { key: 65, ids: ["0:0", "1:0"] },
  ]);
});
test("clearing a shortcut preserves the ordinary cue", () => {
  const o = options();
  o.decisions["1:0"] = { action: "clear" };
  const r = joinScripts(input(), o);
  assert.deepEqual(
    inspectScript(r.html).cues.map((c) => [c.text, c.key]),
    [
      ["Cue one", 65],
      ["Local A", 0],
      ["Cue two", 0],
      ["Local B", 0],
    ],
  );
});
test("a remap cannot silently introduce or retain a collision", () => {
  const o = options();
  o.decisions["1:0"].key = 65;
  rejects(() => joinScripts(input(), o), "NEW_CONFLICT");
});
test("unknown decision targets, extra fields and invalid shortcut codes reject", () => {
  const o = options();
  o.decisions["missing"] = { action: "clear" };
  rejects(() => joinScripts(input(), o), "DECISION");
  for (const d of [
    { action: "clear", key: 66 },
    { action: "remap", key: "66" },
    { action: "remap", key: 999 },
    { action: "retain", extra: 1 },
  ]) {
    const o = options();
    o.decisions["1:0"] = d;
    rejects(() => joinScripts(input(), o));
  }
});
test("order must include every selected file exactly once", () => {
  for (const order of [undefined, [], [0], [0, 0], [0, 2], [1.5, 0]])
    rejects(() => joinScripts(input(), { ...options(), order }), "ORDER");
});
test("input buffers stay byte identical across repeated exports", () => {
  const beforeA = Buffer.from(a),
    beforeB = Buffer.from(b);
  assert.equal(
    joinScripts(input(), options()).html,
    joinScripts(input(), options()).html,
  );
  assert.deepEqual(a, beforeA);
  assert.deepEqual(b, beforeB);
});
test("text and encoded entities are data, never markup injection", () => {
  const s = replace("Alpha ", "&lt;img src=x onerror=alert(1)&gt; &amp; ");
  const r = inspectScript(s);
  assert.ok(r.text.startsWith("<img src=x onerror=alert(1)> & "));
  const joined = joinScripts(
    [{ name: "a.html", text: s }, input()[1]],
    options(),
  );
  assert.ok(joined.html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!joined.html.includes("<img"));
});
test("real scripts, external assets and automation markers reject", () => {
  for (const html of [
    replace("</head>", "<script>alert(1)</script></head>"),
    replace("Alpha ", '<img src="https://example.invalid/a.png" />'),
    replace('href="#"', 'href="https://example.invalid/"'),
    replace('name="key_65"', 'name="req_1"'),
  ])
    rejects(() => inspectScript(html));
});
test("ordinary hyperlinks, key aliases and non-ASCII shortcuts reject", () => {
  for (const name of [
    "key_065",
    "key_0",
    "key_97",
    "key_1000",
    "title",
    "key_65 req_1",
  ])
    rejects(() => inspectScript(replace('name="key_65"', `name="${name}"`)));
  rejects(
    () =>
      inspectScript(replace('href="#"', 'href="&#x68;ttps://example.invalid"')),
    "EXTERNAL_MARKER",
  );
});
test("unknown CSS and global stylesheet changes reject", () => {
  for (const value of [
    "background-image:url(https://example.invalid);",
    "position:fixed;",
    "color:red;",
    "color:#ffffff!important;",
    "font-weight:650;",
    "color:#112233;color:#445566;",
  ])
    rejects(() => inspectScript(replace("color:#203040;", value)));
  rejects(
    () =>
      inspectScript(replace("white-space: pre-wrap", "white-space: normal")),
    "STYLESHEET",
  );
});
test("inherited body defaults cannot be silently discarded", () => {
  rejects(
    () => inspectScript(replace("font-weight:400;", "")),
    "BODY_DEFAULTS",
  );
  rejects(
    () => inspectScript(replace("font-family:'DejaVu Sans';", "")),
    "BODY_DEFAULTS",
  );
});
test("nonzero layout and unsupported body structures reject", () => {
  rejects(
    () => inspectScript(replace("margin-left:0px", "margin-left:10px")),
    "LAYOUT",
  );
  for (const tag of ["table", "ul", "div", "iframe", "svg"])
    rejects(() =>
      inspectScript(replace("<p style=", `<${tag}></${tag}><p style=`)),
    );
});
test("duplicate attributes and malformed or repaired nesting reject", () => {
  for (const html of [
    replace('href="#"', 'href="#" href="#"'),
    replace("</span>", ""),
    replace("<html>", ""),
    replace("</p>", ""),
  ])
    rejects(() => inspectScript(html), "HTML");
});
test("generic HTML, foreign declarations and invalid encoding reject", () => {
  rejects(
    () =>
      inspectScript(
        "<!doctype html><html><head></head><body><p>x</p></body></html>",
      ),
    "NATIVE_HTML",
  );
  rejects(
    () => inspectScript(replace("<html>", "<?resource x?><html>")),
    "DECLARATION",
  );
  rejects(() => inspectScript(new Uint8Array([255, 255])), "UTF8");
  for (const value of ["\0", "\ud800", "\ufffe"])
    rejects(() => inspectScript(replace("Alpha", value)), "CHARACTER");
});
test("orphan shortcut metadata and varied cue formatting reject", () => {
  rejects(
    () =>
      inspectScript(
        replace('<a href="#"><span', "<span")
          .replace("Cue one</span></a>", "Cue one</span>")
          .replace("text-decoration: underline overline;", ""),
      ),
    "MARKER",
  );
  rejects(
    () =>
      inspectScript(
        replace("Cue one", 'Cue <span style="font-weight:700;">one</span>'),
      ),
    "INLINE_CONTENT",
  );
});
test("comment-containing shortcut anchors cannot silently drop their key", () => {
  rejects(
    () =>
      inspectScript(
        replace('<a name="key_65"></a>', '<a name="key_65"><!--note--></a>'),
      ),
    "MARKER",
  );
});
test("empty or comment-only descendants cannot silently discard an anchor", () => {
  for (const body of ["<span></span>", "<span><!--note--></span>"])
    rejects(
      () =>
        inspectScript(
          replace('<a name="key_65"></a>', `<a name="key_65">${body}</a>`),
        ),
      "MARKER",
    );
  rejects(() => inspectScript(replace("Cue one", "")), "MARKER");
  rejects(
    () =>
      inspectScript(
        replace(
          '<a name="key_65"></a>',
          '<a name="key_65" style="font-weight:700;"></a>',
        ),
      ),
    "MARKER",
  );
});
test("noncanonical multi-character cue continuations reject", () => {
  rejects(
    () =>
      inspectScript(
        replace(
          "Cue one</span></a>",
          'Cu</span></a><span style=" text-decoration: underline overline; color:#203040;">e one</span>',
        ),
      ),
    "MARKER_FORMAT",
  );
});
test("nested semantic or span decorations fail closed instead of losing strike", () => {
  rejects(
    () => inspectScript(replace("Alpha ", "<s><u>Alpha </u></s>")),
    "INLINE_CONTENT",
  );
  rejects(
    () =>
      inspectScript(
        replace(
          "Alpha ",
          '<span style="text-decoration:line-through;"><span style="text-decoration:underline;">Alpha </span></span>',
        ),
      ),
    "INLINE_CONTENT",
  );
});
test("cue styles outside native underline and overline reject", () => {
  rejects(
    () =>
      inspectScript(
        replace(
          "text-decoration: underline overline;",
          "text-decoration: overline;",
        ),
      ),
    "MARKER_STYLE",
  );
});
test("ancestor colors or decorations outside flat native spans reject", () => {
  for (const extra of [
    "color:#123456;",
    "background-color:#123456;",
    "text-decoration:line-through;",
  ])
    rejects(
      () =>
        inspectScript(replace("font-size:24pt;", `font-size:24pt;${extra}`)),
      "STYLE",
    );
});
test("file, node, text, depth and file-count bounds fail closed", () => {
  rejects(
    () => inspectScript(new Uint8Array(LIMITS.fileBytes + 1)),
    "INPUT_LIMIT",
  );
  rejects(
    () => inspectScript(replace("Alpha", "X".repeat(LIMITS.text + 1))),
    "CONTENT_LIMIT",
  );
  rejects(
    () =>
      inspectScript(
        replace("Alpha", "<span>".repeat(60) + "x" + "</span>".repeat(60)),
      ),
    "NODE_LIMIT",
  );
  rejects(
    () => inspectScript(replace("Alpha", "<span>x</span>".repeat(11000))),
    "NODE_LIMIT",
  );
  rejects(() => analyzeScripts([input()[0]]), "FILE_COUNT");
  rejects(
    () => analyzeScripts(Array.from({ length: 13 }, () => input()[0])),
    "FILE_COUNT",
  );
  rejects(() => analyzeScripts([null, null]), "INPUT");
});
test("the batch API rejects oversized strings and bytes before HTML parsing", () => {
  for (const source of [
    { text: "x".repeat(LIMITS.fileBytes + 1) },
    { bytes: new Uint8Array(LIMITS.fileBytes + 1) },
    { text: "字".repeat(700000) },
  ])
    rejects(
      () => analyzeScripts([{ name: "large.html", ...source }, input()[1]]),
      "INPUT_LIMIT",
    );
});
