#include <QApplication>
#include <QColor>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QQmlComponent>
#include <QQmlEngine>
#include <QQuickTextDocument>
#include <QTextBlock>
#include <QTextCursor>
#include <QTextFragment>
#include <memory>
#include <stdexcept>
#include "documenthandler.h"

static void require(bool condition, const char *message) {
    if (!condition) throw std::runtime_error(message);
}
static void writeJson(const QString &path, const QJsonObject &value) {
    QFile file(path); require(file.open(QIODevice::WriteOnly), "Cannot write report");
    file.write(QJsonDocument(value).toJson(QJsonDocument::Indented));
}
struct Host {
    QQmlEngine engine;
    QQmlComponent component{&engine};
    std::unique_ptr<QObject> root;
    DocumentHandler *handler = nullptr;
    QTextDocument *doc = nullptr;
    Host() {
        component.setData(R"QML(
import QtQuick
import PromptProbe 1.0
Item {
    width: 900; height: 700
    TextEdit { id: editor; objectName: "editor"; width: 860; height: 680
        textFormat: TextEdit.RichText; wrapMode: TextEdit.Wrap
    }
    DocumentHandler { objectName: "handler"
        document: editor.textDocument
        cursorPosition: editor.cursorPosition
        selectionStart: editor.selectionStart
        selectionEnd: editor.selectionEnd
    }
}
)QML", QUrl("qrc:/probe.qml"));
        root.reset(component.create());
        if (!root) qCritical() << component.errors();
        require(bool(root), "QML host creation failed");
        handler = root->findChild<DocumentHandler *>("handler");
        require(handler && qmlEngine(handler) == &engine, "Handler lacks its real QQmlEngine");
        require(handler->document(), "No QQuickTextDocument");
        doc = handler->document()->textDocument();
        require(doc, "No document behind QQuickTextDocument");
        handler->setAutoReload(false);
    }
    void select(int start, int end) {
        handler->setCursorPosition(end);
        handler->setSelectionStart(start);
        handler->setSelectionEnd(end);
    }
    void cue(int start, int end, const QString &key = {}) {
        select(start, end); handler->setMarker(true);
        if (!key.isEmpty()) handler->setKeyMarker(key);
    }
    QJsonObject snapshot() {
        QCoreApplication::processEvents();
        handler->parse();
        QJsonArray fragments, markers, probes;
        for (QTextBlock b = doc->begin(); b.isValid(); b = b.next()) {
            for (auto it = b.begin(); !it.atEnd(); ++it) {
                const QTextFragment f = it.fragment();
                if (!f.isValid()) continue;
                const auto fmt = f.charFormat();
                const auto font = fmt.font().resolve(doc->defaultFont());
                fragments.append(QJsonObject{{"position", f.position()}, {"text", f.text()},
                    {"weight", int(font.weight())}, {"italic", font.italic()},
                    {"foreground", fmt.foreground().color().name(QColor::HexRgb)},
                    {"background", fmt.background().style() == Qt::NoBrush ? QString() : fmt.background().color().name(QColor::HexRgb)},
                    {"anchor", fmt.isAnchor()}, {"href", fmt.anchorHref()},
                    {"names", QJsonArray::fromStringList(fmt.anchorNames())}});
            }
        }
        auto *model = handler->markers();
        for (int i = 0; i < model->rowCount(); ++i) {
            auto index = model->index(i);
            markers.append(QJsonObject{{"text", model->data(index, MarkersModel::TextRole).toString()},
                {"position", model->data(index, MarkersModel::PositionRole).toInt()},
                {"key", model->data(index, MarkersModel::KeyRole).toInt()},
                {"href", model->data(index, MarkersModel::UrlRole).toString()},
                {"requestType", model->data(index, MarkersModel::RequestTypeRole).toInt()}});
        }
        for (int position : {-1, 0, 15, 1000}) {
            handler->setCursorPosition(position);
            probes.append(QJsonObject{{"cursor", position}, {"key65", handler->keySearch(65)}, {"key66", handler->keySearch(66)}});
        }
        return {{"qtVersion", qVersion()}, {"realQmlEngine", qmlEngine(handler) == &engine},
            {"documentClass", handler->document()->metaObject()->className()},
            {"text", doc->toPlainText()}, {"fragments", fragments}, {"markers", markers}, {"keySearch", probes}};
    }
};

int main(int argc, char **argv) {
    QApplication app(argc, argv);
    app.setOrganizationName("PromptJoinProbe"); app.setApplicationName("PromptJoinProbe");
    qmlRegisterType<DocumentHandler>("PromptProbe", 1, 0, "DocumentHandler");
    try {
        const auto args = app.arguments();
        require(args.size() >= 4, "usage: probe author A|B path | inspect input report [save]");
        Host host;
        if (args[1] == "author") {
            require(args[2] == "A" || args[2] == "B", "Unknown original fixture");
            const bool a = args[2] == "A";
            QFont font(a ? "DejaVu Sans" : "DejaVu Serif", a ? 24 : 36,
                a ? QFont::Normal : QFont::DemiBold, !a);
            host.doc->setDefaultFont(font);
            QTextCharFormat base; base.setForeground(QColor(a ? "#203040" : "#405060"));
            QTextCursor cursor(host.doc);
            cursor.insertText(a ? QString::fromUtf8("Alpha café 🌟\nCue one\nLocal A\nEnd A")
                                : QString::fromUtf8("Beta 東京\nCue two\nLocal B\nEnd B"), base);
            host.select(a ? 6 : 5, a ? 10 : 7);
            host.handler->setBold(true); host.handler->setItalic(a);
            host.handler->setTextColor(QColor(a ? "#cc2244" : "#1266aa"));
            host.handler->setTextBackground(QColor(a ? "#fff080" : "#aaffcc"));
            host.cue(a ? 14 : 8, a ? 21 : 15, "65");
            host.cue(a ? 22 : 16, a ? 29 : 23);
            host.handler->saveAs(QUrl::fromLocalFile(args[3]));
            require(QFile::exists(args[3]), "Native save failed");
            writeJson(args[3] + ".author.json", host.snapshot());
        } else if (args[1] == "inspect") {
            require(QFile::exists(args[2]), "Input does not exist");
            bool loaded = false;
            QObject::connect(host.handler, &DocumentHandler::loaded, &app, [&loaded](Qt::TextFormat) { loaded = true; });
            host.handler->load(QUrl::fromLocalFile(args[2]));
            require(loaded, "Official load did not emit loaded");
            writeJson(args[3], host.snapshot());
            if (args.size() == 5) {
                QFile::remove(args[4]); host.handler->saveAs(QUrl::fromLocalFile(args[4]));
                require(QFile::exists(args[4]), "Native roundtrip save failed");
            }
        } else throw std::runtime_error("Unknown mode");
        return 0;
    } catch (const std::exception &e) {
        qCritical() << e.what(); return 1;
    }
}
