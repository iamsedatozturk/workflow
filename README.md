# İş Akışı Uygulaması

ASP.NET Core Minimal API backend ve kullanıcının verdiği `sozsoft-platform-ui`
`package.json` yapısına uygun React + Vite frontend ile hazırlanmış örnek iş
akışı uygulamasıdır. Yeni paket/eklenti eklenmemiştir.

## Çalıştırma

Backend:

```powershell
dotnet run --urls http://localhost:5079
```

Frontend:

```powershell
npm install
npm run start
```

Frontend varsayılan olarak `http://localhost:5173` üzerinden açılır ve `/api`
isteklerini backend'e yönlendirir.

## Veri Modeli

Backend verileri `data/workflow-db.json` dosyasında iki tablo mantığıyla tutulur:

- `workflowItems`: `Id`, `Sorumlu`, `Tarih`, `Durum` ve akışın çalışması için gerekli ek alanlar.
- `criteria`: kriter, buton/adım ve ok bağlantılarını tutan akış tanımı.

Örnek kriter: `Tutar > 5000 TL`. Bu koşul doğruysa onay adımına, yanlışsa bilgilendirme ya da bitiş adımına yönlenebilir.
