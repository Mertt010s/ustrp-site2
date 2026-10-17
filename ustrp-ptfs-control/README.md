# USTRP PTFS Tactical Control

PTFS harita görseli üstünde manuel uçuş raporu, frekans bazlı sohbet ve Socket.IO ile canlı senkronizasyon arayüzü.

## Özellikler
- Verilen PTFS haritası (`public/ptfs-map.png`)
- Haritada nokta seçme, yakınlaştırma ve sürükleme
- Çağrı kodu, uçak tipi, irtifa, hız, yön ve ek bilgiyle manuel rapor
- Rapor kartına tıklayarak detayları görme
- 60 saniyelik yerel rapor zamanlayıcısı
- Ayrı frekanslarda sohbet odaları
- Frekansta yayın izni isteme arayüzü
- Socket.IO sunucusu ayrı Node.js hizmeti olarak çalışır

## Gerekenler
Node.js 20 veya üstü ve npm.

## Yerelde çalıştırma
Proje ana klasöründe:
```bash
npm install
npm install --prefix server
npm run server
```
İkinci terminalde proje ana klasöründe:
```bash
npm run dev
```
Vite terminalinde verilen yerel adresi tarayıcıda aç.

## Yayınlama sırası

### 1) Önce Socket.IO sunucusu
1. Projeyi GitHub'a yükle.
2. Render veya Railway'de yeni bir **Web Service** oluştur ve GitHub deposunu bağla.
3. Root Directory olarak `server` seç.
4. Build command: `npm install`
5. Start command: `npm start`
6. Deploy bitince verilen HTTPS adresini kopyala. Adres `/` yolunda JSON durum bilgisi döndürür.

Not: Ücretsiz hizmetler boşta kalınca uyuyabilir. İlk bağlantıda gecikme yaşanabilir. Üretim kullanımı için kalıcı/uyumlu bir Node hizmeti seç.

### 2) Sonra Vercel arayüzü
1. Vercel'de aynı GitHub deposunu import et.
2. Root Directory proje kökü olarak kalsın (server klasörünü seçme).
3. Framework preset: Vite.
4. Vercel > Settings > Environment Variables içine ekle:
   - Name: `VITE_SOCKET_URL`
   - Value: Socket sunucusunun HTTPS adresi (sonunda `/` olmasın)
5. Redeploy yap.

## Önemli sınırlamalar
- Bu sürüm prototiptir. Raporlar ve sohbetler sunucu belleğinde tutulur; sunucu yeniden başlarsa silinir. Kalıcı kayıt için veritabanı gerekir.
- Frekans izinleri şu anda istek kaydı olarak çalışır; yönetici onayı/rol sistemi henüz eklenmedi.
- Şu anda kullanıcı doğrulama ve moderasyon yoktur. Gerçek toplulukta kullanmadan önce kimlik doğrulama, rol/izin kontrolü, rate limit ve moderasyon eklenmelidir.
- Harita işaretleri görselin yüzde koordinatlarını kullanır; oyun içi gerçek dünya koordinatı değildir.
- 60 saniye sayacı tarayıcı sekmesinde yerel çalışır, kullanıcılar arasında senkronize değildir.
- `vercel.json` tek sayfalı arayüz yönlendirmesini sağlar; Socket.IO sunucusu Vercel serverless üzerinde değil, ayrı Node hizmetinde çalışır.
