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
        sh.appendRow(['id', 'date', 'type', 'category', 'amount', 'description', 'deductCost', 'husbandShare', 'wifeShare', 'timestamp']);
        var def = ss.getSheetByName('Sheet1');
        if (def) ss.deleteSheet(def);
    }
    if (!ss.getSheetByName('Investments')) {
        var sh2 = ss.insertSheet('Investments');
        sh2.appendRow(['id', 'date', 'investor', 'amount', 'note', 'timestamp']);
    }
    if (!ss.getSheetByName('Settings')) {
        var sh3 = ss.insertSheet('Settings');
        sh3.appendRow(['Key', 'Value']);
        sh3.appendRow(['costPercent', '30']);
        sh3.appendRow(['husbandShare', '50']);
        sh3.appendRow(['wifeShare', '50']);
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
    if (data.transactions) overwriteSheet(ss, 'Transactions', data.transactions, ['id', 'date', 'type', 'category', 'amount', 'description', 'deductCost', 'husbandShare', 'wifeShare', 'timestamp']);
    if (data.investments) overwriteSheet(ss, 'Investments', data.investments, ['id', 'date', 'investor', 'amount', 'note', 'timestamp']);
    if (data.settings) updateSettingsSheet(ss, data.settings);
}

// --- Helpers ---

function sheetToObjects(sheet) {
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0]; // Keep original case from spreadsheet

    return data.slice(1).map(function (row) {
        var obj = {};
        headers.forEach(function (h, i) {
            var val = row[i];
            if (val instanceof Date) {
                val = Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd");
            }
            // Smart Parsing
            if (h === 'deductCost') val = (val === true || val === 'true');
            if (h === 'husbandShare' || h === 'wifeShare' || h === 'amount') {
                val = parseFloat(val);
                if (isNaN(val)) val = 0;
            }

            obj[h] = val;
        });
        return obj;
    });
}

function settingsToObject(sheet) {
    var data = sheet.getDataRange().getValues();
    var settings = {};
    for (var i = 1; i < data.length; i++) {
        var key = data[i][0];
        var val = data[i][1];
        if (key === 'costPercent' || key === 'husbandShare' || key === 'wifeShare') {
            val = parseInt(val) || 0;
        }
        settings[key] = val;
    }
    return settings;
}

function updateSettingsSheet(ss, newSettings) {
    var sheet = ss.getSheetByName('Settings');
    sheet.clearContents();
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['costPercent', newSettings.costPercent || 30]);
    sheet.appendRow(['husbandShare', newSettings.husbandShare || 50]);
    sheet.appendRow(['wifeShare', newSettings.wifeShare || 50]);
}

function overwriteSheet(ss, sheetName, objects, fieldOrder) {
    var sheet = ss.getSheetByName(sheetName);
    sheet.clearContents();
    var headers = fieldOrder; // Use camelCase as headers
    sheet.appendRow(headers);
    if (!objects || !objects.length) return;

    var rows = objects.map(function (obj) {
        return fieldOrder.map(function (field) {
            var val = obj[field];
            return (val === undefined || val === null) ? '' : val;
        });
    });

    sheet.getRange(2, 1, rows.length, fieldOrder.length).setValues(rows);
}


