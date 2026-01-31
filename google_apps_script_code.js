/**
 * Family Biz - Backend API (Google Apps Script) v4.2 (Legacy Safe)
 * รองรับทั้ง V8 และ Legacy Runtime
 */

var FOLDER_ID = "1owOBdWc-aCg799wPHAjddO1MrWaquo0z";
var DB_NAME = "FamilyBiz_Database";

// --- DEBUG TOOLS ---
function debugSetup() {
    try {
        var db = getOrCreateDatabase();
        Logger.log("SUCCESS: Database found/created at: " + db.getUrl());
        Logger.log("Folder ID: " + FOLDER_ID);
    } catch (e) {
        Logger.log("ERROR: " + e.toString());
    }
}

// --- Main Request Handlers ---

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(30000);

    try {
        var db = getOrCreateDatabase();
        // Check for valid event object
        if (!e || !e.parameter) {
            return ContentService.createTextOutput(JSON.stringify({
                status: "ready",
                message: "Service Operational"
            })).setMimeType(ContentService.MimeType.JSON);
        }

        var action = e.parameter.action;
        var payload = null;

        if (e.postData && e.postData.contents) {
            try { payload = JSON.parse(e.postData.contents); } catch (err) { }
        }

        var result = {};

        if (action === "getAll") {
            result = getAllData(db);
        } else if (action === "sync" || payload) {
            if (payload) {
                saveAllData(db, payload);
                result = { status: "success", message: "Saved to Drive" };
            } else {
                result = { status: "error", message: "No Payload" };
            }
        } else {
            result = { status: "ready", dbName: DB_NAME };
        }

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

// --- Database Logic ---

function getOrCreateDatabase() {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFilesByName(DB_NAME);

    if (files.hasNext()) {
        return SpreadsheetApp.open(files.next());
    } else {
        var ss = SpreadsheetApp.create(DB_NAME);
        var file = DriveApp.getFileById(ss.getId());
        file.moveTo(folder);
        setupSheets(ss);
        return ss;
    }
}

function setupSheets(ss) {
    if (!ss.getSheetByName('Transactions')) {
        var sh = ss.insertSheet('Transactions');
        sh.appendRow(['ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Timestamp']);
        var def = ss.getSheetByName('Sheet1');
        if (def) ss.deleteSheet(def);
    }
    if (!ss.getSheetByName('Investments')) {
        var sh2 = ss.insertSheet('Investments');
        sh2.appendRow(['ID', 'Date', 'Investor', 'Amount', 'Note', 'Timestamp']);
    }
    if (!ss.getSheetByName('Settings')) {
        var sh3 = ss.insertSheet('Settings');
        sh3.appendRow(['Key', 'Value']);
        sh3.appendRow(['costPercent', '30']);
    }
}

function getAllData(ss) {
    setupSheets(ss);
    return {
        transactions: sheetToObjects(ss.getSheetByName('Transactions')),
        investments: sheetToObjects(ss.getSheetByName('Investments')),
        settings: settingsToObject(ss.getSheetByName('Settings'))
    };
}

function saveAllData(ss, data) {
    if (data.transactions) overwriteSheet(ss, 'Transactions', data.transactions, ['id', 'date', 'type', 'category', 'amount', 'description', 'timestamp']);
    if (data.investments) overwriteSheet(ss, 'Investments', data.investments, ['id', 'date', 'investor', 'amount', 'note', 'timestamp']);
    if (data.settings) updateSettingsSheet(ss, data.settings);
}

// --- Helpers ---

function sheetToObjects(sheet) {
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0].map(function (h) { return h.toString().toLowerCase(); });

    return data.slice(1).map(function (row) {
        var obj = {};
        headers.forEach(function (h, i) {
            obj[h] = (row[i] instanceof Date) ? Utilities.formatDate(row[i], "GMT+7", "yyyy-MM-dd") : row[i];
        });
        return obj;
    });
}

function settingsToObject(sheet) {
    var data = sheet.getDataRange().getValues();
    var settings = {};
    for (var i = 1; i < data.length; i++) {
        settings[data[i][0]] = data[i][1];
    }
    return settings;
}

function updateSettingsSheet(ss, newSettings) {
    var sheet = ss.getSheetByName('Settings');
    sheet.clearContents();
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['costPercent', newSettings.costPercent || 30]);
}

function overwriteSheet(ss, sheetName, objects, fieldOrder) {
    var sheet = ss.getSheetByName(sheetName);
    sheet.clearContents();
    var headers = fieldOrder.map(function (f) { return f.charAt(0).toUpperCase() + f.slice(1); });
    sheet.appendRow(headers);
    if (!objects || !objects.length) return;

    var rows = objects.map(function (obj) {
        return fieldOrder.map(function (field) { return obj[field] || ''; });
    });

    sheet.getRange(2, 1, rows.length, fieldOrder.length).setValues(rows);
}
