/**
 * Family Biz - Backend API (Google Apps Script) v4.3 (Performance Optimized)
 * รองรับทั้ง V8 และ Legacy Runtime
 * v4.3: Cache Spreadsheet ID, ลด API calls, batch write
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
    // ใช้ PropertiesService เก็บ Spreadsheet ID ไว้
    // เพื่อข้าม DriveApp.getFolderById() ที่ช้ามากใน request ถัดไป
    var props = PropertiesService.getScriptProperties();
    var cachedId = props.getProperty('DB_SPREADSHEET_ID');

    if (cachedId) {
        try {
            return SpreadsheetApp.openById(cachedId);
        } catch (e) {
            // ถ้าเปิดไม่ได้ (เช่นถูกลบ) ให้ล้าง cache แล้วสร้างใหม่
            props.deleteProperty('DB_SPREADSHEET_ID');
        }
    }

    // ค้นหาหรือสร้างใหม่ (ทำแค่ครั้งแรกหรือถ้า cache หาย)
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFilesByName(DB_NAME);

    var ss;
    if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
    } else {
        ss = SpreadsheetApp.create(DB_NAME);
        var file = DriveApp.getFileById(ss.getId());
        file.moveTo(folder);
        setupSheets(ss);
    }

    // Cache ID ไว้ใช้ครั้งต่อไป
    props.setProperty('DB_SPREADSHEET_ID', ss.getId());
    return ss;
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
    if (!ss.getSheetByName('Withdrawals')) {
        var shW = ss.insertSheet('Withdrawals');
        shW.appendRow(['id', 'date', 'amount', 'note', 'timestamp']);
    }
    if (!ss.getSheetByName('CustomCategories')) {
        var shC = ss.insertSheet('CustomCategories');
        shC.appendRow(['id', 'name', 'icon', 'type']);
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
    return {
        transactions: sheetToObjects(ss.getSheetByName('Transactions')),
        investments: sheetToObjects(ss.getSheetByName('Investments')),
        withdrawals: sheetToObjects(ss.getSheetByName('Withdrawals')),
        customCategories: sheetToObjects(ss.getSheetByName('CustomCategories')),
        settings: settingsToObject(ss.getSheetByName('Settings'))
    };
}

function saveAllData(ss, data) {
    if (data.transactions) overwriteSheet(ss, 'Transactions', data.transactions, ['id', 'date', 'type', 'category', 'amount', 'description', 'deductCost', 'husbandShare', 'wifeShare', 'timestamp']);
    if (data.investments) overwriteSheet(ss, 'Investments', data.investments, ['id', 'date', 'investor', 'amount', 'note', 'timestamp']);
    if (data.withdrawals) overwriteSheet(ss, 'Withdrawals', data.withdrawals, ['id', 'date', 'amount', 'note', 'timestamp']);
    if (data.customCategories) overwriteSheet(ss, 'CustomCategories', data.customCategories, ['id', 'name', 'icon', 'type']);
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
    // Batch write ทีเดียวแทน 4 appendRow
    var data = [
        ['Key', 'Value'],
        ['costPercent', newSettings.costPercent || 30],
        ['husbandShare', newSettings.husbandShare || 50],
        ['wifeShare', newSettings.wifeShare || 50]
    ];
    sheet.getRange(1, 1, data.length, 2).setValues(data);
}

function overwriteSheet(ss, sheetName, objects, fieldOrder) {
    var sheet = ss.getSheetByName(sheetName);
    sheet.clearContents();

    if (!objects || !objects.length) {
        // เขียนแค่ header
        sheet.getRange(1, 1, 1, fieldOrder.length).setValues([fieldOrder]);
        return;
    }

    // รวม header + data เป็น array เดียว แล้วเขียนครั้งเดียว (1 API call แทน 3)
    var rows = objects.map(function (obj) {
        return fieldOrder.map(function (field) {
            var val = obj[field];
            return (val === undefined || val === null) ? '' : val;
        });
    });

    var allRows = [fieldOrder].concat(rows);
    sheet.getRange(1, 1, allRows.length, fieldOrder.length).setValues(allRows);
}


