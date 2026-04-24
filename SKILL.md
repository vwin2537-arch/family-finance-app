---
name: antigravity-core-skills
description: "คู่มือมาตรฐานการทำงานและข้อควรระวัง (Knowledge Base) สำหรับ AI Agent เพื่อลดข้อผิดพลาดในอนาคต"
---

# 🧠 Antigravity's Core Knowledge & Workflow Standards

เอกสารนี้รวบรวม **"บทเรียนราคาแพง" (Lessons Learned)** และ **"มาตรฐานการทำงาน"** จากทุกโปรเจคที่ผ่านมา เพื่อให้การทำงานครั้งต่อไปราบรื่น ลดความผิดพลาดซ้ำซ้อน และรักษาคุณภาพงานระดับสูง

---

## 1. 🏗️ Architecture: Hybrid Cloud (PWA + Google Apps Script)
*ใช้สำหรับโปรเจคที่ต้องการ Offline-First แต่ยัง Sync ข้อมูลลง Google Sheets ได้*

### 1.1 Data Type Safety (กฎเหล็กเรื่อง ID) 🚨
*   **ปัญหาที่พบบ่อย:** Google Sheets ชอบแปลง ID ที่เป็นตัวเลข (เช่น "123456") ให้กลายเป็น `Number` อัตโนมัติเมื่อเราอ่านกลับมา
*   **ผลกระทบ:** ทำให้การค้นหาหรือลบข้อมูลใน JS พัง (`"123" !== 123`)
*   **แนวทางแก้ไข:**
    *   **Frontend Check:** ตอน `pullFromCloud` ต้องบังคับแปลง ID ทุกตัวให้เป็น String เสมอ (`id: String(item.id)`).
    *   **Comparison:** เวลาเปรียบเทียบ ID หากไม่มั่นใจให้แปลงเป็น String ก่อนเทียบ

### 1.2 Sync Strategy (Overwrite vs Delta)
*   **Simple Apps:** ใช้ระบบ **"ล้างแล้วเขียนใหม่" (Clear & Overwrite)** ในฝั่ง Google Sheets ปลอดภัยที่สุด ลดปัญหา Transaction Conflict
*   **Offline Mode:** แก้ไข LocalStorage ก่อนเสมอ แล้วค่อย Trigger Sync (Background) เพื่อให้ UX ลื่นไหล

---

## 2. 🚀 Backend: Google Apps Script (GAS)

### 2.1 Deployment Rules
*   **New Deployment Only:** ทุกครั้งที่มีการแก้โค้ด `.gs` ต้องย้ำ USER ให้ทำ **"New Deployment"** เสมอ (การ Save เฉยๆ ไม่พอสำหรับ Web App)
*   **Full Code Delivery:** ห้ามส่ง Code Snippet ให้ USER ไปแปะเอง ให้ส่ง **"ไฟล์เต็มทั้งหน้า"** เสมอ เพื่อป้องกันการวางผิดบรรทัด

### 2.2 Data Integrity
*   **doPost Handling:** ฟังก์ชัน `doPost(e)` เป็นหัวใจหลัก ต้องเขียน `try-catch` ครอบเสมอ และต้อง Return `ContentService` เป็น JSON เท่านั้น
*   **String Only:** การรับส่งข้อมูลผ่าน `doPost` ต้องส่งแบบ String (JSON.stringify) เสมอ

---

## 3. 🎨 Frontend & UI Standards (Premium UX)

### 3.1 PWA & Caching Lifecycle
*   **Version Bumping:** ทุกครั้งที่แก้โค้ด Logic สำคัญ (JS) หรือแก้ Bug ต้องเปลี่ยนตัวเลขรุ่น `CACHE_NAME` ใน `sw.js` (เช่น `v10` -> `v11`) เสมอ เพื่อบังคับให้เครื่อง USER โหลดโค้ดใหม่
*   **Cache Strategy:** ไฟล์สำคัญ (`index.html`, `app.js`) ควรใช้ Network First หรือ Stale-While-Revalidate

### 3.2 Resilience (ความทนทานของ UI)
*   **Safeguards:** ฟังก์ชันสำคัญ (Edit, Delete, Submit) ต้องครอบ `try-catch` เสมอ เพื่อให้สามารถ `alert` แจ้ง USER ได้หากเกิดข้อผิดพลาด ดีกว่าปล่อยให้เงียบไป
*   **Input Protection:** ห้ามเขียนโค้ดที่ Reset ค่าที่ USER กรอกไว้ (เช่น วันที่) โดยไม่จำเป็น (ตัวอย่าง: `setTxType` ต้องไม่ล้างวันที่ทิ้งถ้าเป็นการแก้ไข)

### 3.3 Typography & Theme (Cute Aesthetics) 🎀
*   **Font Choice:** ฟอนต์ที่แนะนำสำหรับสไตล์น่ารัก/เป็นกันเอง คือ **'Mali'** (Google Fonts)
    *   *เหตุผล:* ให้ความรู้สึกเหมือนลายมือเขียน สบายตา เหมาะกับ Family App
*   **Alternatives:**
    *   ถ้าต้องการความสนุกสนาน: **'Itim'** หรือ **'Kodchasan'**
    *   ถ้าต้องการความทันสมัย: **'Kanit'** (Standard Thai Font)
*   **Implementation:** ต้อง `@import` จาก Google Fonts เสมอ และกำหนด `font-family` ใน `body` ให้ครอบคลุมทุก OS

---

## 4. 🛠️ Troubleshooting Checklist (แนวทางการแก้บั๊ก)

ก่อนจะเริ่มแก้โค้ดมั่วๆ ให้เช็คตามลำดับนี้:
1.  **Version Check:** USER ใช้ `sw.js` เวอร์ชั่นล่าสุดหรือยัง? (ให้ Refresh)
2.  **Deployment Check:** USER ได้ Redeploy Google Script หรือยัง?
3.  **Type Check:** ID ที่ส่งไปกับที่รับมา เป็น Type เดียวกันไหม?
4.  **Syntax Check:** มีวงเล็บปีกกา `{ }` ครบไหม? (ตรวจสอบด้วยสายตาหรือ Tools ก่อนส่ง)

---

## 5. 🗣️ Communication Style (การสื่อสารกับ USER)

*   **Explain the "Why":** อย่าบอกแค่ให้กดปุ่ม อธิบายด้วยว่าทำไม (เช่น "ต้องกด Redeploy เดี๋ยวมันรันโค้ดเก่านะครับ")
*   **Status Indicators:** สอนให้ USER สังเกตสถานะ (เช่น "รอจนกว่าจะขึ้น ✅ Saved สีเขียว")
*   **Proactive Fix:** ถ้าเห็นฟังก์ชันไหนหายไป (เช่น `setTxType`) ให้เขียนขึ้นมาใหม่เลย อย่ารอถาม

---
*เอกสารนี้จะถูกอัปเดตเรื่อยๆ เมื่อเราเรียนรู้เทคนิคใหม่ๆ หรือเจอบั๊กที่น่าสนใจ*
