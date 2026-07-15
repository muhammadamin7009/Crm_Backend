# Crm_Backend

## Google Authenticator MFA

Super administrator kirishida Google Authenticator TOTP ishlatiladi. Secretlar bazada
ochiq saqlanmaydi; ularni shifrlash uchun production serverda o'zgarmaydigan 32 baytli
base64 kalit bo'lishi shart:

```env
MFA_ENCRYPTION_KEY=
```

Kalitni yaratish (Linux serverda):

```bash
openssl rand -base64 32
```

Kalit yo'qolsa mavjud Authenticator ulanishlarini o'qib bo'lmaydi. Uni parol menejerida
xavfsiz nusxalang. Birinchi kirishda QR-kod va bir martalik tiklash kodlari beriladi.
Platform boshqaruvchisi yo'qolgan telefon holatida korxona boshqaruv oynasidan
Authenticator'ni qayta sozlashi mumkin.

## SMS ogohlantirishlari

Developmentda SMSlarni bitta test raqamga yo'naltirish mumkin:

```env
NODE_ENV=development
SMS_PROVIDER=console
SMS_TEST_PHONE=+998915717009
```

`console` provider SMSni telefonga yubormaydi, kodni backend terminaliga chiqaradi. Haqiqiy SMS uchun
Eskiz credentiallarini kiriting va `SMS_PROVIDER=eskiz` qiling:

```env
SMS_PROVIDER=eskiz
ESKIZ_TOKEN=
# Token bo'lmasa ESKIZ_EMAIL va ESKIZ_PASSWORD orqali olinadi.
ESKIZ_EMAIL=
ESKIZ_PASSWORD=
ESKIZ_FROM=4546
```

`SMS_TEST_PHONE` faqat `NODE_ENV` production bo'lmaganda ishlaydi. SMS hozir kirish kodi
uchun emas, yangi qurilmadan kirish kabi qo'shimcha xavfsizlik ogohlantirishlari uchun ishlatiladi.

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
