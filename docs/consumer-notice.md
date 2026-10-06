# Consumer provenance and licensing boundary

QPrompt 2.0.2 source is pinned to commit
`2a2f821eaa98eeae4996121c1df34e24ed6be3aa` in
[Cuperino/QPrompt-Teleprompter](https://github.com/Cuperino/QPrompt-Teleprompter/tree/2a2f821eaa98eeae4996121c1df34e24ed6be3aa).
Its DocumentHandler, MarkersModel, Marker and SystemFontChooserDialog files carry
their upstream copyright and GPL version 3 notices; DocumentHandler also retains
its upstream Qt example notices. All downloaded source bytes and notices remain
unchanged in the temporary hosted build. See the upstream
[COPYING](https://github.com/Cuperino/QPrompt-Teleprompter/blob/2a2f821eaa98eeae4996121c1df34e24ed6be3aa/COPYING).

The official package is verified against the primary release API, exact filename,
size and SHA-256 before unpacking or execution. Each fetched source is verified
against the pinned commit's Git tree plus literal size, Git blob and SHA-256.
The harness links those files only for this hosted test. Neither upstream source
nor any executable is included in the public project/evidence payload.

This gate is an unchanged-official-source API integration test with real Qt Quick
objects. It is not a claim that the desktop GUI was driven, or that a standalone
QTextDocument clone represents the QPrompt loader. Official DEB startup/version
is recorded separately from handler behavior.
