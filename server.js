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
    database: 'QuanliTiemGiat', 
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
// API: QUẢN LÝ DỊCH VỤ (THÊM, SỬA, XÓA)
// ==========================================

// 1. API Thêm Dịch Vụ Mới
app.post('/api/dichvu', async (req, res) => {
    const { ten_dv, don_gia } = req.body;
    
    if (!ten_dv || !don_gia) {
        return res.status(400).json({ error: "Thiếu thông tin tên dịch vụ hoặc đơn giá!" });
    }

    try {
        const ma_dv = generateID('DV'); // Tự động tạo mã DV (VD: DV1234)
        await pool.query(
            "INSERT INTO dich_vu (ma_dv, ten_dv, don_gia) VALUES (?, ?, ?)",
            [ma_dv, ten_dv, don_gia]
        );
        res.json({ success: true, message: "Đã thêm dịch vụ mới vào Database!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 2. API Cập nhật (Sửa) giá hoặc tên dịch vụ
app.put('/api/dichvu/:id', async (req, res) => {
    const { ten_dv, don_gia } = req.body;
    try {
        await pool.query(
            "UPDATE dich_vu SET ten_dv = ?, don_gia = ? WHERE ma_dv = ?",
            [ten_dv, don_gia, req.params.id]
        );
        res.json({ success: true, message: "Đã cập nhật dịch vụ thành công!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 3. API Xóa Dịch Vụ
app.delete('/api/dichvu/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM dich_vu WHERE ma_dv = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa dịch vụ khỏi hệ thống!" });
    } catch (err) { 
        // Bắt lỗi khóa ngoại: Nếu dịch vụ đã từng được khách giặt, Database sẽ chặn không cho xóa để bảo vệ hóa đơn cũ
        res.status(500).json({ error: "Lỗi: Không thể xóa dịch vụ này vì đã có khách từng sử dụng (vướng khóa ngoại)!" }); 
    }
});

// ==========================================
// 3. API: HÓA ĐƠN & ĐƠN ĐẶT
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

// ==========================================
// [ĐÃ NÂNG CẤP]: LẤY DANH SÁCH HÓA ĐƠN 
// ==========================================
// ==========================================
// [ĐÃ NÂNG CẤP]: LẤY DANH SÁCH HÓA ĐƠN (Thêm Mã NV)
// ==========================================
app.get('/api/hoadon', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                d.ma_dd, 
                h.ma_hd, 
                k.ten_kh, 
                d.ngay_nhan, 
                d.ngay_hen, 
                h.thanh_tien, 
                h.trang_thai,
                d.ma_nv,
                n.ten_nv
            FROM don_dat d
            JOIN hoa_don h ON d.ma_dd = h.ma_dd
            JOIN khach_hang k ON d.ma_kh = k.ma_kh
            LEFT JOIN nhan_vien n ON d.ma_nv = n.ma_nv
            ORDER BY d.ngay_nhan DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// [ĐÃ NÂNG CẤP]: CẬP NHẬT TRẠNG THÁI (ĐỒNG BỘ 2 BẢNG)
// ==========================================
app.put('/api/hoadon/:id', async (req, res) => {
    const { trang_thai } = req.body;
    const ma_hd = req.params.id; // Bây giờ web truyền mã HĐ (VD: HD1234) chứ không truyền mã ĐĐ nữa
    
    // Dùng Transaction để cập nhật cả 2 bảng. Lỗi 1 cái là hủy luôn để không bị lệch
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Bước 1: Cập nhật trạng thái bảng Hóa Đơn
        await connection.query("UPDATE hoa_don SET trang_thai = ? WHERE ma_hd = ?", [trang_thai, ma_hd]);
        
        // Bước 2: Tìm mã Đơn Đặt tương ứng và Cập nhật luôn bảng Đơn Đặt
        const [rows] = await connection.query("SELECT ma_dd FROM hoa_don WHERE ma_hd = ?", [ma_hd]);
        if (rows.length > 0) {
            await connection.query("UPDATE don_dat SET trang_thai = ? WHERE ma_dd = ?", [trang_thai, rows[0].ma_dd]);
        }
        
        await connection.commit();
        res.json({ success: true, message: "Đã đồng bộ trạng thái 2 bảng!" });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
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
// API: NHÂN VIÊN
// ==========================================
// Lấy danh sách nhân viên
app.get('/api/nhanvien', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM nhan_vien");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quản lý thêm nhân viên mới
app.post('/api/nhanvien', async (req, res) => {
    const { ten_nv, sdt, chuc_vu, luong } = req.body;
    try {
        const ma_nv = 'NV' + Math.floor(1000 + Math.random() * 9000);
        await pool.query(
            "INSERT INTO nhan_vien (ma_nv, ten_nv, sdt, chuc_vu, luong) VALUES (?, ?, ?, ?, ?)",
            [ma_nv, ten_nv, sdt, chuc_vu, luong]
        );
        res.json({ success: true, message: "Đã thêm nhân viên mới!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. API: QUẢN LÝ LOẠI KHÁCH HÀNG
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
        await pool.query(
            "INSERT INTO loai_khach_hang (ma_loai, ten_loai, mo_ta) VALUES (?, ?, ?)",
            [ma_loai, ten_loai, mo_ta]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// API Lấy lịch sử giao dịch (log) của 1 khách hàng cụ thể
app.get('/api/khachhang/:id/lichsu', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.ma_dd, h.ma_hd, d.ngay_nhan, d.ngay_hen, h.thanh_tien, d.trang_thai 
            FROM don_dat d
            LEFT JOIN hoa_don h ON d.ma_dd = h.ma_dd
            WHERE d.ma_kh = ?
            ORDER BY d.ngay_nhan DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// ==========================================
// API NÂNG HẠNG KHÁCH HÀNG
// ==========================================
app.put('/api/khachhang/:id', async (req, res) => {
    try {
        await pool.query("UPDATE khach_hang SET ma_loai = ? WHERE ma_kh = ?", [req.body.ma_loai, req.params.id]);
        res.json({ success: true, message: "Đã cập nhật hạng khách hàng!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});
// ==========================================
// API: QUẢN LÝ NHÂN VIÊN
// ==========================================
app.post('/api/nhanvien', async (req, res) => {
    const { ten_nv, sdt, chuc_vu, luong } = req.body;
    if (!ten_nv || !sdt || !luong) return res.status(400).json({ error: "Vui lòng nhập đủ thông tin!" });
    
    try {
        const ma_nv = generateID('NV'); 
        await pool.query(
            "INSERT INTO nhan_vien (ma_nv, ten_nv, sdt, chuc_vu, luong) VALUES (?, ?, ?, ?, ?)",
            [ma_nv, ten_nv, sdt, chuc_vu, luong]
        );
        res.json({ success: true, message: "Đã thêm nhân viên mới thành công!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.delete('/api/nhanvien/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM nhan_vien WHERE ma_nv = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa nhân viên khỏi hệ thống!" });
    } catch (err) { 
        res.status(500).json({ error: "Không thể xóa nhân viên này vì họ đã từng tạo hóa đơn (Vướng khóa ngoại)!" }); 
    }
});
// ==========================================
// API: QUẢN LÝ THANH TOÁN
// ==========================================
// Lấy lịch sử thanh toán của 1 hóa đơn
app.get('/api/hoadon/:id/thanhtoan', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM thanh_toan WHERE ma_hd = ? ORDER BY ngay_thanh_toan DESC", [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Thêm 1 lần thanh toán mới
app.post('/api/thanhtoan', async (req, res) => {
    const { ma_hd, so_tien, phuong_thuc, trang_thai } = req.body;
    try {
        const ma_tt = generateID('TT'); // Tự động tạo mã TT (VD: TT1234)
        const ngay_thanh_toan = new Date().toISOString().split('T')[0]; // Lấy ngày hiện tại
        
        await pool.query(
            "INSERT INTO thanh_toan (ma_tt, ma_hd, ngay_thanh_toan, so_tien, phuong_thuc, trang_thai) VALUES (?, ?, ?, ?, ?, ?)",
            [ma_tt, ma_hd, ngay_thanh_toan, so_tien, phuong_thuc, trang_thai]
        );
        res.json({ success: true, message: "Đã ghi nhận khoản thanh toán!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
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
