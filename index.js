const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// إعدادات العطاقات الثابتة
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ميدلويرز
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("تم الاتصال بقاعدة البيانات بنجاح!"))
  .catch((err) => console.log("فشل الاتصال:", err));

// المسارات الأساسية
app.get('/', (req, res) => {
  res.render('index', { title: 'الصفحة الرئيسية' });
});

// معالج الأخطاء 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'صفحة غير موجودة' });
});

// بدء السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر يعمل على http://localhost:${PORT}`);
});
