const msthdfat = require("./msthdfat.json");
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const User = require("./models/User");
const Coupon = require("./models/coupon");
const Day = require("./models/Day");
const Notifid = require("./models/notifid");
const { name } = require("ejs");
const e = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "100mb" }));
const cache = require("memory-cache");
// دالة الوسيط (Middleware) الخاصة بالكاش
let cacheM = (duration) => {
  return (req, res, next) => {
    let key = "__express__" + (req.originalUrl || req.url);
    let cachedBody = cache.get(key);

    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        cache.put(key, body, duration * 1000); // المدة بالثواني
        res.sendResponse(body);
      };
      next();
    }
  };
};
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("تم الاتصال بقاعدة البيانات بنجاح!"))
  .catch((err) => console.log("فشل الاتصال:", "err"));

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { Console } = require("console");
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "my_app_uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const upload = multer({ storage: storage });

app.get("/dashboardData", cacheM(60), async (req, res) => {
  const data = (
    await axios.get(
      "https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ",
    )
  ).data;
  let page = 1;
  let cond = data.hasMore == true;
  while (cond) {
    const newData = (
      await axios.get(
        `https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?page=${page}`,
      )
    ).data;
    data.items.push(...newData.items);
    cond = newData.hasMore == true;
    page++;
  }
  res.json(data.items);
});

app.get("/:id/sfeer", async (req, res) => {
  const date = dates();
  const user = await User.findById(req.params.id);
  if (!user) {
    res.send("لا يوجد سفير بهذا الرقم");
    return;
  }
  const coupon = await Coupon.findOne({
    user: user,
    status: 1,
    ExchangeDate: {
      $eq: date.date,
    },
  });
  let dayData = await Day.findOne({ date: date.rd });
  const object = Object.create(
    dayData || {
      img: "",
      text: "بانتظار اضافة مستهدفات اليوم",
      boxGoal: 10,
      payGoal: 990,
      goals: [],
    },
  );
  object["name"] = user.name;
  object["url"] = `https://donate.utq.org.sa/p/1/${user.reff}`;
  object["id"] = req.params.id;
  object["coupon"] = coupon;
  res.render("sfeer", object);
});
app.get("/:id/profile", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.send("لا يوجد سفير بهذا الرقم");
    return;
  }
  res.render("sfeerEdite", { user });
});
app.post("/:id/profile", async (req, res) => {
  const { field, value } = req.body;
  await User.findByIdAndUpdate(req.params.id, { [field]: value })
    .then((u) => {})
    .catch((e) => {
      if (e.kind === "ObjectId") {
        res.json({ error: "لا يوجد سفير بهذا الرقم", success: false });
      } else if (e.code === 11000) {
        res.json({ error: "هذا المستخدم بالفعل مسجل", success: false });
      } else {
        res.json({ error: "المدخل غير صحيح", success: false });
      }
      return;
    });

  res.json({ error: null, success: true });
});
app.get("/dashboard/:id/addusers", async (req, res) => {
  res.render("addNew.ejs");
});
app.post("/dashboard/:id/addusers", async (req, res) => {
  const { name, phone } = req.body;
  const user = new User({ name, phone, reff: phone, mgm3: req.params.id });
  await user
    .save()
    .then(() => {
      res.json({ error: null, success: true });
    })
    .catch((e) => {
      if (e.code === 11000) {
        res.json({ error: "هذا المستخدم بالفعل مسجل", success: false });
        return;
      } else {
        console.error(e);
        res.json({ error: "المدخل غير صحيح", success: false });
        return;
      }
    });
});

app.get("/dashboard", async (req, res) => {
  res.render("dashboard");
});

