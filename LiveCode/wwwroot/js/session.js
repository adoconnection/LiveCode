"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl("/sessions").build();

var editor = ace.edit("editor");
editor.setTheme("ace/theme/textmate");
editor.session.setMode("ace/mode/csharp");
editor.setFontSize("12px");
editor.setHighlightActiveLine('checked');
editor.setHighlightSelectedWord(true);
editor.setDisplayIndentGuides(true);
editor.renderer.setShowPrintMargin(false);

var isSilent = false;

connection.on("ReceiveContent", function (content, row, pos) {
    isSilent = true;
    editor.getSession().setValue(content);
    editor.selection.moveCursorTo(row, pos);
    isSilent = false;
});

connection.on("ReceiveCursor", function (row, pos) {
    isSilent = true;
    editor.selection.moveCursorTo(row, pos);
    isSilent = false;
});

connection.on("ReceiveSelection", function (srow, spos, erow, epos) {
    isSilent = true;
    editor.selection.setSelectionAnchor(srow, spos);
    editor.selection.moveCursorTo(erow, epos);
    isSilent = false;
});

connection.start().then(function ()
{
    connection.invoke("Join", SESSION_ID).catch(function (err) {
        return console.error(err.toString());
    });

    editor.getSession().on('change', function () {

        if (isSilent) {
            return;
        }

        var cursor = editor.selection.getCursor();

        connection.invoke("UpdateContent", editor.getSession().getValue(), cursor.row, cursor.column).catch(function (err) {
            return console.error(err.toString());
        });

    });

    editor.selection.on('changeCursor', function () {

        if (isSilent) {
            return;
        }

        var cursor = editor.selection.getCursor();

        connection.invoke("UpdateCursor", cursor.row, cursor.column).catch(function (err) {
            return console.error(err.toString());
        });

    });

    editor.selection.on('changeSelection', function () {

        if (isSilent) {
            return;
        }

        var range = editor.selection.getRange();

        connection.invoke("UpdateSelection", range.start.row, range.start.column, range.end.row, range.end.column).catch(function (err) {
            return console.error(err.toString());
        });

    });


}).catch(function (err)
{
    return console.error(err.toString());
});
