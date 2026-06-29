# 🎯 Shooting War — Auto Hack

Tự động hóa **Đại Chiến Sân Cỏ** của Liên Quân Mobile.

Chỉ cần **SSO KEY** — script tự động chuyển đổi, vào game, hack speed 50x, skip 7 màn, và báo BXH.

---

## 📋 Yêu cầu

- [Node.js](https://nodejs.org/) >= 18.x
- Windows 10/11 / Linux / macOS

## 🚀 Cài đặt

```bash
git clone https://github.com/sibachao786-coder/Gazz.git
cd Gazz
npm install
```

## 🎮 Cách dùng

### Cách 1: Input SSO KEY khi chạy
```bash
node index.js
```
Rồi nhập SSO KEY → Enter

### Cách 2: Pass SSO KEY trực tiếp
```bash
node index.js "YOUR_SSO_KEY_HERE"
```

### Cách 3: Dùng npm script
```bash
npm start
```

---

## ⚙️ Cấu hình thời gian

Sửa các dòng trong `index.js`:

```javascript
const SPEED = 50;        // Tốc độ game (50x)
const TIMES = [0, 23, 32, 37, 42, 46, 51, 56];  // Thời gian mỗi màn (giây)
const TOTAL = 316;       // Tổng thời gian submit
const KILLS = { 7: [51, 56] };  // Màn 7 kill 2 lần
```

---

## 📁 Cấu trúc

```
Gazz/
├── index.js              # Main entry point (CLI)
├── package.json          # Dependencies & scripts
├── README.md             # Documentation
└── node_modules/         # Dependencies (tự động tạo)
```

---

## 🔧 Khắc phục lỗi Chromium

**Lỗi:** `Executable doesn't exist at /...chromium_headless_shell...`

**Giải pháp:**

```bash
# Xóa cũ
rm -rf node_modules package-lock.json

# Cài lại
npm install

# Nếu vẫn lỗi, cài Chromium thủ công
npx playwright install chromium
```

**Trên VPS/Linux cần lib hệ thống:**
```bash
sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 libgbm1 libpango-1.0-0 libpangoft2-1.0-0 libxss1 libxtst6
npm install
```

---

## 📊 Thông tin chạy

Khi chạy, script sẽ:

1. ✅ Chuyển đổi SSO KEY → Event Link
2. ✅ Mở trình duyệt headless
3. ✅ Inject game hack script
4. ✅ Auto-start game
5. ✅ Speed 50x, skip levels, kill M7
6. ✅ Fetch và hiển thị BXH leaderboard

**Output:**
```
✅ HOÀN THÀNH!
   ⏱️  Game Time: 316s
   🎯 Level: 7
   ⚡ Real Time: 6.2s
```

---

## 📜 License & Copyright

© 2026 **@XuanCuong2006**. All rights reserved.

Telegram: **@XuanCuong2006**

Vui lòng giữ credit khi chia sẻ. Không sử dụng cho mục đích thương mại.

---

## ⚠️ Disclaimer

Công cụ này chỉ dành cho mục đích học tập và nghiên cứu. Tác giả không chịu trách nhiệm về bất kỳ hậu quả nào phát sinh từ việc sử dụng công cụ này.