app.get("/dashboard/:id", cacheM(5), async (req, res) => {
  const date = dates();
  const users = await User.find({ mgm3: req.params.id }, "name");
  const msthdfatM = msthdfat.find((i) => i.pk == req.params.id);
  let page = 1;
  const data = (
    await axios.get(
      "https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ",
    )
  ).data;
  let cond = data.hasMore == true;
  while (cond) {
    const newData = (
      await axios.get(
        `https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?page=${page}`,
      )
    ).data;
    data.items.push(...newData.items);
    cond = newData.hasMore == true;
    page++;
  }
  const boxes = (
    await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?type=${msthdfatM?.bk}`,
    )
  ).data;
  res.render("mgm3", {
    data: data.items.find((i) => i.pk == req.params.id),
    boxes: boxes.items || [],
    bx: msthdfatM ? msthdfatM[`b${date.rd}`] : 0,
    gx: msthdfatM ? msthdfatM[`g${date.rd}`] : 0,
    phaseTarget: msthdfatM?.phaseTarget1,
    bigTarget: msthdfatM?.bigTarget,
    sfeer: users,
    // position: { day: date.rd, phase: 1 },
  });
});

app.get("/dashboard/:id/today", cacheM(5), async (req, res) => {
  const date = dates();
  const msthdfatM = msthdfat.find((i) => i.pk == req.params.id);
  const data = (
    await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?ts=${date.fd}-${date.td}`,
    )
  ).data;

  let page = 1;
  let cond = data.hasMore == true;
  while (cond) {
    const newData = (
      await axios.get(
        `https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?page=${page}&ts=${date.fd}-${date.td}`,
      )
    ).data;
    data.items.push(...newData.items);
    cond = newData.hasMore == true;
    page++;
  }

  const boxes = (
    await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?type=${msthdfatM?.bk}&ts=${date.fd}-${date.td}`,
    )
  ).data;
  res.json({
    data: data.items.find((i) => i.pk == req.params.id) || 0,
    boxes: boxes.items || [],
  });
});
app.get("/dashbox/:id", cacheM(5), async (req, res) => {
  const date = dates();
  const boxes = (
    await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?type=${req.params.id}`,
    )
  ).data;
  res.json(boxes.items || []);
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
    const boxes = await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}`,
    );
    res.json(boxes.data.items || []);
  } else {
    const date = dates();
    const boxes = await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}&ts=${date.fd}-${date.td}`,
    );
    res.json(boxes.data.items || []);
  }
});

