import { google } from 'googleapis';
import fs from 'fs';

// 1. Định nghĩa danh sách URL cố định cần index theo danh sách của bạn
const URLS_TO_INDEX = [
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/vi/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/en/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/ko/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/zh/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/th/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/ar/",
  "https://tintucchungkhoan24h.com/diem-tin-chung-khoan/ja/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/vi/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/en/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/ko/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/zh/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/th/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/ar/",
  "https://tintucchungkhoan24h.com/diem-tin-vi-mo/ja/"
];

// 2. Xác thực với Google API bằng file JSON tạm thời do GitHub Actions sinh ra
const KEY_FILE = './service_account.json';

if (!fs.existsSync(KEY_FILE)) {
  console.error(`❌ Không tìm thấy file cấu hình xác thực tại: ${KEY_FILE}`);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});

const indexing = google.indexing({
  version: 'v3',
  auth: auth,
});

// 3. Hàm gửi request Ping tới Google
async function pingUrl(url) {
  try {
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED', // Thông báo URL được cập nhật/thêm mới nội dung
      },
    });
    console.log(`✅ Đã ping thành công: ${url} (Trạng thái: ${response.statusText || 'OK'})`);
  } catch (error) {
    console.error(`❌ Lỗi khi ping URL [${url}]:`, error.message);
  }
}

// 4. Duyệt qua danh sách và thực thi tuần tự
async function main() {
  console.log(`🚀 Bắt đầu gửi ${URLS_TO_INDEX.length} URLs lên Google Indexing API...`);
  
  for (const url of URLS_TO_INDEX) {
    await pingUrl(url);
    // Tránh gửi quá dồn dập, nghỉ 200ms giữa mỗi request
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('🏁 Hoàn thành quá trình gọi Google Indexing!');
}

main();