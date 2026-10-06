const CACHE_NAME = 'shopledger-cache-v1';

// قائمة الملفات والمكتبات التي سيتم حفظها محلياً في الهاتف
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// مرحلة التثبيت: تحميل الملفات وحفظها في الكاش فوراً
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// مرحلة التفعيل: مسح أي كاش قديم لتحديث النسخة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// مرحلة الاستجابة: جلب الملف من الكاش إذا كان النت منقطعاً
self.addEventListener('fetch', (event) => {
  // استثناء طلبات قواعد بيانات Firebase السحابية لكي لا تتعارض مع المزامنة
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // إذا وجد الملف في ذاكرة الهاتف يقدمه فوراً وبسرعة فائقة
        return cachedResponse;
      }
      // إذا لم يكن موجوداً يجلبه من شبكة الإنترنت ويحفظ نسخة منه
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // إذا كان بدون إنترنت وطلب الصفحة الرئيسية
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
