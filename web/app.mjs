import {
  analyzeScripts,
  inspectScript,
  joinScripts,
  LIMITS,
} from "../src/core.mjs";
import { sampleScripts } from "../src/sample.mjs";

const initialHTML = "<!doctype html>\n" + document.documentElement.outerHTML;
const $ = (id) => document.getElementById(id),
  encoder = new TextEncoder();
const copy = {
  ja: {
    skip: "作業エリアへ",
    headline: "原稿をつなぐ。\n合図は、迷わせない。",
    intro:
      "QPrompt で保存した HTML を、読む順に。色や強調を確認し、重複するショートカットを整理して、ひとつのコピーにまとめます。",
    offlineTag: "OFFLINE · 端末内で処理",
    boundary:
      "対応するテキストと書式だけを扱います。画像・表・Office 文書・自動実行マーカーは対象外です。",
    nativeTag: "QPrompt 2.0.2 公式コンポーネントで検証",
    workspace: "READING DESK",
    sample: "サンプルを試す",
    clear: "クリア",
    chooseTitle: "原稿と順序を選ぶ",
    chooseFiles: "HTML 原稿を選ぶ",
    chooseHint: "2〜12 ファイル · .html / .htm",
    replaceHint:
      "必要な原稿をまとめて選択します。再選択すると、現在の一覧を置き換えます。",
    noFiles: "まだ選択されていません",
    confirmOrder: "この読む順序を確認した",
    formats: "対応形式と上限",
    formatDetails:
      "QPrompt のネイティブ HTML：段落、平坦な span 書式、A–Z / 0–9 のキー、通常のローカル合図。1 ファイル 2 MiB、合計 12 MiB、テキスト 200,000 UTF-16 単位まで。この画面では合図 100 個まで扱います。",
    sizeDetails:
      "文字サイズや間隔は QPrompt の読み込みで正規化されます。任意の HTML や完全なレイアウト保持には対応しません。",
    cueTitle: "ショートカットを確認する",
    detail: "互換性の詳細",
    cueHint:
      "同じキーが重複すると、QPrompt は先頭の合図だけに移動します。変更・解除・そのまま保持を、合図ごとに選んでください。",
    emptyCues: "原稿の合図がここに並びます",
    localOnly: "外部リンクや自動実行マーカーは読み込みません",
    reviewTitle: "つなぐ内容を確認する",
    copyOnly: "元ファイルは変更しません",
    scriptsMetric: "原稿",
    cuesMetric: "合図",
    unitsMetric: "UTF-16 単位",
    positionsHint:
      "位置は QPrompt と同じ UTF-16 単位です。原稿の境界には段落区切りを 1 つ入れます。",
    tableCaption: "出力される合図と位置",
    fileCol: "原稿",
    cueCol: "合図",
    keyCol: "キー",
    sourceCol: "元の位置",
    joinedCol: "結合後の位置",
    exportTitle: "QPrompt で開けるコピー",
    exportHint: "確認した順序・書式・合図を、新しい HTML として保存します。",
    receiptHint:
      "検証記録には、入力と出力のハッシュ・キーの判断・位置・正規化したサイズ指定を残します。",
    export: "結合 HTML を保存",
    receipt: "検証記録 · JSON",
    print: "確認内容を印刷",
    previewEyebrow: "TEXT REVIEW",
    previewTitle: "テキストのプレビュー",
    previewSource: "プレビューする原稿",
    darkCanvas: "背景を暗くする",
    lightCanvas: "背景を明るくする",
    scopeTitle: "原稿をまとめる、小さな道具。",
    scopeText:
      "一般的な HTML 変換や Office 取り込みは行いません。未対応の要素は黙って削除せず、書き出しを止めます。",
    nativeTitle: "合図の動作まで、確かめる。",
    nativeText:
      "公式の読み込み・マーカー処理で、元の合図と変更後のキーを検証しています。QPrompt の保存では HTML の構造が正規化されることがあります。",
    tagline: "PromptJoin · Keep the reading order. Keep the cues.",
    saveTool: "この道具をオフライン保存",
    start: "2 つ以上の原稿を選び、読む順序を確認してください。",
    reading: "原稿を読み込んでいます…",
    chooseAnother:
      "原稿が 1 つです。つなぐ原稿を 2 つ以上まとめて選んでください。",
    confirmFirst: "一覧の順序を確認し、確認欄にチェックしてください。",
    unresolved: (n) => `重複するキーの判断が、あと ${n} 件あります。`,
    ready: "順序と合図を確認できました。コピーを書き出せます。",
    retainedReady:
      "重複するキーを保持します。下の注意と検証記録を確認してください。",
    hashing: "入力と出力のハッシュを計算しています…",
    loadError: "この原稿は読み込めません。対応形式と上限を確認してください。",
    editError: "ショートカットの組み合わせを確認してください。",
    tooManyCues:
      "この画面で扱える合図は合計 100 個までです。原稿を分けてください。",
    fileType: "QPrompt から保存した .html / .htm を選んでください。",
    genericError: "処理できませんでした。入力を確認してください。",
    selected: (n, b) => `${n} 原稿 · ${b} bytes`,
    fileMeta: (p, c) => `${p} 段落 · ${c} 合図`,
    up: "上へ",
    down: "下へ",
    remove: "削除",
    moveUp: (n) => `${n} を上へ`,
    moveDown: (n) => `${n} を下へ`,
    removeFile: (n) => `${n} を削除`,
    chooseDecision: "判断を選択…",
    keep: (k) => `${k} を保持`,
    clearKey: "キーを解除",
    useKey: (k) => `${k} に変更`,
    localCue: "ローカル合図",
    repeats: "重複あり",
    cueOrigin: (n, p) => `${n} · 元の位置 ${p}`,
    shortcutLabel: (n, t) => `${n} · ${t} のショートカット`,
    joinedPreview: "結合後",
    sourcePreview: "元の原稿",
    previewHint:
      "ブラウザー上のテキスト確認です。QPrompt の文字サイズやレイアウトとは異なる場合があります。",
    clippedPreview:
      "プレビューは最初の 12,000 UTF-16 単位・200 段落までです。出力には対応する全テキストを含みます。",
    retainedWarning: (keys) =>
      `重複を保持するキー：${keys}。QPrompt のキー移動では、読む順序で先頭の合図だけが選ばれます。`,
    saved: (n, h) => `コピーを保存しました · ${n} bytes · SHA-256 ${h}`,
    savedTool: "初期状態のオフライン用ツールを保存しました。",
    none: "なし",
    orderLabel: "読む順序",
    cuesLabel: "合図の位置",
    keyArrow: (a, b) => `${a} → ${b}`,
  },
  en: {
    skip: "Skip to workspace",
    headline: "One continuous script.\nCues you can still trust.",
    intro:
      "Put QPrompt HTML scripts in reading order. Review the colors and emphasis, resolve repeated shortcuts, and save one joined copy.",
    offlineTag: "OFFLINE · LOCAL PROCESSING",
    boundary:
      "For supported text and formatting. Images, tables, Office documents and automation markers are outside this tool’s scope.",
    nativeTag: "Verified with official QPrompt 2.0.2 components",
    workspace: "READING DESK",
    sample: "Try the sample",
    clear: "Clear",
    chooseTitle: "Choose scripts and order",
    chooseFiles: "Choose HTML scripts",
    chooseHint: "2–12 files · .html / .htm",
    replaceHint:
      "Choose all the scripts together. A new selection replaces the current list.",
    noFiles: "No scripts selected",
    confirmOrder: "I have checked this reading order",
    formats: "Supported formats and limits",
    formatDetails:
      "Native QPrompt HTML: paragraphs, flat span formatting, A–Z / 0–9 shortcuts and ordinary local cues. Up to 2 MiB per file, 12 MiB combined and 200,000 UTF-16 text units. This interface supports up to 100 cues.",
    sizeDetails:
      "QPrompt normalizes font size and spacing on import. Arbitrary HTML and exact page layout preservation are outside scope.",
    cueTitle: "Review the shortcuts",
    detail: "Compatibility details",
    cueHint:
      "When a key repeats, QPrompt jumps only to its first cue. Choose remap, clear or retain for each affected cue.",
    emptyCues: "Your script cues will appear here",
    localOnly: "External links and automation markers are blocked",
    reviewTitle: "Review the joined copy",
    copyOnly: "ORIGINAL FILES UNCHANGED",
    scriptsMetric: "scripts",
    cuesMetric: "cues",
    unitsMetric: "UTF-16 units",
    positionsHint:
      "Positions use QPrompt’s UTF-16 units. One paragraph boundary joins each pair of scripts.",
    tableCaption: "Output cues and native text positions",
    fileCol: "Script",
    cueCol: "Cue",
    keyCol: "Shortcut",
    sourceCol: "Source position",
    joinedCol: "Joined position",
    exportTitle: "A copy to open in QPrompt",
    exportHint:
      "Save the reviewed order, supported formatting and cues as a new HTML file.",
    receiptHint:
      "The receipt records input/output hashes, shortcut decisions, positions and normalized size declarations.",
    export: "Save joined HTML",
    receipt: "Verification receipt · JSON",
    print: "Print this review",
    previewEyebrow: "TEXT REVIEW",
    previewTitle: "Preview the text",
    previewSource: "Preview source",
    darkCanvas: "Dark background",
    lightCanvas: "Light background",
    scopeTitle: "A small tool for a longer read.",
    scopeText:
      "This is not a general HTML or Office converter. Unsupported elements block export instead of disappearing silently.",
    nativeTitle: "Check the cue behavior, too.",
    nativeText:
      "Original cues and changed shortcuts are checked through the official loader and marker code. A later native QPrompt save can normalize the HTML structure.",
    tagline: "PromptJoin · Keep the reading order. Keep the cues.",
    saveTool: "Save this tool offline",
    start: "Choose at least two scripts, then confirm their reading order.",
    reading: "Reading scripts…",
    chooseAnother:
      "One script is loaded. Choose at least two scripts together to join them.",
    confirmFirst: "Check the list order and tick its confirmation box.",
    unresolved: (n) => `${n} repeated shortcut decisions still need review.`,
    ready: "Order and cues are ready. You can save the joined copy.",
    retainedReady:
      "Repeated shortcuts will remain. Review the warning and keep the receipt.",
    hashing: "Calculating input and output hashes…",
    loadError:
      "This script cannot be loaded. Check the supported format and limits.",
    editError: "Check the shortcut choices before exporting.",
    tooManyCues:
      "This interface supports up to 100 cues. Split the input into smaller sets.",
    fileType: "Choose .html / .htm files saved by QPrompt.",
    genericError: "The operation could not finish. Check the input.",
    selected: (n, b) => `${n} scripts · ${b} bytes`,
    fileMeta: (p, c) => `${p} paragraphs · ${c} cues`,
    up: "Up",
    down: "Down",
    remove: "Remove",
    moveUp: (n) => `Move ${n} up`,
    moveDown: (n) => `Move ${n} down`,
    removeFile: (n) => `Remove ${n}`,
    chooseDecision: "Choose a decision…",
    keep: (k) => `Keep ${k}`,
    clearKey: "Clear shortcut",
    useKey: (k) => `Use ${k}`,
    localCue: "Local cue",
    repeats: "Repeated",
    cueOrigin: (n, p) => `${n} · source position ${p}`,
    shortcutLabel: (n, t) => `${n} · ${t} shortcut`,
    joinedPreview: "Joined copy",
    sourcePreview: "Source script",
    previewHint:
      "This is a browser text review. QPrompt’s font size and layout may differ.",
    clippedPreview:
      "Preview is limited to the first 12,000 UTF-16 units and 200 paragraphs. Export includes all supported text.",
    retainedWarning: (keys) =>
      `Retained repeated keys: ${keys}. QPrompt’s key navigation selects only the first cue in reading order.`,
    saved: (n, h) => `Copy saved · ${n} bytes · SHA-256 ${h}`,
    savedTool: "Saved a clean offline copy of this tool.",
    none: "None",
    orderLabel: "Reading order",
    cuesLabel: "Cue positions",
    keyArrow: (a, b) => `${a} → ${b}`,
  },
};
const state = {
  language: "ja",
  revision: 0,
  files: [],
  analysis: null,
  order: [],
  decisions: {},
  confirmed: false,
  result: null,
  resultModel: null,
  receipt: null,
  fileError: null,
  computeError: null,
  busy: false,
  activeExport: null,
  preview: "joined",
  dark: false,
  toolSaved: false,
};
const t = (key, ...args) =>
  typeof copy[state.language][key] === "function"
    ? copy[state.language][key](...args)
    : copy[state.language][key];
