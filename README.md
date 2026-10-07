# PromptJoin: source-only native joining gate

This is a source-only feasibility implementation of an offline joiner of supported
QPrompt-native HTML scripts. There is no product UI or completed merge
compatibility claim yet. The initial native component compatibility probe passed;
the current gate must prove the joiner's own output and intentional fault controls.

The first hosted gate checks the official QPrompt 2.0.2 Debian package and a small
harness that compiles its unchanged DocumentHandler, MarkersModel and font-dialog
sources. A real QQmlEngine creates a TextEdit and its QQuickTextDocument. The
handler authors/saves two original scripts through Qt APIs, then loads/parses
each saved file in a fresh process. A separate Python oracle checks literal
Unicode text, UTF-16 cue positions, font families, colors, emphasis and alpha.

The join core preserves supported inherited body font defaults as explicit run styles
and requires an explicit file order. Every cue sharing a shortcut needs a decision:
remap it, clear only its shortcut, or explicitly retain the duplicate with a
receipt warning. Ordinary local cues remain. Supported shortcuts are ASCII
digits and uppercase A–Z. There is no automatic allocation or guessed intent.

The hosted joining gate sends actual core output through the original native
load/parse/keySearch/save methods and a fresh process. It checks both file orders,
distinct A/B shortcuts and shortcut clearing. The duplicate-key control must
exhibit QPrompt's real first-match ambiguity. Separately corrupted text and color
must match their literal single faults and fail the unchanged positive oracle.

Debian 13 packages supply Qt 6.8.2, KDE Frameworks 6.13 and Vulkan 1.4.309, meeting
the official project's declared minimums. The full QPrompt source tree is not
built. Vendor code and binaries are fetched only to the hosted temporary folder
and excluded from repository and workflow artifacts.

Scope is a conservative native Qt HTML subset: explicit paragraphs, emphasis in
flat native spans, six-digit colors/highlights explicitly stored on spans, and local cues with native
underline/overline styling. Native first-letter
anchor serialization plus an underlined continuation is recognized. Markers with
unsupported mixed formatting, images, lists/tables, nonzero indentation, arbitrary
stylesheets, nested inline markup, comments inside cue anchors, office imports
and automation/network links are rejected. The tool
does not execute input scripts or fetch HTML resources.

Input/output resource limits and strict parsing are enforced. The input files are
unchanged; the output is a newly serialized supported document. Exact HTML bytes,
font size, line layout and arbitrary metadata are not preservation claims. The
official loader removes size declarations and native save can normalize anchor
fragments. The receipt discloses removed size/spacing declarations and source/cue
mapping. Only semantic text, supported styling and local cue behavior are tested.

See [the verified component checkpoint](docs/native-checkpoint.md) and
[the need and comparison](docs/research.md). Run `npm ci --ignore-scripts` and
`npm test` for local core checks; Qt execution remains in hosted CI.

Original probe code and synthetic fixture content have no reuse license grant.
Upstream ownership and license information is recorded in
[the consumer notice](docs/consumer-notice.md).
The parser dependencies' existing notices are retained separately in
[third-party notices](docs/third-party-notices.txt).
