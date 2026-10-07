# Verified component compatibility checkpoint

The initial source-only compatibility probe passed at
`a784c945d76906bfe7cc674ba1f72a34a3567107` in
[run 37547990076](https://github.com/Masanori-Spec/prompt-join/actions/runs/37547990076).
Artifact 11451099903 has SHA-256
`6690b95d38b39ae43544195befc5d4f21f57583df86e223a7c529ab30a973ac1`.
The 21 downloaded members and literal fixture records were independently checked.

The official QPrompt DEB and all eight exact upstream source files passed primary
metadata, size and digest checks. The official package installed on Debian 13
with Qt 6.8.2, KF 6.13 and Vulkan 1.4.309. Its `--version` command printed only
`QPrompt`, without a version number. The release hash and `dpkg` package metadata
identify version 2.0.2; the empty version output is not replaced by an invented one.

Three unchanged source components compiled in a small harness. QML created the
DocumentHandler beside a real TextEdit/QQuickTextDocument, establishing its own
QQmlEngine. Original scripts were authored and saved through native APIs, then
loaded, parsed, saved and reloaded in fresh processes. Both literal Unicode text
sets, all UTF-16 cue positions, key-search results and expected emphasis/color/alpha
checks passed. The two native bodies have distinct font defaults.

QPrompt's native serialization can split a named cue after its first character;
its marker parser reconstructs the label from the next underlined fragment.
Native save may remove a residual `href` from that non-anchor continuation.
Whole snapshot or whole HTML identity across native save is not claimed. The
original synthetic fixture files remain unchanged by the joining core.

This checkpoint establishes the bounded official-component runtime path. It is
not joined-output, fault-control, browser-download or product UI acceptance.
