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

var pointerMapping = {};
var editorScrollTop = 0;
var editorScrollLeft = 0;

var isSilent = false;

function startWithDelay(code, ms, conditionTrigger)
{
	var timer = null;

	var run = function ()
	{
		var args = arguments;
		var pThis = this;

		if (timer)
		{
			clearTimeout(timer);
		}

		timer = setTimeout(
			function () 
			{
				if (conditionTrigger && !conditionTrigger())
				{
					run.apply(pThis, args);
					return;
				}

				code.apply(pThis, args);
			},
			ms);
	}

	return run;
}

function computeHash(str)
{
	var hash = 0;
	for (var i = 0; i < str.length; i++)
	{
		var char = str.charCodeAt(i);
		hash += char;
	}
	return hash;
}

connection.on("ReceiveContent", function (content, row, pos)
{
	isSilent = true;
	editor.getSession().setValue(content);
	editor.selection.moveCursorTo(row, pos);
	isSilent = false;
});

connection.on("ReceiveCursor", function (row, pos)
{
	isSilent = true;
	editor.selection.moveCursorTo(row, pos);
	isSilent = false;
});

connection.on("ReceiveSelection", function (srow, spos, erow, epos)
{
	isSilent = true;
	editor.selection.setSelectionAnchor(srow, spos);
	editor.selection.moveCursorTo(erow, epos);
	isSilent = false;
});

connection.on("Connected", function (connectionId)
{
	isSilent = true;


	isSilent = false;
});

connection.on("Disconnected", function (connectionId)
{
	isSilent = true;
	pointerMapping[connectionId].style.display = 'none';
	isSilent = false;
});

connection.on("ReceivePointer", function (connectionId, x, y)
{
	isSilent = true;

	if (!pointerMapping[connectionId])
	{
		var pointer = pointerMapping[connectionId] = document.createElement("DIV");
		pointer.className = 'pointer';
		pointer.style.filter = 'hue-rotate(' + (computeHash(connectionId) % 360) + 'deg)';
		document.body.appendChild(pointer);
	}

	pointerMapping[connectionId].style.left = x + 'px';
	pointerMapping[connectionId].style.top = y + 'px';
	isSilent = false;
});

connection.start().then(function ()
{
	connection.invoke("Join", SESSION_ID).catch(function (err)
	{
		return console.error(err.toString());
	});

	editor.getSession().on('change', function ()
	{

		if (isSilent)
		{
			return;
		}

		var cursor = editor.selection.getCursor();

		connection.invoke("UpdateContent", editor.getSession().getValue(), cursor.row, cursor.column).catch(function (err)
		{
			return console.error(err.toString());
		});

	});

	editor.selection.on('changeCursor', function ()
	{

		if (isSilent)
		{
			return;
		}

		var cursor = editor.selection.getCursor();

		connection.invoke("UpdateCursor", cursor.row, cursor.column).catch(function (err)
		{
			return console.error(err.toString());
		});

	});

	editor.selection.on('changeSelection', function ()
	{

		if (isSilent)
		{
			return;
		}

		var range = editor.selection.getRange();

		connection.invoke("UpdateSelection", range.start.row, range.start.column, range.end.row, range.end.column).catch(function (err)
		{
			return console.error(err.toString());
		});

	});

	editor.getSession().on('changeScrollTop',
		function (scroll)
		{
			editorScrollTop = parseInt(scroll) || 0;
		}
	);
	editor.getSession().on('changeScrollLeft',
		function (scroll)
		{
			editorScrollLeft = parseInt(scroll) || 0;
		}
	);

	document.onmousemove = startWithDelay(function (e)
	{
		var style = document.getElementsByClassName('.ace_text-input').style;

		connection.invoke("UpdatePointer", e.pageX + editorScrollLeft, e.pageY + editorScrollTop).catch(function (err)
		{
			return console.error(err.toString());
		});
	},
		10);

}).catch(function (err)
{
	return console.error(err.toString());
});
