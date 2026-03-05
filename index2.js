const cron = require('node-cron');
const axios = require('axios');
const User = require('./models/User');
const mongoose = require('mongoose');
require("dotenv").config();

console.log('--- بدء الاتصال بقاعدة البيانات ---',process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => updateUsersDataTask())
  .catch((err) => console.log("فشل الاتصال:", "err"));

const updateUsersDataTask = async () => {
    
    try {
        console.log('--- بدء عملية التحديث المزدوجة ---');
        
        const users = await User.find({}, '_id phone reff'); // جلب أول 100 مستخدم فقط لتقليل الحمل
        // const users = new Array(100).fill(0).map((_, i) => ({ _id: `user${i + 1}` }))
        
        // [
        //     { _id: 'user1' },
        //     { _id: 'user2' },]
        const batchSize = 5; // قللت العدد لـ 5 لأن كل مستخدم سيفتح اتصالين (أي 10 طلبات متزامنة)
        const updates = [];

        for (let i = 0; i < users.length; i += batchSize) {
            const currentBatch = users.slice(i, i + batchSize);

            const batchPromises = currentBatch.map(async (user) => {
                try {
                    // تجهيز روابط الـ API (عدل الروابط حسب الحاجة)
                    const url1 = `https://donate.utq.org.sa/api/v1/orders/report/goals:ED4SFhUVFUcZGBsZHRgeTyEdIiQgHyIhJCMmJSgnKiksKy4tMC8yMQ?goal_creator=${user.phone}&ts=${1771534800}-${1772744400}`;

                    // تشغيل الطلبين معاً لنفس المستخدم لتوفير الوقت
                    const res1 = await axios.get(url1).catch(() => ({ data: { totals: { total: 0 } } }));


                    // جمع القيمتين (أو معالجتهما حسب منطق تطبيقك)
                    const finalTotal = (res1?.data?.totals?.total || 0)

                    return {
                        updateOne: {
                            filter: { _id: user._id },
                            update: { $set: { total: finalTotal } }
                        }
                    };
                } catch (error) {
                    console.error(`خطأ في معالجة المستخدم ${user._id}:`, error.message);
                    return null;
                }
            });

            const results = await Promise.all(batchPromises);
            updates.push(...results.filter(res => res !== null));
        }

        if (updates.length > 0) {
            const result = await User.bulkWrite(updates);
            console.log(updates[0].updateOne.update.$set,);
            // console.log(`تم تحديث ${result.modifiedCount} مستخدم (بناءً على طلبين لكل مستخدم).`);
        }

    } catch (error) {
        console.error('خطأ عام في مهمة الكرون:', error);
    }
};

// جدولة كل ساعة
// cron.schedule('0 * * * *', updateUsersDataTask);
// updateUsersDataTask();