const msthdfat = require("./msthdfat.json");
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
const e = require("express");
const axios = require("axios");
const XLSX = require('xlsx');
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("تم الاتصال بقاعدة البيانات بنجاح!"))
  .catch((err) => console.log("فشل الاتصال:", err));

app.get("/test", async (req, res) => {
  const data = (
    await axios.get(
      "https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ",
    )
  ).data;
  res.json(data.items);
});

app.get("/:id/sfeer", async (req, res) => {
  const date = new Date();
  const user = await User.findById(req.params.id);
  if (!user) {
    res.send("لا يوجد سفير بهذا الرقم");
    return;
  }
  const coupon = await Coupon.findOne({
    user: user,
    status: 1,
    ExchangeDate: {
      $eq: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    },
  });
  let dayData = await Day.findOne({ date: getRamadanDay(date) });
  const object = Object.create(dayData);
  object["name"] = user.name;
  object["url"] = `https://donate.utq.org.sa/p/1/${user.reff}`;
  object["id"] = req.params.id;
  object["coupon"] = coupon;
  res.render("sfeer", object);
});

app.get("/dashboard", async (req, res) => {
  res.render("dashboard");
});


app.get("/dashboard/:id", async (req, res) => {
  const date = dates();
  const data = (
    await axios.get(
      "https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ",
    )
  ).data;
    const boxes = (
    await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?type=${req.params.id}`,
    )
  ).data;

  res.render("mgm3", {
    data: data.items.find((i) => i.pk == req.params.id),
    boxes: boxes.items || [],
    msthdfat: msthdfat[req.params.id],
    position: { day: date.rd, phase: 1 }
  });
});


app.get("/:id/mycoupons", async (req, res) => {
  const coupons = await Coupon.find({
    user: req.params.id,
    status: 1,
  }).populate("user");
  res.render("mycoupons", { coupons });
  // res.json(coupons );
});

app.get("/:id/boxes", async (req, res) => {
  let user = await User.findById(req.params.id);
  if (req.query.all == "yes") {
    const boxes = await axios.get(`https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}`,
    );
    res.json(boxes.data.items || []);
  }else {
    const date = dates()
    const boxes = await axios.get(`https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}&ts=${date.fd}-${date.td}`,
    );
    res.json(boxes.data.items || []);
  }
});
app.get("/:id/rank", async (req, res) => {
  let user = await User.findById(req.params.id);
  const rank = { a: 1, b: 1, c: 1 };

  res.json(rank);
});

app.get("/:id/goals", async (req, res) => {
  const goals = await userGoals(req.params.id);

  res.json(goals);
});

app.get("/", (req, res) => {
  res.render("index", { id: req.params.id });
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

app.get("/safer/add", (req, res) => {
  res.render("addUser");
});

app.post("/users/add-bulk", async (req, res) => {
  const usersData = req.body;

  if (!Array.isArray(usersData)) {
    return res.status(400).json({ error: "يجب إرسال البيانات كمصفوفة" });
  }

  try {
    const addedUsers = await User.insertMany(usersData, { ordered: false });

    res.json({
      added: addedUsers.map(u => ({
        name: u.name,
        reff: u.reff,
        phone: u.phone,
        url1: u.url1,
        url2: u.url2,
      })),
      failed: []
    });

  } catch (error) {
    const added = [];
    const failed = [];

    // 1. استخراج السجلات التي نجحت
    if (error.insertedDocs) {
      added.push(...error.insertedDocs.map(u => ({
        name: u.name,
        reff: u.reff,
        phone: u.phone,
        url1: u.url1,
        url2: u.url2,
      })));
    }

    // 2. استخراج السجلات التي فشلت
    if (error.writeErrors && Array.isArray(error.writeErrors)) {
      error.writeErrors.forEach(err => {
        failed.push({
          // في Mongoose، البيانات الفاشلة موجودة في err.op
          data: err.op, 
          reason: err.errmsg || "خطأ في البيانات",
          index: err.index // ترتيب العنصر في المصفوفة الأصلية
        });
      });
    } else if (!error.insertedDocs) {
      // إذا كان الخطأ ليس له علاقة بالـ Bulk Write (مثل خطأ اتصال بقاعدة البيانات)
      return res.status(500).json({ error: error.message });
    }

    res.json({
      added,
      failed
    });
  }
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
    if (!item.code || !item.from || !item.value) {
      failed.push({ ...item, reason: "بيانات ناقصة" });
      continue;
    }

    try {
      await Coupon.create({
        code: String(item.code),
        from: String(item.from),
        value: String(item.value),
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

/*============================== */
// APIS
/*============================== */

app.get("/:id/giveCoupon", async (req, res) => {
  const date = new Date();
  const dayg = Day.findOne({ date: getRamadanDay(date) });
  const userId = req.params.id;
  let user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }
  const coupon = await Coupon.findOne({
    user: user._id,
    status: 1,
    ExchangeDate: {
      $eq: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    },
  });
  if (coupon) {
    console.log("user");
    res.json({
      valid: true,
      coupon: coupon,
    });
    return;
  }
  const userGoalsData = await userGoals(user._id);
  if (userGoalsData.boxes >= dayg.payGoal && userGoalsData.payment >= dayg.payGoal) {
    const newCoupon = await Coupon.findOneAndUpdate(
      { status: 0 },
      {
        user: user._id,
        status: 1,
        ExchangeDate: new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ),
      },
    );
    if (newCoupon) {
      res.json({
        valid: true,
        coupon: newCoupon,
      });
    } else {
      res.json({ valid: false, message: "لا يوجد كوبونات متاحة" });
    }
  } else {
    res.json({ valid: false, message: "لم تحقق الأهداف بعد" });
  }
});

// معالج الأخطاء 404
app.use((req, res) => {
  res.status(404).render("404", { title: "صفحة غير موجودة" });
});

async function userGoals(id) {
  const date = dates();
  const user = await User.findById(id);
  if (!user) {
    return { boxes: 0, payment: 0 };
  }

  const goals = await axios.get(`https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}&ts=${date.fd}-${date.td}`);
  if (goals.data.success !== true) {
    return { boxes: 0, payment: 0 };
  }
  return { boxes: goals.data.items.length, payment: goals.data.totals.total };
}
userGoals("6995c7e7c8c710cb83a3389e").then(console.log).catch(console.error);

function dates() {
    const date = new Date();
    date.setHours(date.getHours() - 7); // Adjust for timezone if needed
    const fd = (new Date(date.getFullYear(), date.getMonth(), date.getDate()).setHours(7))/1000;
    const td = +(new Date(date.getFullYear(), date.getMonth(), date.getDate()+1).setHours(7))/1000;
    return { date :new Date(date.getFullYear(), date.getMonth(), date.getDate()),fd, td,rd:getRamadanDay(date) };
}
function getRamadanDay(date) {
  // بداية ونهاية رمضان 1447هـ بالميلادي
  const startRamadan = new Date('2026-02-18T00:00:00');
  const endRamadan = new Date('2026-03-19T23:59:59');

  // تصفير الوقت للمقارنة بين الأيام فقط
  const inputDate = new Date(date.setHours(0, 0, 0, 0));
  const startCompare = new Date(startRamadan.setHours(0, 0, 0, 0));

  if (inputDate < startCompare) {
    return 1; // قبل رمضان
  }

  if (inputDate > endRamadan) {
    return 30; // بعد رمضان
  }

  // حساب الفرق بالأيام (1000ms * 60s * 60m * 24h)
  const diffTime = Math.abs(inputDate - startCompare);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`السيرفر يعمل على http://localhost:${PORT}`);
});
