# Verified offline release

The standalone Japanese/English tool in [dist/prompt-join.html](../dist/prompt-join.html)
was tested at commit `172b844e90362fc178467ad5bea632c5be9f1d64`:

- [Actual browser downloads and native consumer run 37554423385](https://github.com/Masanori-Spec/prompt-join/actions/runs/37554423385)
- [Separate source/native regression run 37554423389](https://github.com/Masanori-Spec/prompt-join/actions/runs/37554423389)

Both runs passed. The release closeout adds this documentation and copies of the
accepted evidence; implementation, tests, workflows and standalone HTML are
unchanged from that tested commit.

The standalone HTML is 253,928 bytes, SHA-256
`0bc2c57f936497a689470ef5088edad5b31ff969e9fadcdccc1eeaac19619634`.

## What was checked

Thirty core tests and all 35 actual browser cases passed. Browser checks cover
explicit reading order, every conflicting shortcut decision, remap/clear/retain,
keyboard controls, Unicode cue positions, invalid-input blocking, resource limits,
inert filenames/previews, delayed file reads and hashing, deterministic export,
and clean offline reopening. The empty-selection check dispatches an empty file
change event; it does not simulate cancelling an operating-system file dialog.

The real Chrome main-process command was recorded. Neither `--no-sandbox` nor
`--disable-setuid-sandbox` was present. Page errors, console errors and observed
page network requests were all empty, including the reopened offline file.
Chrome reported version 154.0.8037.97. All 13 desktop/mobile/warning/error
screenshots and both complete one-page Japanese/English PDFs were independently
reviewed. Mobile checks at 320 and 390 pixels in both languages reach the cue
table's rightmost position column by scrolling.

Five actual browser HTML/receipt pairs cover joined order, reversed order,
cleared shortcuts, explicitly retained duplicate shortcuts and native-resaved
inputs. Every downloaded byte and receipt hash was checked, then those same
files were passed into the native consumer job without regeneration by the core.
The complete browser-artifact handoff also matched byte-for-byte.

The unchanged official `DocumentHandler`, `MarkersModel` and font-dialog files
are compiled in a bounded host. A genuine QQmlEngine creates the handler with a
TextEdit and QQuickTextDocument. Original `load`, `parse`, `keySearch` and `saveAs`
methods execute. Fourteen observations cover seven modes, each after initial
load and after native save plus reload in a fresh process. Independent literal
expectations verify Unicode text, UTF-16 offsets, declared/resolved font families,
weight/italic, foreground/highlight alpha, decorations, cue labels/keys and key
search results. These are native component/API checks, not desktop GUI-driving.

The remapped result has key65 at UTF-16 position14 and key66 at44. In the retained
duplicate control, key65 selects only the first cue at14 from all four tested
cursor positions. Two separate controls change exactly one foreground color or
one same-length text segment. The checker requires their precise faulty result
and rejection by the unchanged positive oracle, before and after native save.
The original fixture files and their hashes remain unchanged.

## Consumer identity and limits

The official QPrompt 2.0.2 Linux DEB is pinned by exact release metadata, byte
count18,209,072 and SHA-256
`4e6c215cecc543d45b2504a48a2131939fc9093dd4e130f214c153688ab6bfc7`.
The source tag resolves to commit
`2a2f821eaa98eeae4996121c1df34e24ed6be3aa`; each fetched source file is checked
against its independent size, SHA-256 and Git blob identity before compilation.
The actual binary version command prints only `QPrompt`; installed package
metadata reports 2.0.2. The evidence records this distinction. Debian13 supplies
Qt6.8.2 and KDE Frameworks6.13. No vendor binaries or linked host executable are
included in this repository or its evidence.

Supported native text, flat span styling and local cues are deliberately bounded.
Input files are untouched; exported HTML is newly serialized. Exact source HTML
bytes, font size, layout and arbitrary metadata are not preserved. The official
loader removes size/spacing declarations, and native save can split anchors or
remove residual href from non-anchor cue continuations. Those normalizations do
not change the tested text/style/cue semantics. Arbitrary web HTML, Office,
images, external assets and automation markers remain outside the supported
scope. The preview's browser appearance is not a native layout guarantee.

## Retained evidence

[Provenance](evidence/provenance.json) maps every retained file to the exact
artifact member and SHA-256. Copies are unedited bytes from the accepted runs:
reports, all five HTML/receipt pairs, all 14 native records, the two exact faulty
HTML controls, selected screenshots and both PDFs. Original complete artifact
digests and member counts are recorded even if hosted artifacts later expire.

Read the [browser report](evidence/browser/browser-report.json),
[native join report](evidence/native/join-report.json),
[consumer pin](evidence/native/consumer-pin.json) and
[browser-input mapping](evidence/native/browser-input-provenance.json).
The [earlier component](native-checkpoint.md) and
[source-only joining](native-join-checkpoint.md) checkpoints remain separately
identified. This release's browser-native proof uses actual UI downloads.

Original code and synthetic fixture content have no reuse license grant.
Existing third-party notices remain scoped to their respective dependencies.
