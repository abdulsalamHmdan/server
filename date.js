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

