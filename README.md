# موقع الأرشيف (Node.js + Express + MySQL)

## التشغيل
1. أنشئ قاعدة البيانات: `mysql -u root -p < schema.sql` (أو استورد schema.sql من phpMyAdmin)
2. `npm install`
3. `npm start` ثم افتح http://localhost:3000

متغيرات البيئة (اختيارية): `DB_HOST` `DB_USER` `DB_PASS` `DB_NAME` `PORT`

## الهيكل
- `server.js`: الخادم وواجهات API (رفع، عرض، بحث، تنزيل، حذف)
- `schema.sql`: ملف بناء قاعدة البيانات
- `public/index.html`: الواجهة
- `uploads/`: الملفات المؤرشفة، مرتبة سنة/تاريخ

## الأمان
- Prepared Statements (منع SQL Injection)
- تنظيف المدخلات وتهريب النصوص في الواجهة (منع XSS)
- أنواع ملفات محددة وحد أقصى 25 ميجا وأسماء تخزين عشوائية
