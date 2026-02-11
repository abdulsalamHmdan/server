const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// إعدادات العطاقات الثابتة
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
app.get("/", (req, res) => {
  const dayGoals = [
    {
      goal: "افتح ١٠ صناديق فعّالة",
      label: "لتفعيل الصندوق يجب اجراء عملية تبرع",
    },
    {
      goal: "حقق ٢٬٠٠٠ ريال",
      label: "(اجمالي قيمة التبرعات)",
    },
    {
      goal: "شارك رسالة اليوم في 5 جهات",
      label: "نشر في وسائل التواصل الاجتماعي",
    },
  ];
  const data = {
    title: "الصفحة الرئيسية",
    boxGoal: 10,
    payGoal: 2000,
    achievedBox: 0,
    achievedPay: 0,
    dayGoals,
    img: "img/a.png",
    text: "مساء الخير 🌿\n\nقد يَغيب عنك أثرك مع مرور الوقت، لكن أثره لا يغيب؛ فكل ريال يُصرف في تحفيظ القرآن يبقى أجره ممتدًا ومتناميًا.\n\nتبرع الآن عبر هذا الرابط الخاص: https://capable-lollipop-4fa68c.netlify.app/s/83923?ref=AHM-83923\n\nجزاك الله خيرًا ✨",
  };
  res.render("sfeer", data);
});

app.get("/boxes",(req,res)=>{
  res.json([]);
})

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