const element = (tag, text, className) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
};
const keyLabel = (k) => (k ? String.fromCharCode(k) : t("none"));
const brief = (s) => {
  const units = Array.from(s);
  return units.length > 120 ? units.slice(0, 120).join("") + "…" : s;
};
function setTranslation(e, value) {
  const parts = value.split("\n");
  e.replaceChildren();
  parts.forEach((part, i) => {
    if (i) e.append(document.createElement("br"));
    e.append(document.createTextNode(part));
  });
}
function translate() {
  document.documentElement.lang = state.language;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((e) => setTranslation(e, t(e.dataset.i18n)));
  $("lang-ja").setAttribute("aria-pressed", String(state.language === "ja"));
  $("lang-en").setAttribute("aria-pressed", String(state.language === "en"));
  $("files").setAttribute("aria-label", t("chooseFiles"));
  $("order-list").setAttribute("aria-label", t("orderLabel"));
  document
    .querySelector(".table-wrap")
    .setAttribute("aria-label", t("cuesLabel"));
}
function invalidate({ resetChoices = false, resetOrder = false } = {}) {
  state.revision++;
  state.activeExport = null;
  state.receipt = null;
  state.result = null;
  state.resultModel = null;
  state.computeError = null;
  state.toolSaved = false;
  if (resetChoices) state.decisions = {};
  if (resetOrder) state.confirmed = false;
}
function clear() {
  invalidate({ resetChoices: true, resetOrder: true });
  Object.assign(state, {
    files: [],
    analysis: null,
    order: [],
    fileError: null,
    busy: false,
    preview: "joined",
  });
  $("files").value = "";
  renderAll();
}
function loadReady(files, token) {
  if (token !== state.revision) return;
  let analysis;
  try {
    analysis =
      files.length === 1
        ? {
            scripts: [inspectScript(files[0].bytes, files[0].name)],
            conflicts: [],
          }
        : analyzeScripts(files);
  } catch (error) {
    for (const file of files) {
      try {
        inspectScript(file.bytes, file.name);
      } catch (individual) {
        individual.fileName = file.name;
        throw individual;
      }
    }
    throw error;
  }
  if (analysis.scripts.reduce((n, s) => n + s.cues.length, 0) > 100)
    throw Object.assign(new Error(t("tooManyCues")), { code: "UI_CUE_LIMIT" });
  Object.assign(state, {
    files,
    analysis,
    order: files.map((_, i) => i),
    busy: false,
    fileError: null,
    preview: "joined",
  });
  renderAll();
}
async function loadFiles(selected) {
  if (!selected.length) return;
  invalidate({ resetChoices: true, resetOrder: true });
  Object.assign(state, {
    files: [],
    analysis: null,
    order: [],
    fileError: null,
    busy: true,
    preview: "joined",
  });
  const token = state.revision;
  renderAll();
  try {
    if (selected.length > LIMITS.files)
      throw Object.assign(new Error("Choose up to 12 files"), {
        code: "FILE_COUNT",
      });
    if (selected.some((f) => !/\.html?$/i.test(f.name)))
      throw Object.assign(new Error(t("fileType")), { code: "FILE_TYPE" });
    if (
      selected.some((f) => f.size > LIMITS.fileBytes) ||
      selected.reduce((n, f) => n + f.size, 0) > LIMITS.totalBytes
    )
      throw Object.assign(new Error("Input file size limit exceeded"), {
        code: "INPUT_LIMIT",
      });
    const files = await Promise.all(
      selected.map(async (f) => ({
        name: f.name,
        bytes: new Uint8Array(await f.arrayBuffer()),
      })),
    );
    loadReady(files, token);
  } catch (error) {
    if (token !== state.revision) return;
    state.busy = false;
    state.fileError = {
      code: error.code ?? "READ_ERROR",
      message: error.message,
      fileName: error.fileName,
    };
    renderAll();
  } finally {
    if (token === state.revision) $("files").value = "";
  }
}
function loadSample() {
  invalidate({ resetChoices: true, resetOrder: true });
  Object.assign(state, {
    files: [],
    analysis: null,
    order: [],
    fileError: null,
    busy: false,
  });
  loadReady(
    sampleScripts.map((s) => ({ name: s.name, bytes: encoder.encode(s.text) })),
    state.revision,
  );
}
function move(si, direction) {
  const position = state.order.indexOf(si),
    target = position + direction;
  if (target < 0 || target >= state.order.length) return;
  invalidate({ resetChoices: true, resetOrder: true });
  [state.order[position], state.order[target]] = [
    state.order[target],
    state.order[position],
  ];
  renderAll();
  document.querySelector(`[data-file-id="${si}"]`)?.focus();
}
function remove(si) {
  invalidate({ resetChoices: true, resetOrder: true });
  state.files.splice(si, 1);
  state.order = state.order
    .filter((i) => i !== si)
    .map((i) => (i > si ? i - 1 : i));
  state.analysis =
    state.files.length > 1
      ? analyzeScripts(state.files)
      : state.files.length
        ? {
            scripts: [inspectScript(state.files[0].bytes, state.files[0].name)],
            conflicts: [],
          }
        : null;
  state.preview = "joined";
  renderAll();
  $("files").focus();
}
function renderOrder() {
  $("file-summary").textContent = state.files.length
    ? t(
        "selected",
        state.files.length,
        state.files
          .reduce((n, f) => n + f.bytes.byteLength, 0)
          .toLocaleString(state.language),
      )
    : t("noFiles");
  $("order-list").replaceChildren();
  state.order.forEach((si, position) => {
    const file = state.files[si],
      model = state.analysis.scripts[si],
      li = element("li"),
      main = element("div");
    li.dataset.fileId = si;
    li.tabIndex = -1;
    main.append(
      element("span", file.name, "file-name"),
      element(
        "span",
        t("fileMeta", model.blocks.length, model.cues.length),
        "file-meta",
      ),
    );
    const actions = element("div", undefined, "file-actions");
    for (const [action, label, fn, disabled] of [
      ["up", t("up"), () => move(si, -1), position === 0],
      [
        "down",
        t("down"),
        () => move(si, 1),
        position === state.order.length - 1,
      ],
      ["remove", t("remove"), () => remove(si), false],
    ]) {
      const button = element("button", label);
      button.type = "button";
      button.dataset[action] = si;
      button.disabled = disabled;
      button.setAttribute(
        "aria-label",
        t(
          action === "up"
            ? "moveUp"
            : action === "down"
              ? "moveDown"
              : "removeFile",
          file.name,
        ),
      );
      button.addEventListener("click", fn);
      actions.append(button);
    }
    main.append(actions);
    li.append(main);
    $("order-list").append(li);
  });
  $("confirm-order").disabled = state.files.length < 2 || state.busy;
  $("confirm-order").checked = state.confirmed;
}
function renderChoices() {
  const root = $("cue-choices");
  root.replaceChildren();
  const required = new Set(
    state.analysis?.conflicts.flatMap((g) => g.ids) ?? [],
  );
  let count = 0;
  state.order.forEach((si) =>
    state.analysis.scripts[si].cues.forEach((cue) => {
      count++;
      const id = `${si}:${cue.id}`,
        row = element("div", undefined, "cue-row"),
        label = element("div"),
        title = element("div", undefined, "cue-label");
      if (cue.key) title.append(element("span", keyLabel(cue.key), "key-chip"));
      title.append(document.createTextNode(brief(cue.text)));
      title.title = cue.text;
      label.append(
        title,
        element(
          "div",
          t("cueOrigin", state.files[si].name, cue.position) +
            (required.has(id) ? ` · ${t("repeats")}` : ""),
          "cue-origin",
        ),
      );
      row.append(label);
      if (cue.key) {
        const select = document.createElement("select");
        select.dataset.cueId = id;
        select.setAttribute(
          "aria-label",
          t("shortcutLabel", state.files[si].name, brief(cue.text)),
        );
        const add = (value, text) => {
          const option = element("option", text);
          option.value = value;
          select.append(option);
        };
        if (required.has(id)) add("", t("chooseDecision"));
        add("retain", t("keep", keyLabel(cue.key)));
        add("clear", t("clearKey"));
        for (const k of [
          ...Array.from({ length: 26 }, (_, i) => 65 + i),
          ...Array.from({ length: 10 }, (_, i) => 48 + i),
        ])
          if (k !== cue.key) add(`remap:${k}`, t("useKey", keyLabel(k)));
        const d = state.decisions[id];
        select.value = d
          ? d.action === "remap"
            ? `remap:${d.key}`
            : d.action
          : required.has(id)
            ? ""
            : "retain";
        select.addEventListener("change", () => {
          invalidate();
          if (!select.value) delete state.decisions[id];
          else
            state.decisions[id] = select.value.startsWith("remap:")
              ? { action: "remap", key: Number(select.value.slice(6)) }
              : { action: select.value };
          recompute();
        });
        row.append(select);
      } else row.append(element("span", t("localCue"), "local-label"));
      root.append(row);
    }),
  );
  $("cue-empty").hidden = count > 0;
  $("cue-hint").hidden = !state.analysis;
}
function renderStatus() {
  let text,
    kind = "";
  const error = state.fileError ?? state.computeError;
  if (state.busy) text = t("reading");
  else if (error) {
    kind = "error";
    text =
      error.code === "UI_CUE_LIMIT"
        ? t("tooManyCues")
        : error.code === "FILE_TYPE"
          ? t("fileType")
          : state.fileError
            ? t("loadError")
            : t("editError");
    text += ` · ${error.code}`;
    if (error.fileName) text += ` · ${error.fileName}`;
  } else if (state.activeExport) text = t("hashing");
  else if (!state.files.length) text = t("start");
  else if (state.files.length < 2) text = t("chooseAnother");
  else if (!state.confirmed) {
    kind = "pending";
    text = t("confirmFirst");
  } else if (!state.result) {
    kind = "pending";
    const ids = state.analysis.conflicts.flatMap((g) => g.ids);
    text = t(
      "unresolved",
      ids.filter((id) => !Object.hasOwn(state.decisions, id)).length,
    );
  } else {
    kind = state.result.receipt.retainedConflicts.length ? "pending" : "ready";
    text = t(
      state.result.receipt.retainedConflicts.length ? "retainedReady" : "ready",
    );
  }
  $("status").className = `status ${kind}`;
  $("status").textContent = text;
  $("error-detail").hidden = !error;
  $("error-text").textContent = error?.message ?? "";
}
function renderReview() {
  $("review").hidden = !state.result;
  $("export").disabled = !state.result || !!state.activeExport;
  $("receipt").disabled = !state.receipt || !!state.activeExport;
  $("print").disabled = !state.result;
  $("download-status").textContent = state.receipt
    ? t("saved", state.receipt.outputBytes, state.receipt.outputSHA256)
    : state.toolSaved
      ? t("savedTool")
      : "";
  if (!state.result) return;
  const r = state.result.receipt;
  $("reading-order").textContent = state.order
    .map((si, i) => `${i + 1}. ${state.files[si].name}`)
    .join(" → ");
  $("script-count").textContent = state.files.length;
  $("cue-count").textContent = r.cues.length;
  $("text-count").textContent = state.result.text.length.toLocaleString(
    state.language,
  );
  $("retained-warning").hidden = !r.retainedConflicts.length;
  $("retained-warning").textContent = r.retainedConflicts.length
    ? t(
        "retainedWarning",
        r.retainedConflicts.map((g) => keyLabel(g.key)).join(", "),
      )
    : "";
  $("cue-table").replaceChildren();
  for (const cue of r.cues) {
    const row = element("tr");
    for (const value of [
      state.files[cue.inputIndex].name,
      brief(cue.text),
      t("keyArrow", keyLabel(cue.beforeKey), keyLabel(cue.key)),
      cue.sourcePositionUTF16,
      cue.positionUTF16,
    ])
      row.append(element("td", value));
    row.children[1].title = cue.text;
    $("cue-table").append(row);
  }
}
function renderPreview() {
  $("preview-section").hidden = !state.analysis;
  if (!state.analysis) {
    $("preview").replaceChildren();
    return;
  }
  const select = $("preview-source");
  select.replaceChildren();
  const add = (value, label) => {
    const option = element("option", label);
    option.value = value;
    select.append(option);
  };
  if (state.result) add("joined", t("joinedPreview"));
  state.order.forEach((si) => add(String(si), state.files[si].name));
  if (state.preview === "joined" && !state.result)
    state.preview = String(state.order[0]);
  if (
    state.preview !== "joined" &&
    !state.order.includes(Number(state.preview))
  )
    state.preview = state.result ? "joined" : String(state.order[0]);
  select.value = state.preview;
  const model =
      state.preview === "joined"
        ? state.resultModel
        : state.analysis.scripts[Number(state.preview)],
    root = $("preview");
  root.replaceChildren();
  root.classList.toggle("dark", state.dark);
  $("preview-theme").textContent = t(state.dark ? "lightCanvas" : "darkCanvas");
  $("preview-title").textContent = t(
    state.preview === "joined" ? "joinedPreview" : "sourcePreview",
  );
  let units = 0,
    blocks = 0,
    clipped = false;
  for (const block of model.blocks) {
    if (blocks > 0) units++;
    if (blocks++ >= 200 || units >= 12000) {
      clipped = true;
      break;
    }
    const p = element("p");
    p.style.textAlign = block.align;
    p.dir = block.dir;
    for (const run of block.runs) {
      let text = run.text.slice(0, 12000 - units);
      if (text.length < run.text.length && /[\ud800-\udbff]$/.test(text))
        text = text.slice(0, -1);
      clipped = text.length < run.text.length;
      units += text.length;
      const span = element("span", text),
        s = run.style;
      span.style.fontFamily = s.family;
      span.style.fontWeight = String(s.weight);
      span.style.fontStyle = s.italic ? "italic" : "normal";
      span.style.textDecorationLine = s.decoration;
      if (s.foreground) span.style.color = s.foreground;
      if (s.background) span.style.backgroundColor = s.background;
      p.append(span);
      if (clipped) break;
    }
    root.append(p);
    if (clipped) break;
  }
  $("preview-caption").textContent =
    t("previewHint") + (clipped ? " " + t("clippedPreview") : "");
}
function recompute() {
  const wasReady = !!state.result;
  state.result = null;
  state.resultModel = null;
  state.computeError = null;
  if (
    state.analysis &&
    state.files.length >= 2 &&
    state.confirmed &&
    !state.busy
  ) {
    const missing = state.analysis.conflicts
      .flatMap((g) => g.ids)
      .some((id) => !Object.hasOwn(state.decisions, id));
    if (!missing)
      try {
        const result = joinScripts(state.files, {
          order: state.order,
          decisions: state.decisions,
        });
        const resultModel = inspectScript(result.html, "joined.html");
        state.result = result;
        state.resultModel = resultModel;
        if (!wasReady) state.preview = "joined";
      } catch (error) {
        state.computeError = {
          code: error.code ?? "JOIN_ERROR",
          message: error.message,
        };
      }
  }
  renderStatus();
  renderReview();
  renderPreview();
}
function renderAll() {
  translate();
  renderOrder();
  renderChoices();
  recompute();
}
function download(contents, name, type) {
  const blob = new Blob([contents], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function digest(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
async function exportHTML() {
  if (!state.result || state.activeExport) return;
  const job = Symbol(),
    revision = state.revision,
    result = state.result,
    files = state.files.map((f) => ({ name: f.name, bytes: f.bytes.slice() }));
  state.activeExport = job;
  renderStatus();
  renderReview();
  try {
    const inputHashes = await Promise.all(files.map((f) => digest(f.bytes))),
      outputSHA256 = await digest(encoder.encode(result.html));
    if (revision !== state.revision || state.activeExport !== job) return;
    const receipt = {
      ...result.receipt,
      inputHashes,
      outputSHA256,
      inputs: files.map((f, i) => ({
        name: f.name,
        bytes: f.bytes.byteLength,
        sha256: inputHashes[i],
      })),
      exportOrigin: "browser UI download",
    };
    download(result.html, "joined-qprompt.html", "text/html;charset=utf-8");
    state.receipt = receipt;
  } catch (error) {
    if (revision === state.revision)
      state.computeError = { code: "EXPORT_ERROR", message: error.message };
  } finally {
    if (state.activeExport === job) {
      state.activeExport = null;
      renderStatus();
      renderReview();
    }
  }
}
$("files").addEventListener("change", (event) =>
  loadFiles([...event.target.files]),
);
$("sample").addEventListener("click", loadSample);
$("clear").addEventListener("click", clear);
$("confirm-order").addEventListener("change", () => {
  invalidate();
  state.confirmed = $("confirm-order").checked;
  recompute();
});
$("export").addEventListener("click", exportHTML);
$("receipt").addEventListener("click", () => {
  if (state.receipt)
    download(
      JSON.stringify(state.receipt, null, 2) + "\n",
      "promptjoin-receipt.json",
      "application/json",
    );
});
$("print").addEventListener("click", () => {
  if (state.result) window.print();
});
for (const language of ["ja", "en"])
  $("lang-" + language).addEventListener("click", () => {
    state.language = language;
    renderAll();
  });
$("preview-source").addEventListener("change", () => {
  state.preview = $("preview-source").value;
  renderPreview();
});
$("preview-theme").addEventListener("click", () => {
  state.dark = !state.dark;
  renderPreview();
});
$("offline").addEventListener("click", () => {
  download(initialHTML, "prompt-join.html", "text/html;charset=utf-8");
  state.toolSaved = true;
  renderReview();
});
renderAll();