app.get("/:id/rank", async (req, res) => {
  let me = await User.findById(req.params.id);
  let user = await User.find({}, "name mgm3").sort({ total: -1 });
  const pks = user.map((u) => u.mgm3);
  let data = (
    await axios.get(
      "https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ",
    )
  ).data;
  data = data.items;
  const rankIndex =
    data.filter((i) => pks.includes(i.pk)).findIndex((i) => i.pk == me.mgm3) +
    1;
  const rank = {
    a: user.findIndex((u) => u._id == req.params.id) + 1,
    b:
      user
        .filter((x) => x.mgm3 == me.mgm3)
        .findIndex((u) => u._id == req.params.id) + 1,
    c: rankIndex || "-",
  };
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

// POST: حفظ البيانات مع معالجة الصورة
// لاحظ استخدام upload.single('imgFile')
app.post("/save", (req, res) => {
  // نقلنا دالة الرفع لداخل المسار عشان نقدر نمسك أخطاء Cloudinary
  upload.single("imgFile")(req, res, async (uploadError) => {
    // 1. التحقق من وجود خطأ في الرفع للسحابة
    if (uploadError) {
      console.error("❌ خطأ من الكلاوديناري:", uploadError);
      return res
        .status(500)
        .send("فشل رفع الصورة للسحابة: " + uploadError.message);
    }

    // console.log("الملف المرفوع:", req.file);
    // console.log("البيانات النصية:", req.body);

    // 2. إذا نجح الرفع، نكمل حفظ البيانات في قاعدة البيانات
    try {
      const { date, text, boxGoal, payGoal, goal, label, currentImg } =
        req.body;

      let goalsArray = [];
      if (Array.isArray(goal)) {
        goalsArray = goal.map((g, i) => ({ goal: g, label: label[i] }));
      } else if (goal) {
        goalsArray = [{ goal, label }];
      }

      let finalImg = currentImg;
      if (req.file) {
        finalImg = req.file.path; // هذا هو رابط الصورة من Cloudinary
      }

      await Day.findOneAndUpdate(
        { date: date },
        {
          text,
          boxGoal,
          payGoal,
          goals: goalsArray,
          img: finalImg,
        },
        { upsert: true, new: true },
      );

      // res.send("تم الحفظ بنجاح!");
      res.redirect(`/days`);
    } catch (dbError) {
      console.error("❌ خطأ في قاعدة البيانات:", dbError);
      res.status(500).send("حدث خطأ أثناء الحفظ في قاعدة البيانات.");
    }
  });
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
      added: addedUsers.map((u) => ({
        name: u.name,
        reff: u.reff,
        phone: u.phone,
        url1: u.url1,
        url2: u.url2,
      })),
      failed: [],
    });
  } catch (error) {
    const added = [];
    const failed = [];

    // 1. استخراج السجلات التي نجحت
    if (error.insertedDocs) {
      added.push(
        ...error.insertedDocs.map((u) => ({
          name: u.name,
          reff: u.reff,
          phone: u.phone,
          url1: u.url1,
          url2: u.url2,
        })),
      );
    }

    // 2. استخراج السجلات التي فشلت
    if (error.writeErrors && Array.isArray(error.writeErrors)) {
      error.writeErrors.forEach((err) => {
        failed.push({
          // في Mongoose، البيانات الفاشلة موجودة في err.op
          data: err.op,
          reason: err.errmsg || "خطأ في البيانات",
          index: err.index, // ترتيب العنصر في المصفوفة الأصلية
        });
      });
    } else if (!error.insertedDocs) {
      // إذا كان الخطأ ليس له علاقة بالـ Bulk Write (مثل خطأ اتصال بقاعدة البيانات)
      return res.status(500).json({ error: error.message });
    }

    res.json({
      added,
      failed,
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
  const date = dates();
  const dayg = await Day.findOne({ date: date.rd });
  const userId = req.params.id;
  let user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }
  const coupon = await Coupon.findOne({
    user: user._id,
    status: 1,
    ExchangeDate: {
      $eq: date.date,
    },
  });
  if (coupon) {
    res.json({
      valid: true,
      coupon: coupon,
    });
    return;
  }
  const userGoalsData = await userGoals(user._id);
  if (
    userGoalsData.boxes >= dayg.payGoal &&
    userGoalsData.payment >= dayg.payGoal
  ) {
    const newCoupon = await Coupon.findOneAndUpdate(
      { status: 0 },
      {
        user: user._id,
        status: 1,
        ExchangeDate: date.date,
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
    // console.log(
    //   userGoalsData.boxes,
    //   dayg.payGoal,
    //   userGoalsData.payment,
    //   dayg.payGoal,
    // );
    // console.log(
    //   userGoalsData.boxes >= dayg.payGoal,
    //   userGoalsData.payment >= dayg.payGoal,
    // );

    res.json({ valid: false, message: "لم تحقق الأهداف بعد" });
  }
});
// Add headers before the routes are defined

app.get("/api/share", async (req, res) => {
  const date = dates();
  const dayData = await Day.findOne({ date: date.rd });
  res.json({
    image: dayData?.img || "",
    link: "aa",
    message: dayData?.text || "بانتظار اضافة مستهدفات اليوم",
  });
});

app.get("/api/gl", async (req, res) => {
  const phone = req.query.phone;
  const date = dates();
  const dayData = await Day.findOne({ date: date.rd });
  const boxes = (
    await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?ts=${date.fd}-${date.td}&goal_creator=${phone}`,
    )
  ).data;
  res.json({
    boxesGoal: dayData?.boxGoal || 10,
    amountGoal: dayData?.payGoal || 990,
    boxesAchieved: boxes?.items?.length || 0,
    amountAchieved: boxes?.totals?.total || 0,
  });
});
app.get("/api/rn", async (req, res) => {
  const id = req.query.id;
  let me = await User.findById(id);
  let user = await User.find({}, "name mgm3").sort({ total: -1 });
  const pks = user.map((u) => u.mgm3);
  let data = (
    await axios.get(
      "https://donate.utq.org.sa/api/v1/orders/report/prod_id:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ",
    )
  ).data;

  data = data.items;
  const rankIndex =
    data.filter((i) => pks.includes(i.pk)).findIndex((i) => i.pk == me.mgm3) +
    1;
  const rank = {
    a: user.findIndex((u) => u._id == id) + 1,
    b: user.filter((x) => x.mgm3 == me.mgm3).findIndex((u) => u._id == id) + 1,
    c: rankIndex || "-",
  };
  res.json(rank);
});

app.get("/:id/bx", async (req, res) => {
  let user = await User.findById(req.query.id);
  if (req.query.filter == "all") {
    const boxes = await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}`,
    );
    res.json(boxes.data.items || []);
  } else {
    const date = dates();
    const boxes = await axios.get(
      `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}&ts=${date.fd}-${date.td}`,
    );
    res.json(boxes.data.items || []);
  }
});

app.get("/api/login", async (req, res) => {
  try {
    const { key } = req.query;
    const user = await User.findById(key);
    res.json({ success: true, id: user });
  } catch (error) {
    res.json({ success: false, error: error });
  }
});

app.get("/api/savekey/:key", async (req, res) => {
  try {
    const { key } = req.params;
    // console.log("Received key:", key);
    const notifid = new Notifid({ key: key });
    await notifid.save();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error });
  }
});
app.get("/api/notifids", async (req, res) => {
  try {
    const date = dates();
    const dayData = await Day.findOne({ date: date.rd });
    const notifids = (await Notifid.find({})).map((n) => n.key);
    await axios
      .post("https://exp.host/--/api/v2/push/send", {
        to: notifids,
        title: "رسالة اليوم",
        body: dayData.text || "صباح الخير! تحقق من أهداف اليوم.",
      })
      .then((response) => {
        res.json({ success: true });
      })
      .catch((e) => {
        console.error(
          "Error sending test notification:",
          e.response?.data || e,
        );
        res.json({ success: false, error: e });
      });
  } catch (error) {
    console.error("Error fetching notifids:", error);
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

  const goals = await axios.get(
    `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}&ts=${date.fd}-${date.td}`,
  );
  if (goals.data.success !== true) {
    return { boxes: 0, payment: 0 };
  }
  return { boxes: goals.data.items.length, payment: goals.data.totals.total };
}

function dates() {
  const date = new Date();
  date.setHours(date.getHours() - 7); // Adjust for timezone if needed
  const fd =
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).setHours(7) /
    1000;
  const td =
    +new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).setHours(
      7,
    ) / 1000;
  return {
    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    fd,
    td,
    rd: getRamadanDay(date),
  };
}
function getRamadanDay(date) {
  // بداية ونهاية رمضان 1447هـ بالميلادي
  const startRamadan = new Date("2026-02-18T00:00:00");
  const endRamadan = new Date("2026-03-19T23:59:59");

  // تصفير الوقت للمقارنة بين الأيام فقط
  const inputDate = new Date(date.setHours(0, 0, 0, 0));
  const startCompare = new Date(startRamadan.setHours(0, 0, 0, 0));

  if (inputDate < startCompare) {
    return 1; // قبل رمضان
  }

  if (inputDate > endRamadan) {
    return 30; // بعد رمضان
  }

  const diffTime = Math.abs(inputDate - startCompare);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`السيرفر يعمل على http://localhost:${PORT}`);
});
