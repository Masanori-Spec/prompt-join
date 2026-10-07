# Need and bounded difference

Checked 2026-10-06. QPrompt's open
[append-loading request](https://github.com/Cuperino/QPrompt-Teleprompter/issues/435)
describes compiling several scripts without repeatedly opening and copying files.
A separate [formatting report](https://github.com/Cuperino/QPrompt-Teleprompter/issues/431)
describes differences when combining imported documents. PromptJoin does not
claim to solve that report's Office conversion path; its inputs are supported
native text HTML only.

Generic local HTML joining already exists, including
[HTML Merger](https://www.merge-json-files.com/html-merger), which offers file
ordering, body/smart/raw modes and CSS/script controls. PromptJoin's proposed
difference is modest: understand QPrompt's `key_` shortcut metadata, require an
explicit conflict decision, preserve the supported inherited text styles and
verify output through QPrompt's actual loader/marker behavior. No claim of general
novelty or exhaustive competitor coverage is made. The comparator was reviewed
from its public page/source; no competitor runtime test was performed here.

The pinned native implementation is
[DocumentHandler](https://github.com/Cuperino/QPrompt-Teleprompter/blob/2a2f821eaa98eeae4996121c1df34e24ed6be3aa/src/documenthandler.cpp)
and [MarkersModel](https://github.com/Cuperino/QPrompt-Teleprompter/blob/2a2f821eaa98eeae4996121c1df34e24ed6be3aa/src/markersmodel.cpp).
`load` needs a real QML engine and normalizes some font/spacing declarations.
`saveAs` uses Qt's HTML writer. Marker parsing reads local anchors and `key_`
metadata; `keySearch` requests only one matching shortcut row, which explains
why retaining duplicates needs an explicit warning and native negative control.

Qt documents its [rich-text HTML subset](https://doc.qt.io/qt-6.8/richtext-html-subset.html).
This implementation accepts a narrower subset than Qt, with resource limits and
fail-closed unknown content/styles. Standard
[Debian Qt](https://packages.debian.org/trixie/qt6-declarative-dev),
[Kirigami](https://packages.debian.org/trixie/libkirigami6) and
[Vulkan](https://packages.debian.org/trixie/libvulkan-dev) packages provide the
hosted compatibility environment without building the full application.
