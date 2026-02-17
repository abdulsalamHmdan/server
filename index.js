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

app.get("/test", async (req, res) => {
  const data = (
    await axios.get(
      "https://demo.disaq.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcYFxoaHEseTxwbHh0gHyIhJCMmJSgnKik",
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
  let dayData = await Day.findOne({ date: 1 });
  const object = Object.create(dayData);
  object["name"] = user.name;
  object["url"] = `https://donate.utq.org.sa/p/1/${user.reff}`;
  object["id"] = req.params.id;
  object["coupon"] = coupon;

  res.render("sfeer", object);
});

app.get("/dashboard", async (req, res) => {
  // let dayData = await Day.findOne({ date: 1 });
  // const data = (await axios.get("https://demo.disaq.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcYFxoaHEseTxwbHh0gHyIhJCMmJSgnKik")).data;

  res.render("dashboard");
});
app.get("/mgm3/:id", async (req, res) => {
  const today = new Date();
  // const ramadanDay = getRamadanDay(today);


  const data = (
    await axios.get(
      "https://demo.disaq.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcYFxoaHEseTxwbHh0gHyIhJCMmJSgnKik",
    )
  ).data;

  res.render("mgm3", {
    data: data.items.find((i) => i.pk == req.params.id),
    boxes: [],
    msthdfat: msthdfat[req.params.id],
    position:{day: 1, phase: 1}
  });
  // res.json( data.items.find(i => i.pk == req.params.id) );
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
  console.log(req.query.all == "yes");
  const boxes = [
    {
      sum: 1000,
      goal: 10000,
      name: "وقف علي المذن",
    },
  ];

  res.json(boxes);
});
app.get("/:id/rank", async (req, res) => {
  let user = await User.findById(req.params.id);
  const rank = { a: 1, b: 1, c: 1 };

  res.json(rank);
});

app.get("/:id/goals", async (req, res) => {
  let user = await User.findById(req.params.id);
  const goals = userGoals(user.phone, "");

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
      name: row.name,
      reff: row.reff,
      mgm3: row.mgm3,
      phone: row.phone,
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
        reason: reason,
      });
    }
  }

  // إرجاع النتيجة النهائية
  res.json({
    added,
    failed,
  });
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
  // date.setDate(date.getDate()-8); // Subtract one day

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
  const userGoalsData = await userGoals(user._id, "");
  if (userGoalsData.boxes >= 1 && userGoalsData.payment >= 1) {
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

function userGoals(id, day) {
  return { boxes: 1, payment: 1 };
}

// function getRamadanDay(date) {
//   // تحويل التاريخ المدخل إلى تنسيق هجري (أم القرى)
//   const options = { day: 'numeric', month: 'long', year: 'numeric', calendar: 'islamic-uma' };
//   const hijriDate = new Intl.DateTimeFormat('en-u-ca-islamic-uma-nu-latn', options).format(date);

//   // استخراج اليوم والشهر والسنة الهجرية من النص
//   const parts = hijriDate.split(' ');
//   const day = parseInt(parts[0]);
//   const month = parts[1];
//   const year = parseInt(parts[2]);

//   // التحقق إذا كانت السنة 1447هـ
//   if (year === 1447) {
//     if (month === 'Ramadan') {
//       return day;
//     } else if (month === 'Shaʻban') {
//       return 1; // قبل رمضان (شعبان وما قبله)
//     } else {
//       return 30; // بعد رمضان (شوال وما بعده)
//     }
//   }

//   // في حال كان التاريخ في سنوات أخرى
//   return year < 1447 ? 1 : 30;
// }
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`السيرفر يعمل على http://localhost:${PORT}`);
});
