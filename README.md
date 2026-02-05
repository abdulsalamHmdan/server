# Express Server with MongoDB & EJS

سيرفر Express كامل مع قاعدة بيانات MongoDB و محرك قوالب EJS

## المتطلبات

- Node.js (v14 أو أحدث)
- MongoDB (محلي أو سحابي)
- npm

## التثبيت

```bash
npm install
```

## البدء

### في بيئة التطوير (مع Nodemon):
```bash
npm run dev
```

### في بيئة الإنتاج:
```bash
npm start
```

السيرفر سيعمل على: `http://localhost:3000`

## الهيكل

```
├── server.js          # ملف السيرفر الرئيسي
├── package.json       # ملف الحزم
├── .env              # متغيرات البيئة
├── views/            # قوالب EJS
│   ├── index.ejs     # الصفحة الرئيسية
│   └── 404.ejs       # صفحة الخطأ
├── public/           # الملفات الثابتة
├── models/           # نماذج Mongoose
└── routes/           # المسارات
```

## المتغيرات البيئية

أضف ملف `.env` مع:
```
MONGODB_URI=mongodb://localhost:27017/myapp
PORT=3000
NODE_ENV=development
```

## التكنولوجيا المستخدمة

- **Express.js** - إطار عمل ويب
- **MongoDB** - قاعدة بيانات NoSQL
- **Mongoose** - ODM لـ MongoDB
- **EJS** - محرك قوالب
- **Nodemon** - أداة إعادة تحميل تلقائية (تطوير)

## الترخيص

ISC
