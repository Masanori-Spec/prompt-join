import { parse } from "parse5";

export const LIMITS = Object.freeze({
  fileBytes: 2 * 1024 * 1024,
  totalBytes: 12 * 1024 * 1024,
  outputBytes: 12 * 1024 * 1024,
  files: 12,
  nodes: 20000,
  depth: 48,
  text: 200000,
  cues: 2000,
});
export class JoinError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "JoinError";
  }
}
const fail = (code, message) => {
  throw new JoinError(code, message);
};
const enc = new TextEncoder();
const CSS =
  'p, li { white-space: pre-wrap; }\nhr { height: 1px; border-width: 0; }\nli.unchecked::marker { content: "\\2610"; }\nli.checked::marker { content: "\\2612"; }';
const space = (s) => s.replace(/\s+/g, "");
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const attrs = (node) =>
  Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value]));
const children = (node) => node.childNodes ?? [];
const elements = (node) => children(node).filter((n) => n.tagName);
const textOf = (node) =>
  children(node)
    .map((n) =>
      n.nodeName === "#text"
        ? n.value
        : fail("HEAD_CONTENT", "Nested head content is unsupported"),
    )
    .join("");
function onlyAttributes(node, allowed) {
  for (const a of node.attrs ?? [])
    if (!allowed.includes(a.name) || a.namespace || a.prefix)
      fail("ATTRIBUTE", `Unsupported ${node.tagName} attribute: ${a.name}`);
}
function validText(value) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
    fail("CHARACTER", "Control characters are unsupported");
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0xd800 && cp <= 0xdfff) || (cp & 0xffff) >= 0xfffe)
      fail("CHARACTER", "Invalid Unicode character");
  }
}
function color(value) {
  const v = value.toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v) || v === "transparent") return v;
  fail(
    "COLOR",
    "Only native six-digit colors and transparent highlights are supported",
  );
}
function style(node, parent, notes) {
  const a = attrs(node),
    result = { ...parent };
  if (a.style) {
    if (a.style.length > 2048 || /[\\{}<>]/u.test(a.style))
      fail("STYLE", "Unsupported style syntax");
    const seen = new Set();
    for (const declaration of a.style.split(";")) {
      if (!declaration.trim()) continue;
      const match = /^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i.exec(declaration);
      if (!match || !match[2] || seen.has(match[1].toLowerCase()))
        fail("STYLE", "Malformed or duplicate style declaration");
      const k = match[1].toLowerCase(),
        v = match[2];
      seen.add(k);
      if (k === "font-family") {
        const m =
          /^(?:'([^'";,<>]{1,120})'|"([^'";,<>]{1,120})"|([\p{L}\p{N} _-]{1,120}))$/u.exec(
            v,
          );
        if (!m) fail("FONT_FAMILY", "Unsupported font-family syntax");
        result.family = m[1] ?? m[2] ?? m[3];
      } else if (k === "font-weight") {
        if (!/^(?:[1-9]00|normal|bold)$/.test(v))
          fail("STYLE", "Unsupported font weight");
        result.weight = v === "normal" ? 400 : v === "bold" ? 700 : Number(v);
      } else if (k === "font-style") {
        if (!/^(normal|italic)$/.test(v))
          fail("STYLE", "Unsupported font style");
        result.italic = v === "italic";
      } else if (k === "color") {
        if (node.tagName !== "span")
          fail("STYLE", "Colors must be explicit native span styles");
        result.foreground = color(v);
        if (result.foreground === "transparent")
          fail("COLOR", "Transparent foreground is unsupported");
      } else if (k === "background-color") {
        if (node.tagName !== "span")
          fail("STYLE", "Highlights must be explicit native span styles");
        result.background = color(v);
      } else if (k === "text-decoration") {
        if (node.tagName !== "span")
          fail("STYLE", "Decorations must be explicit native span styles");
        const values = v.trim().split(/\s+/);
        if (
          !values.length ||
          new Set(values).size !== values.length ||
          values.some(
            (x) =>
              !["none", "underline", "overline", "line-through"].includes(x),
          ) ||
          (values.includes("none") && values.length > 1)
        )
          fail("STYLE", "Unsupported decoration");
        result.decoration = values.sort().join(" ");
      } else if (["font-size", "letter-spacing", "word-spacing"].includes(k)) {
        if (!/^-?\d+(?:\.\d+)?(?:px|pt|em|ex)$/.test(v))
          fail("STYLE", "Unsupported size or spacing declaration");
        notes.push({ property: k, value: v });
      } else if (
        [
          "margin-top",
          "margin-bottom",
          "margin-left",
          "margin-right",
          "text-indent",
        ].includes(k)
      ) {
        if (!/^(?:0|0px|0pt)$/.test(v) || node.tagName !== "p")
          fail("LAYOUT", "Nonzero margins or indentation are unsupported");
      } else if (k === "-qt-block-indent") {
        if (v !== "0" || node.tagName !== "p")
          fail("LAYOUT", "Indented blocks are unsupported");
      } else if (k === "-qt-paragraph-type") {
        if (v !== "empty" || node.tagName !== "p")
          fail("LAYOUT", "Unsupported empty-paragraph metadata");
        result.empty = true;
      } else if (k === "text-align") {
        if (
          !["body", "p"].includes(node.tagName) ||
          !/^(left|center|right|justify)$/.test(v)
        )
          fail("LAYOUT", "Unsupported alignment");
        result.align = v;
      } else if (k === "white-space") {
        if (v !== "pre-wrap")
          fail("LAYOUT", "Only native pre-wrap text is supported");
      } else fail("STYLE", `Unsupported style property: ${k}`);
    }
  }
  if (a.align) {
    if (!/^(left|center|right|justify)$/.test(a.align))
      fail("LAYOUT", "Unsupported alignment");
    result.align = a.align;
  }
  if (a.dir) {
    if (!/^(ltr|rtl)$/.test(a.dir)) fail("LAYOUT", "Unsupported direction");
    result.dir = a.dir;
  }
  return result;
}
function key(value) {
  if (!/^key_(?:[1-9]\d*)$/.test(value))
    fail(
      "MARKER",
      "Only canonical key_ metadata is supported; automation markers are excluded",
    );
  const k = Number(value.slice(4));
  if (!((k >= 48 && k <= 57) || (k >= 65 && k <= 90)))
    fail("KEY", "Supported shortcuts are ASCII digits and uppercase A–Z");
  return k;
}
function sameStyle(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function css(s) {
  return `font-family:'${s.family}';font-weight:${s.weight};font-style:${s.italic ? "italic" : "normal"};text-decoration:${s.decoration};${s.foreground ? `color:${s.foreground};` : ""}${s.background ? `background-color:${s.background};` : ""}`;
}

export function inspectScript(input, name = "script.html") {
  if (typeof name !== "string" || !name.trim() || name.length > 256)
    fail("NAME", "Use a short filename");
  validText(name);
  let source, bytes;
  if (input instanceof Uint8Array) {
    bytes = input.byteLength;
    if (bytes > LIMITS.fileBytes) fail("INPUT_LIMIT", "File exceeds 2 MiB");
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(input);
    } catch {
      fail("UTF8", "Input must be valid UTF-8");
    }
  } else if (typeof input === "string") {
    source = input;
    if (source.length > LIMITS.fileBytes)
      fail("INPUT_LIMIT", "File exceeds 2 MiB");
    bytes = enc.encode(source).length;
  } else fail("INPUT", "Expected HTML text or UTF-8 bytes");
  if (bytes > LIMITS.fileBytes) fail("INPUT_LIMIT", "File exceeds 2 MiB");
  validText(source);
  if ((source.match(/</g) ?? []).length > LIMITS.nodes * 2)
    fail("NODE_LIMIT", "Too many HTML tokens");
  if (/<!\s*(?:ENTITY|\[CDATA)|<\?/i.test(source))
    fail(
      "DECLARATION",
      "Entity declarations, processing instructions and CDATA are unsupported",
    );
  const errors = [];
  const doc = parse(source, {
    sourceCodeLocationInfo: true,
    scriptingEnabled: false,
    onParseError: (e) => {
      if (e.code !== "non-conforming-doctype") errors.push(e.code);
    },
  });
  if (errors.length) fail("HTML", `Malformed HTML: ${errors[0]}`);
  let count = 0;
  const stack = [[doc, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop();
    if (++count > LIMITS.nodes || depth > LIMITS.depth)
      fail("NODE_LIMIT", "HTML node/depth limit exceeded");
    if (
      node.tagName &&
      (node.namespaceURI !== "http://www.w3.org/1999/xhtml" ||
        !node.sourceCodeLocation ||
        (!node.sourceCodeLocation.endTag &&
          !["meta", "br"].includes(node.tagName)))
    )
      fail("HTML", "Implicit, foreign or unclosed elements are unsupported");
    for (const c of children(node)) stack.push([c, depth + 1]);
  }
  const dt = children(doc).filter((n) => n.nodeName === "#documentType");
  if (
    dt.length !== 1 ||
    dt[0].name !== "html" ||
    dt[0].publicId !== "-//W3C//DTD HTML 4.0//EN" ||
    dt[0].systemId !== "http://www.w3.org/TR/REC-html40/strict.dtd"
  )
    fail("NATIVE_HTML", "Expected the native Qt rich-text document doctype");
  const html = elements(doc)[0];
  if (elements(doc).length !== 1 || html?.tagName !== "html")
    fail("NATIVE_HTML", "Expected one HTML document");
  onlyAttributes(html, []);
  const roots = elements(html);
  if (
    roots.length !== 2 ||
    roots[0].tagName !== "head" ||
    roots[1].tagName !== "body"
  )
    fail("NATIVE_HTML", "Expected one head and one body");
  const [head, body] = roots;
  onlyAttributes(head, []);
  onlyAttributes(body, ["style", "align", "dir"]);
  let rich = 0,
    stylesheet = 0,
    title = "";
  for (const node of children(head)) {
    if (
      node.nodeName === "#comment" ||
      (node.nodeName === "#text" && !node.value.trim())
    )
      continue;
    if (node.tagName === "meta") {
      onlyAttributes(node, ["name", "content", "charset", "http-equiv"]);
      const a = attrs(node);
      if (
        a.name === "qrichtext" &&
        a.content === "1" &&
        Object.keys(a).length === 2
      )
        rich++;
      else if (
        a.charset?.toLowerCase() === "utf-8" &&
        Object.keys(a).length === 1
      ) {
      } else if (
        a["http-equiv"]?.toLowerCase() === "content-type" &&
        /^text\/html;\s*charset=utf-8$/i.test(a.content ?? "") &&
        Object.keys(a).length === 2
      ) {
      } else fail("META", "Unsupported document metadata");
    } else if (node.tagName === "style") {
      onlyAttributes(node, ["type"]);
      if (attrs(node).type !== "text/css" || space(textOf(node)) !== space(CSS))
        fail("STYLESHEET", "Only the native Qt text stylesheet is supported");
      stylesheet++;
    } else if (node.tagName === "title") {
      onlyAttributes(node, []);
      if (title) fail("HEAD_CONTENT", "Duplicate document title");
      title = textOf(node);
      if (title.length > 512) fail("HEAD_CONTENT", "Title too long");
    } else fail("HEAD_CONTENT", "Unsupported head content");
  }
  if (rich !== 1 || stylesheet !== 1)
    fail(
      "NATIVE_HTML",
      "Native qrichtext metadata and stylesheet are required",
    );
  const normalized = [];
  const base = style(
    body,
    {
      family: null,
      weight: 400,
      italic: false,
      decoration: "none",
      foreground: null,
      background: null,
      align: "left",
      dir: "ltr",
    },
    normalized,
  );
  if (
    !base.family ||
    !attrs(body).style?.includes("font-weight") ||
    !attrs(body).style?.includes("font-style")
  )
    fail("BODY_DEFAULTS", "Native body font defaults are required");
  const blocks = [];
  let cueCounter = 0;
  for (const paragraph of children(body)) {
    if (
      paragraph.nodeName === "#comment" ||
      (paragraph.nodeName === "#text" && !paragraph.value.trim())
    )
      continue;
    if (paragraph.tagName !== "p")
      fail(
        "BODY_CONTENT",
        "Only plain text paragraphs are supported; images, lists and tables are excluded",
      );
    onlyAttributes(paragraph, ["style", "align", "dir"]);
    const ps = style(paragraph, base, normalized),
      runs = [];
    let pending = null;
    const add = (text, s, marker) => {
      if (!text) return;
      validText(text);
      if (pending) {
        if (marker || !s.decoration.includes("underline"))
          fail(
            "MARKER",
            "Key anchor is not followed by an unambiguous underlined local cue",
          );
        marker = { id: cueCounter++, key: pending, href: "" };
        pending = null;
      }
      if (
        runs.length &&
        runs.at(-1).marker === marker &&
        sameStyle(runs.at(-1).style, s)
      )
        runs.at(-1).text += text;
      else runs.push({ text, style: { ...s }, marker });
    };
    const walk = (node, s, marker = null) => {
      if (node.nodeName === "#comment") {
        if (marker)
          fail("MARKER", "Comments inside marker anchors are unsupported");
        return;
      }
      if (node.nodeName === "#text") return add(node.value, s, marker);
      if (node.tagName === "br") {
        onlyAttributes(node, []);
        return add("\n", s, marker);
      }
      if (!["span", "a"].includes(node.tagName))
        fail("INLINE_CONTENT", "Unsupported inline content");
      if (node.parentNode?.tagName === "span")
        fail(
          "INLINE_CONTENT",
          "Nested inline styling is outside the native span subset",
        );
      onlyAttributes(
        node,
        node.tagName === "a" ? ["name", "href", "style"] : ["style"],
      );
      const ns = style(node, s, normalized),
        a = attrs(node);
      const previousRunCount = runs.length;
      if (node.tagName === "a") {
        if (children(node).some((c) => c.nodeName === "#comment"))
          fail("MARKER", "Comments inside marker anchors are unsupported");
        if (marker) fail("MARKER", "Nested markers are unsupported");
        if (a.href !== undefined && a.href !== "#")
          fail(
            "EXTERNAL_MARKER",
            "Only local navigation markers are supported",
          );
        const k = a.name === undefined ? null : key(a.name);
        if (k && !children(node).length && a.href === undefined) {
          if (Object.keys(a).length !== 1)
            fail(
              "MARKER",
              "Empty key-metadata anchors may contain only the name attribute",
            );
          if (pending)
            fail("MARKER", "Consecutive key metadata anchors are ambiguous");
          pending = k;
          return;
        }
        if (a.href === undefined && k === null)
          fail("MARKER", "An anchor must be a local cue or key marker");
        if (pending && k !== null)
          fail("MARKER", "Multiple shortcut names on a cue are unsupported");
        marker = {
          id: cueCounter++,
          key: k ?? pending ?? 0,
          href: a.href ?? "",
        };
        pending = null;
      }
      for (const child of children(node)) walk(child, ns, marker);
      if (node.tagName === "a" && runs.length === previousRunCount)
        fail(
          "MARKER",
          "Only an exact empty key-metadata anchor may have no cue text",
        );
    };
    for (const child of children(paragraph)) walk(child, ps);
    if (pending) fail("MARKER", "Key metadata without cue text");
    if (ps.empty) {
      if (runs.map((r) => r.text).join("") !== "\n")
        fail("EMPTY_PARAGRAPH", "Unsupported native empty paragraph form");
      runs.length = 0;
    }
    for (let i = 0; i + 1 < runs.length; i++) {
      const current = runs[i],
        next = runs[i + 1];
      if (
        current.marker &&
        !next.marker &&
        next.style.decoration.includes("underline")
      ) {
        if (current.text.length !== 1 || !sameStyle(current.style, next.style))
          fail(
            "MARKER_FORMAT",
            "Only the native first-character cue continuation form is supported",
          );
        next.marker = current.marker;
      }
    }
    blocks.push({ runs, align: ps.align, dir: ps.dir });
  }
  if (!blocks.length) fail("EMPTY", "At least one paragraph is required");
  let position = 0;
  const cues = [],
    cueMap = new Map();
  for (const [bi, block] of blocks.entries()) {
    if (bi) position++;
    for (const run of block.runs) {
      if (run.marker) {
        if (
          !run.style.decoration.includes("underline") ||
          !run.style.decoration.includes("overline")
        )
          fail(
            "MARKER_STYLE",
            "Local cues must retain native underline and overline styling",
          );
        let cue = cueMap.get(run.marker.id);
        if (
          cue &&
          (!sameStyle(cue.style, run.style) ||
            cue.position + cue.text.length !== position)
        )
          fail(
            "MARKER_FORMAT",
            "Only contiguous uniformly formatted marker labels are supported",
          );
        if (!cue) {
          cue = { ...run.marker, position, text: "", style: run.style };
          cueMap.set(cue.id, cue);
          cues.push(cue);
        }
        cue.text += run.text;
      }
      position += run.text.length;
    }
  }
  const text = blocks.map((b) => b.runs.map((r) => r.text).join("")).join("\n");
  if (position > LIMITS.text || cues.length > LIMITS.cues)
    fail("CONTENT_LIMIT", "Text or cue count exceeds supported limits");
  return {
    name,
    bytes,
    title,
    text,
    blocks,
    cues,
    normalizedSizeDeclarations: normalized,
  };
}

export function analyzeScripts(inputs) {
  if (
    !Array.isArray(inputs) ||
    inputs.length < 2 ||
    inputs.length > LIMITS.files
  )
    fail("FILE_COUNT", "Choose 2–12 scripts");
  let totalBytes = 0;
  for (const s of inputs) {
    if (!s || typeof s !== "object")
      fail("INPUT", "Each script requires HTML text or UTF-8 bytes");
    const raw = s.bytes ?? s.text;
    let bytes;
    if (raw instanceof Uint8Array) bytes = raw.byteLength;
    else if (typeof raw === "string") {
      if (raw.length > LIMITS.fileBytes)
        fail("INPUT_LIMIT", "File exceeds 2 MiB");
      bytes = enc.encode(raw).length;
    } else fail("INPUT", "Each script requires HTML text or UTF-8 bytes");
    if (bytes > LIMITS.fileBytes) fail("INPUT_LIMIT", "File exceeds 2 MiB");
    totalBytes += bytes;
    if (totalBytes > LIMITS.totalBytes)
      fail("TOTAL_LIMIT", "Combined input exceeds 12 MiB");
  }
  const scripts = inputs.map((s) => inspectScript(s.bytes ?? s.text, s.name));
  if (
    scripts.reduce((n, s) => n + s.bytes, 0) > LIMITS.totalBytes ||
    scripts.reduce((n, s) => n + s.text.length, 0) > LIMITS.text ||
    scripts.reduce((n, s) => n + s.cues.length, 0) > LIMITS.cues
  )
    fail("TOTAL_LIMIT", "Combined input exceeds supported limits");
  const groups = new Map();
  scripts.forEach((s, si) =>
    s.cues.forEach((c) => {
      if (c.key) {
        const a = groups.get(c.key) ?? [];
        a.push(`${si}:${c.id}`);
        groups.set(c.key, a);
      }
    }),
  );
  return {
    scripts,
    conflicts: [...groups]
      .filter(([, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ key, ids })),
  };
}

export function joinScripts(inputs, { order, decisions = {} } = {}) {
  const analysis = analyzeScripts(inputs),
    scripts = analysis.scripts;
  if (
    !Array.isArray(order) ||
    order.length !== scripts.length ||
    new Set(order).size !== scripts.length ||
    order.some((i) => !Number.isInteger(i) || i < 0 || i >= scripts.length)
  )
    fail(
      "ORDER",
      "Explicitly include every selected script once in the chosen order",
    );
  if (!decisions || Object.getPrototypeOf(decisions) !== Object.prototype)
    fail("DECISION", "Expected explicit cue decisions");
  const all = new Map(),
    required = new Set(analysis.conflicts.flatMap((g) => g.ids));
  scripts.forEach((s, si) =>
    s.cues.forEach((c) => {
      if (c.key) all.set(`${si}:${c.id}`, c);
    }),
  );
  for (const id of Object.keys(decisions))
    if (!all.has(id)) fail("DECISION", "Decision targets an unknown keyed cue");
  for (const id of required)
    if (!Object.hasOwn(decisions, id))
      fail(
        "KEY_CONFLICT",
        "Review every cue sharing a shortcut: remap, clear or retain",
      );
  const edits = [],
    resolved = new Map();
  for (const [id, cue] of all) {
    const d = decisions[id] ?? { action: "retain" };
    if (
      !d ||
      Object.getPrototypeOf(d) !== Object.prototype ||
      Object.keys(d).some((k) => !["action", "key"].includes(k)) ||
      !["retain", "clear", "remap"].includes(d.action)
    )
      fail("DECISION", "Unsupported shortcut decision");
    if (d.action !== "remap" && d.key !== undefined)
      fail("DECISION", "Only remap accepts a new key");
    const newKey =
      d.action === "clear"
        ? 0
        : d.action === "remap"
          ? key(`key_${d.key}`)
          : cue.key;
    if (d.action === "remap" && !Number.isInteger(d.key))
      fail("DECISION", "Key code must be an integer");
    resolved.set(id, newKey);
    edits.push({
      cue: id,
      label: cue.text,
      before: cue.key,
      after: newKey,
      action: d.action,
      explicit: Object.hasOwn(decisions, id),
    });
  }
  const finalGroups = new Map();
  for (const [id, k] of resolved)
    if (k) {
      const a = finalGroups.get(k) ?? [];
      a.push(id);
      finalGroups.set(k, a);
    }
  const retainedConflicts = [...finalGroups]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids }));
  for (const group of retainedConflicts)
    if (group.ids.some((id) => decisions[id]?.action !== "retain"))
      fail(
        "NEW_CONFLICT",
        "A remap must not introduce or retain a collision; use explicit retain for every remaining duplicate",
      );
  const out = [],
    sources = [],
    mappedCues = [];
  let offset = 0;
  for (const [oi, si] of order.entries()) {
    const s = scripts[si];
    if (oi) offset++;
    sources.push({
      inputIndex: si,
      name: s.name,
      bytes: s.bytes,
      startUTF16: offset,
      lengthUTF16: s.text.length,
      normalizedSizeDeclarations: s.normalizedSizeDeclarations,
    });
    for (const c of s.cues)
      mappedCues.push({
        inputIndex: si,
        cue: `${si}:${c.id}`,
        text: c.text,
        sourcePositionUTF16: c.position,
        positionUTF16: offset + c.position,
        beforeKey: c.key,
        key: c.key ? resolved.get(`${si}:${c.id}`) : 0,
      });
    for (const b of s.blocks) {
      let content = "";
      for (let i = 0; i < b.runs.length; i++) {
        const r = b.runs[i];
        let text = r.text;
        if (r.marker)
          while (
            i + 1 < b.runs.length &&
            b.runs[i + 1].marker?.id === r.marker.id
          )
            text += b.runs[++i].text;
        const span = `<span style="${esc(css(r.style))}">${esc(text).replaceAll("\n", "<br />")}</span>`;
        if (!r.marker) content += span;
        else {
          const k = r.marker.key ? resolved.get(`${si}:${r.marker.id}`) : 0;
          if (k) content += `<a name="key_${k}"></a>`;
          const href = r.marker.href || (k === 0 ? "#" : "");
          content += href ? `<a href="#">${span}</a>` : span;
        }
      }
      out.push(
        `<p align="${b.align}" dir="${b.dir}"${content ? "" : ' style="-qt-paragraph-type:empty;"'}>${content || "<br />"}</p>`,
      );
    }
    offset += s.text.length;
  }
  const html = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">\n<html><head><meta name="qrichtext" content="1" /><meta charset="utf-8" /><style type="text/css">\n${CSS}\n</style></head><body style="font-family:'Sans Serif';font-weight:400;font-style:normal;">\n${out.join("\n")}\n</body></html>\n`;
  const outputBytes = enc.encode(html).length;
  if (outputBytes > LIMITS.outputBytes)
    fail("OUTPUT_LIMIT", "Joined output exceeds 12 MiB");
  const expectedText = order.map((i) => scripts[i].text).join("\n");
  const check = inspectScript(html, "joined.html");
  if (
    check.text !== expectedText ||
    JSON.stringify(check.cues.map((c) => [c.text, c.position, c.key])) !==
      JSON.stringify(mappedCues.map((c) => [c.text, c.positionUTF16, c.key]))
  )
    fail(
      "OUTPUT_VERIFY",
      "Output text or cue mapping did not round-trip through the supported parser",
    );
  return {
    html,
    text: expectedText,
    receipt: {
      format: "PromptJoin receipt v1",
      positionUnit: "UTF-16 code units",
      sources,
      order,
      cues: mappedCues,
      shortcutDecisions: edits,
      retainedConflicts,
      outputBytes,
      inputFilesUnchanged: true,
      scope:
        "Supported native text/color/emphasis/local-marker subset; no exact font-size or arbitrary HTML compatibility claim",
    },
  };
}
