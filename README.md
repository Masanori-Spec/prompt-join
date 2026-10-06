# PromptJoin: native compatibility probe

This is a source-only feasibility probe for an offline joiner of QPrompt-native
HTML scripts. There is no product UI or completed merge compatibility claim yet.

The first hosted gate checks the official QPrompt 2.0.2 Debian package and a small
harness that compiles its unchanged DocumentHandler, MarkersModel and font-dialog
sources. A real QQmlEngine creates a TextEdit and its QQuickTextDocument. The
handler authors/saves two original scripts through Qt APIs, then loads/parses
each saved file in a fresh process. A separate Python oracle checks literal
Unicode text, colors, emphasis, highlights, ordinary cues and duplicate A-key cues.

Debian 13 packages supply Qt 6.8.2, KDE Frameworks 6.13 and Vulkan 1.4.309, meeting
the official project's declared minimums. The full QPrompt source tree is not
built. Vendor code and binaries are fetched only to the hosted temporary folder
and excluded from repository and workflow artifacts.

Future scope is a conservative subset: chosen input order, text, supported
emphasis/colors/highlights and local cues. Duplicate keyboard cues need explicit
remap, clear or retain review. Images, office imports, automation/network markers
and arbitrary HTML are outside scope. Exact font size is not promised: the
official loader removes size declarations. A joiner must preserve each script's
supported inherited styles, rather than discarding the second body's defaults.

Original probe code and synthetic fixture content have no reuse license grant.
Upstream ownership and license information is recorded in
[the consumer notice](docs/consumer-notice.md).
