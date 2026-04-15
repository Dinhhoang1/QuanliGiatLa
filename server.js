const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors());

// --- CẤU HÌNH DATABASE AIVEN MYSQL ---
const pool = mysql.createPool({
    host: 'mysql-tiemgiatla-dinhhoangxz-d576.e.aivencloud.com',
    user: 'avnadmin',
    password: process.env.AIVEN_PASSWORD || 'AVNS_O3UPYLpAtHgt3GqXJ0D',
    database: 'QuanliTiemGiat', 
    port: 13501, 
    ssl: { rejectUnauthorized: false }, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const generateID = (prefix) => prefix + Math.floor(1000 + Math.random() * 9000);

// ==========================================
// 1. API: LOẠI KHÁCH HÀNG & KHÁCH HÀNG
// ==========================================
app.get('/api/loaikhach', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM loai_khach_hang");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/loaikhach', async (req, res) => {
    const { ma_loai, ten_loai, mo_ta } = req.body;
    try {
        await pool.query("INSERT INTO loai_khach_hang (ma_loai, ten_loai, mo_ta) VALUES (?, ?, ?)", [ma_loai, ten_loai, mo_ta]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/khachhang', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM khach_hang");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. API: NHÂN VIÊN
// ==========================================
app.get('/api/nhanvien', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM nhan_vien");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/nhanvien', async (req, res) => {
    const { ten_nv, sdt, chuc_vu, luong } = req.body;
    try {
        const ma_nv = generateID('NV');
        await pool.query("INSERT INTO nhan_vien (ma_nv, ten_nv, sdt, chuc_vu, luong) VALUES (?, ?, ?, ?, ?)", [ma_nv, ten_nv, sdt, chuc_vu, luong]);
        res.json({ success: true, message: "Đã thêm nhân viên mới!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. API: DỊCH VỤ & GIẢM GIÁ
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
        await pool.query("INSERT INTO dich_vu (ma_dv, ten_dv, don_gia) VALUES (?, ?, ?)", [generateID('DV'), ten_dv, don_gia]);
        res.json({ success: true, message: "Đã thêm dịch vụ!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/dichvu/:id', async (req, res) => {
    try {
        await pool.query("UPDATE dich_vu SET ten_dv = ?, don_gia = ? WHERE ma_dv = ?", [req.body.ten_dv, req.body.don_gia, req.params.id]);
        res.json({ success: true, message: "Đã lưu thay đổi!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dichvu/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM dich_vu WHERE ma_dv = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa dịch vụ!" });
    } catch (err) { res.status(500).json({ error: "Lỗi: Đang vướng khóa ngoại." }); }
});

app.get('/api/giamgia', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM giam_gia WHERE ngay_ket_thuc >= CURDATE()");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/giamgia_all', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM giam_gia");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/giamgia', async (req, res) => {
    const { ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc } = req.body;
    try {
        await pool.query(
            "INSERT INTO giam_gia (ma_gg, ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc) VALUES (?, ?, ?, ?, ?, ?)",
            [generateID('GG'), ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc]
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
// 4. API: ĐƠN ĐẶT & HÓA ĐƠN (Đã sửa đồng bộ DB mới)
// ==========================================
app.post('/api/hoadon', async (req, res) => {
    const { ten_kh, sdt, dia_chi, ma_loai, ma_nv, ngay_hen, ma_gg, ds_dich_vu, thanh_tien } = req.body;
    
    try {
        // 1. Kiểm tra và thêm khách hàng nếu chưa có
        const [khResult] = await pool.query("SELECT ma_kh FROM khach_hang WHERE sdt = ?", [sdt]);
        let ma_kh_final = khResult.length > 0 ? khResult[0].ma_kh : generateID('KH');

        if (khResult.length === 0) {
            await pool.query(
                "INSERT INTO khach_hang (ma_kh, ten_kh, sdt, dia_chi, ma_loai) VALUES (?, ?, ?, ?, ?)",
                [ma_kh_final, ten_kh, sdt, dia_chi, ma_loai || 'L01']
            );
        }

        // 2. Tạo ĐƠN ĐẶT trước
        const ma_dd = generateID('DD');
        const ma_hd = generateID('HD');
        const ngay_nhan = new Date().toISOString().split('T')[0];

        await pool.query(
            "INSERT INTO don_dat (ma_dd, ma_kh, ma_nv, ngay_nhan, ngay_hen, trang_thai) VALUES (?, ?, ?, ?, ?, ?)",
            [ma_dd, ma_kh_final, ma_nv, ngay_nhan, ngay_hen, 'Đang xử lý']
        );

        // 3. Tạo HÓA ĐƠN nối với ĐƠN ĐẶT
        await pool.query(
            "INSERT INTO hoa_don (ma_hd, ma_dd, ma_gg, ngay_nhan, ngay_hen, trang_thai, thanh_tien) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [ma_hd, ma_dd, ma_gg || null, ngay_nhan, ngay_hen, 'Chờ xử lý', thanh_tien]
        );

        // 4. Thêm chi tiết các dịch vụ trong hóa đơn
        for (let dv of ds_dich_vu) {
            await pool.query(
                "INSERT INTO chi_tiet_hoa_don (ma_hd, ma_dv, so_luong, don_gia) VALUES (?, ?, ?, ?)",
                [ma_hd, dv.ma_dv, dv.so_luong, dv.don_gia]
            );
        }
        
        res.json({ success: true, message: `Chốt đơn thành công! Mã: ${ma_hd}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API Lấy danh sách Hóa Đơn (Đã sửa lệnh JOIN bảng)
app.get('/api/hoadon', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                h.ma_hd, d.ma_dd, k.ten_kh, h.ngay_nhan, h.ngay_hen, h.thanh_tien, h.trang_thai 
            FROM hoa_don h
            LEFT JOIN don_dat d ON h.ma_dd = d.ma_dd
            LEFT JOIN khach_hang k ON d.ma_kh = k.ma_kh
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

// API Xem Chi Tiết Hóa Đơn (Cho Modal popup)
app.get('/api/hoadon/:id/chitiet', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.ma_dv, d.ten_dv, c.so_luong, c.don_gia 
            FROM chi_tiet_hoa_don c 
            JOIN dich_vu d ON c.ma_dv = d.ma_dv 
            WHERE c.ma_hd = ?
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// 5. CHẠY SERVER
// ==========================================
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server chạy tại port ${PORT}`));
