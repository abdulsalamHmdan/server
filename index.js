const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const Coupon = require("./models/coupon");
const Day = require("./models/Day"); // المسار لملف الموديل
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ميدلويرز
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("تم الاتصال بقاعدة البيانات بنجاح!"))
  .catch((err) => console.log("فشل الاتصال:", err));

// المسارات الأساسية
app.get("/sfeer", async (req, res) => {
  let dayData = await Day.findOne({ date: 1 });
  const object = Object.create(dayData);
  object["name"] = "علي المذن";
  object["url"] = "https://donate.utq.org.sa/";
  res.render("sfeer", object);
});

app.get("/boxes", (req, res) => {
  res.json([]);
});

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/days", (req, res) => {
  res.render("days");
});

app.get("/admin/:dayId", async (req, res) => {
  const dayId = req.params.dayId;
  let dayData = await Day.findOne({ date: dayId });

  // إذا لم توجد بيانات، نرسل كائن فارغ للـ EJS
  if (!dayData) {
    dayData = {
      date: dayId,
      img: "",
      text: "",
      boxGoal: 0,
      payGoal: 0,
      goals: [],
    };
  }
  res.render("admin", { data: dayData });
});

// حفظ أو تحديث البيانات
app.post("/save", async (req, res) => {
  const { date, img, text, boxGoal, payGoal, goal, label } = req.body;

  // تجميع المصفوفة من المدخلات
  const goalsArray = Array.isArray(goal)
    ? goal.map((g, i) => ({ goal: g, label: label[i] }))
    : [{ goal, label }];

  await Day.findOneAndUpdate(
    { date: date },
    { img, text, boxGoal, payGoal, goals: goalsArray },
    { upsert: true, new: true },
  );

  res.redirect(`/admin/${date}?success=true`);
});

app.get("/coupons/add", (req, res) => {
  res.render("add-coupons");
});

// 2. استقبال البيانات JSON وحفظها
app.post("/coupons/save-bulk", async (req, res) => {
  const couponsData = req.body; // عبارة عن مصفوفة جايتنا من المتصفح
  let added = [];
  let failed = [];
  for (const item of couponsData) {
    // التحقق البسيط
    if (!item.code || !item.from) {
      failed.push({ ...item, reason: "بيانات ناقصة" });
      continue;
    }

    try {
      await Coupon.create({
        code: String(item.code),
        from: String(item.from),
        status: 0,
      });
      added.push(item);
    } catch (err) {
      if (err.code === 11000) {
        failed.push({ ...item, reason: "مكرر" });
      } else {
        failed.push({ ...item, reason: "خطأ في النظام" });
      }
    }
  }

  res.json({ added, failed });
});

// معالج الأخطاء 404
app.use((req, res) => {
  res.status(404).render("404", { title: "صفحة غير موجودة" });
});

// اتصالات Socket.io
// io.on("connection", (socket) => {
//   // console.log('مستخدم جديد متصل:', socket.id);
//   socket.emit("message", { from: socket.id, message: "مرحبًا من السيرفر!" });

//   // استقبال الرسائل
//   socket.on("message", (data) => {
//     console.log("رسالة مستقبلة:", data);
//     io.emit("message", { from: socket.id, message: data });
//   });

//   // قطع الاتصال
//   socket.on("disconnect", () => {
//     console.log("مستخدم قطع الاتصال:", socket.id);
//   });
// });

// بدء السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر يعمل على http://localhost:${PORT}`);
});
