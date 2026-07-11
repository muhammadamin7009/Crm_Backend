# Crm_Backend

## Demo ma'lumotlari

Demo skript tanlangan korxonaga 3 mijoz, 4 ishchi, 2 mahsulot, 2 homashyo xaridi,
bir haftalik ish natijalari va oylik to'lovlarini qo'shadi. Skript qayta ishga
tushirilganda demo operatsiyalarini takrorlamaydi.

```powershell
$env:DEMO_COMPANY_SLUG="zerrshoes"
$env:DEMO_PASSWORD="TaqdimotUchunKuchliParol"
npm.cmd run demo
```

`DEMO_PASSWORD` berilmasa `Demo123!` ishlatiladi. Uni faqat lokal taqdimot uchun
ishlating va taqdimotdan keyin almashtiring.

## Permission presetlar

Mavjud shablonlar: `sales_admin`, `production_admin`, `accountant`,
`materials_admin`.

- `GET /permissions/presets` — shablonlar ro'yxati.
- `PUT /permissions/users/:id/preset` — `{ "preset_key": "sales_admin" }`.
- `POST /users/admin` da admin yaratayotganda ixtiyoriy
  `permission_preset` maydonini yuborish mumkin.
