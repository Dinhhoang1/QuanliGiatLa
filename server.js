const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise'); // Đã chuyển sang dùng thư viện mysql2

const app = express();
app.use(express.json());
app.use(cors());

// --- CẤU HÌNH DATABASE AIVEN MYSQL ---
// Tạo 1 pool kết nối dùng chung cho toàn bộ app (Nhanh và mượt hơn)
const pool = mysql.createPool({
    host: 'mysql-tiemgiatla-dinhhoangxz-d576.e.aivencloud.com', // Điền host Aiven
    user: 'avnadmin',
    password: 'AVNS_O3UPYLpAtHgt3GqXJ0D', // Điền mật khẩu Aiven
    database: 'TiemGiatLa', 
    port: 13501, // Điền Port Aiven của bạn
    ssl: { rejectUnauthorized: false }, // Bắt buộc cho Aiven
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const generateID = (prefix) => prefix + Math.floor(1000 + Math.random() * 9000);

// ==========================================
// 1. API: KHÁCH HÀNG & GIẢM GIÁ
// ==========================================
app.get('/api/khachhang', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM khach_hang");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy mã giảm giá CÒN HẠN để nhân viên lập đơn
app.get('/api/giamgia', async (req, res) => {
    try {
        // MySQL dùng CURDATE() thay vì CAST(GETDATE() AS DATE)
        const [rows] = await pool.query("SELECT * FROM giam_gia WHERE ngay_ket_thuc >= CURDATE()");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy TẤT CẢ mã giảm giá cho Quản lý xem
app.get('/api/giamgia_all', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM giam_gia");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quản lý Thêm mã giảm giá mới
app.post('/api/giamgia', async (req, res) => {
    const { ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc } = req.body;
    try {
        const ma_gg = generateID('GG');
        // Truyền tham số bằng dấu ? để chống hack SQL Injection
        await pool.query(
            "INSERT INTO giam_gia (ma_gg, ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc) VALUES (?, ?, ?, ?, ?, ?)",
            [ma_gg, ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc]
        );
        res.json({ success: true, message: "Đã thêm Mã Giảm Giá mới!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/giamgia/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM giam_gia WHERE ma_gg = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa Mã Giảm Giá!" });
    } catch (err) { res.status(500).json({ error: "Lỗi: Mã này đã được dùng trong hóa đơn cũ." }); }
});

// ==========================================
// 2. API: DỊCH VỤ 
// ==========================================
app.get('/api/dichvu', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM dich_vu");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dichvu', async (req, res) => {
    const { ten_dv, don_gia } = req.body;
    try {
        const ma_dv = generateID('DV');
        await pool.query(
            "INSERT INTO dich_vu (ma_dv, ten_dv, don_gia) VALUES (?, ?, ?)", 
            [ma_dv, ten_dv, don_gia]
        );
        res.json({ success: true, message: "Đã thêm dịch vụ!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/dichvu/:id', async (req, res) => {
    const { ten_dv, don_gia } = req.body;
    try {
        await pool.query(
            "UPDATE dich_vu SET ten_dv = ?, don_gia = ? WHERE ma_dv = ?", 
            [ten_dv, don_gia, req.params.id]
        );
        res.json({ success: true, message: "Đã lưu thay đổi!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dichvu/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM dich_vu WHERE ma_dv = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa dịch vụ!" });
    } catch (err) { res.status(500).json({ error: "Lỗi: Đang vướng khóa ngoại." }); }
});

// ==========================================
// 3. API: HÓA ĐƠN
// ==========================================
app.post('/api/hoadon', async (req, res) => {
    const { ten_kh, sdt, dia_chi, ma_nv, ma_gg, ds_dich_vu, thanh_tien } = req.body;
    try {
        // 1. Kiểm tra và thêm khách hàng nếu chưa có
        const [khResult] = await pool.query("SELECT ma_kh FROM khach_hang WHERE sdt = ?", [sdt]);
        let ma_kh_final = khResult.length > 0 ? khResult[0].ma_kh : generateID('KH');

        if (khResult.length === 0) {
            await pool.query(
                "INSERT INTO khach_hang (ma_kh, ten_kh, sdt, dia_chi, ma_loai) VALUES (?, ?, ?, ?, ?)",
                [ma_kh_final, ten_kh, sdt, dia_chi, 'L01']
            );
        }

        // 2. Tạo hóa đơn mới
        const ma_hd = generateID('HD');
        const ngay_nhan = new Date().toISOString().split('T')[0];
        const ngay_hen = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        await pool.query(
            `INSERT INTO hoa_don (ma_hd, ma_kh, ma_nv, ma_gg, ngay_nhan, ngay_hen, trang_thai, thanh_tien) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [ma_hd, ma_kh_final, ma_nv, ma_gg || null, ngay_nhan, ngay_hen, 'Chờ xử lý', thanh_tien]
        );

        // 3. Thêm chi tiết các dịch vụ trong hóa đơn
        for (let dv of ds_dich_vu) {
            await pool.query(
                "INSERT INTO chi_tiet_hoa_don (ma_hd, ma_dv, so_luong, don_gia) VALUES (?, ?, ?, ?)",
                [ma_hd, dv.ma_dv, dv.so_luong, dv.don_gia]
            );
        }
        
        res.json({ success: true, message: `Chốt đơn thành công! Mã: ${ma_hd}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/hoadon', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.ma_hd, k.ten_kh, h.ngay_nhan, h.ngay_hen, h.thanh_tien, h.trang_thai, nv.ten_nv 
            FROM hoa_don h 
            JOIN khach_hang k ON h.ma_kh = k.ma_kh 
            JOIN nhan_vien nv ON h.ma_nv = nv.ma_nv 
            ORDER BY h.ngay_nhan DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/hoadon/:id', async (req, res) => {
    const { trang_thai } = req.body;
    try {
        await pool.query("UPDATE hoa_don SET trang_thai = ? WHERE ma_hd = ?", [trang_thai, req.params.id]);
        res.json({ success: true, message: "Đã cập nhật trạng thái!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. CHẠY SERVER
// ==========================================
const PORT = process.env.PORT || 10000;
// Dòng này cực kỳ quan trọng: Nó bảo Server nếu ai vào trang chủ thì đưa file index.html cho họ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));
