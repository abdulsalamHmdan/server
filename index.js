const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const User = require("./models/User");
const Coupon = require("./models/coupon");
const Day = require("./models/Day");
const { name } = require("ejs");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
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
  res.json([{
    sum:1000,
    goal:10000,
    name:"وقف علي المذن",
  }]);
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

app.post("/save", async (req, res) => {
  const { date, img, text, boxGoal, payGoal, goal, label } = req.body;

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

app.get("/safer/add",(req,res)=>{
  res.render("addUser")
})

app.post('/users/add-bulk', async (req, res) => {
  const usersData = req.body; // نتوقع مصفوفة من الكائنات
  // التحقق من أن البيانات عبارة عن مصفوفة
  if (!Array.isArray(usersData)) {
    return res.status(400).json({ error: "يجب إرسال البيانات كمصفوفة" });
  }
  const added = [];
  const failed = [];
  for (const row of usersData) {
    // ملاحظة: قد تأتي أسماء الأعمدة من الإكسل بأحرف كبيرة أو مسافات، يفضل تنظيفها هنا
    const userData = {
      name: row.name || row.Name || row['الاسم'],
      reff: row.reff || row.Reff || row['كود الاحالة'],
      mgm3: row.mgm3 || row.Mgm3 || row['mgm3'],
      phone: row.phone || row.Phone || row['الجوال'],
    };
    try {
        // التحقق من الحقول الإجبارية قبل محاولة الحفظ
        if (!userData.name || !userData.reff || !userData.phone) {
            throw new Error("بيانات ناقصة (الاسم، الهاتف، أو reff)");
        }

        // محاولة إنشاء المستخدم
        const newUser = await User.create(userData);
        
        // إذا نجح الحفظ
        added.push(newUser);

    } catch (error) {
        // تحديد سبب الفشل
        let reason = "خطأ غير معروف";
        if (error.code === 11000) {
            // خطأ التكرار (Duplicate Key)
            if (error.keyPattern.phone) reason = "رقم الهاتف مكرر";
            else if (error.keyPattern.reff) reason = "reff مكرر";
            else if (error.keyPattern.mgm3) reason = "mgm3 مكرر";
            else reason = "بيانات مكررة";
        } else {
            reason = error.message;
        }

        // إضافة للفشل مع الاحتفاظ بالبيانات المرسلة لعرضها
        failed.push({
            ...userData,
            reason: reason
        });
    }
  }

  // إرجاع النتيجة النهائية
  res.json({
    added,
    failed
  });
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

app.post("/coupons/link", async (req, res) => {
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
