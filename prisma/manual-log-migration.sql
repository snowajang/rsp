-- ใช้สำหรับฐานข้อมูลเดิมที่มีตาราง applog และ userlog อยู่แล้ว
-- ตรวจสอบชื่อฐานข้อมูลและสิทธิ์ก่อนรันใน production

ALTER TABLE applog
  ADD INDEX idx_applog_createdAt (createdAt),
  ADD INDEX idx_applog_userid (userid),
  ADD INDEX idx_applog_status (status);

ALTER TABLE userlog
  ADD INDEX idx_userlog_createdAt (createdAt),
  ADD INDEX idx_userlog_userid (userid);
