const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- CẤU HÌNH DATABASE ---
const config = {
    user: 'sa',
    password: '123456789', // <-- Nhớ đổi đúng mật khẩu của bạn
    server: 'localhost',
    database: 'QuanliGiatLa', 
    options: { encrypt: false, trustServerCertificate: true },
    port: 1433
};

const generateID = (prefix) => prefix + Math.floor(1000 + Math.random() * 9000);

// ==========================================
// 1. API: KHÁCH HÀNG & GIẢM GIÁ
// ==========================================
app.get('/api/khachhang', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("SELECT * FROM khach_hang");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy mã giảm giá CÒN HẠN để nhân viên lập đơn
app.get('/api/giamgia', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("SELECT * FROM giam_gia WHERE ngay_ket_thuc >= CAST(GETDATE() AS DATE)");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy TẤT CẢ mã giảm giá cho Quản lý xem
app.get('/api/giamgia_all', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("SELECT * FROM giam_gia");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quản lý Thêm mã giảm giá mới
app.post('/api/giamgia', async (req, res) => {
    const { ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc } = req.body;
    try {
        let pool = await sql.connect(config);
        const ma_gg = generateID('GG');
        await pool.request()
            .input('ma_gg', sql.VarChar, ma_gg).input('ten', sql.NVarChar, ten_chuong_trinh).input('pt', sql.Int, phan_tram).input('dk', sql.NVarChar, dieu_kien).input('bd', sql.Date, ngay_bat_dau).input('kt', sql.Date, ngay_ket_thuc)
            .query("INSERT INTO giam_gia (ma_gg, ten_chuong_trinh, phan_tram, dieu_kien, ngay_bat_dau, ngay_ket_thuc) VALUES (@ma_gg, @ten, @pt, @dk, @bd, @kt)");
        res.json({ success: true, message: "Đã thêm Mã Giảm Giá mới!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/giamgia/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request().input('ma_gg', sql.VarChar, req.params.id).query("DELETE FROM giam_gia WHERE ma_gg = @ma_gg");
        res.json({ success: true, message: "Đã xóa Mã Giảm Giá!" });
    } catch (err) { res.status(500).json({ error: "Lỗi: Mã này đã được dùng trong hóa đơn cũ." }); }
});

// ==========================================
// 2. API: DỊCH VỤ 
// ==========================================
app.get('/api/dichvu', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("SELECT * FROM dich_vu");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dichvu', async (req, res) => {
    const { ten_dv, don_gia } = req.body;
    try {
        let pool = await sql.connect(config);
        const ma_dv = generateID('DV');
        await pool.request().input('ma_dv', sql.VarChar, ma_dv).input('ten_dv', sql.NVarChar, ten_dv).input('don_gia', sql.Decimal(10,2), don_gia).query("INSERT INTO dich_vu (ma_dv, ten_dv, don_gia) VALUES (@ma_dv, @ten_dv, @don_gia)");
        res.json({ success: true, message: "Đã thêm dịch vụ!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/dichvu/:id', async (req, res) => {
    const { ten_dv, don_gia } = req.body;
    try {
        let pool = await sql.connect(config);
        await pool.request().input('ma_dv', sql.VarChar, req.params.id).input('ten_dv', sql.NVarChar, ten_dv).input('don_gia', sql.Decimal(10,2), don_gia).query("UPDATE dich_vu SET ten_dv = @ten_dv, don_gia = @don_gia WHERE ma_dv = @ma_dv");
        res.json({ success: true, message: "Đã lưu thay đổi!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/dichvu/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request().input('ma_dv', sql.VarChar, req.params.id).query("DELETE FROM dich_vu WHERE ma_dv = @ma_dv");
        res.json({ success: true, message: "Đã xóa dịch vụ!" });
    } catch (err) { res.status(500).json({ error: "Lỗi: Đang vướng khóa ngoại." }); }
});

// ==========================================
// 3. API: HÓA ĐƠN
// ==========================================
app.post('/api/hoadon', async (req, res) => {
    const { ten_kh, sdt, dia_chi, ma_nv, ma_gg, ds_dich_vu, thanh_tien } = req.body;
    try {
        let pool = await sql.connect(config);
        
        let khResult = await pool.request().input('sdt', sql.VarChar, sdt).query("SELECT ma_kh FROM khach_hang WHERE sdt = @sdt");
        let ma_kh_final = khResult.recordset.length > 0 ? khResult.recordset[0].ma_kh : generateID('KH');

        if (khResult.recordset.length === 0) {
            await pool.request()
                .input('ma_kh', sql.VarChar, ma_kh_final).input('ten_kh', sql.NVarChar, ten_kh).input('sdt', sql.VarChar, sdt).input('dia_chi', sql.NVarChar, dia_chi).input('ma_loai', sql.VarChar, 'L01') 
                .query("INSERT INTO khach_hang (ma_kh, ten_kh, sdt, dia_chi, ma_loai) VALUES (@ma_kh, @ten_kh, @sdt, @dia_chi, @ma_loai)");
        }

        const ma_hd = generateID('HD');
        const ngay_nhan = new Date().toISOString().split('T')[0];
        const ngay_hen = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        await pool.request()
            .input('ma_hd', sql.VarChar, ma_hd).input('ma_kh', sql.VarChar, ma_kh_final).input('ma_nv', sql.VarChar, ma_nv).input('ma_gg', sql.VarChar, ma_gg || null).input('ngay_nhan', sql.Date, ngay_nhan).input('ngay_hen', sql.Date, ngay_hen).input('trang_thai', sql.NVarChar, 'Chờ xử lý').input('thanh_tien', sql.Decimal(12,2), thanh_tien) 
            .query(`INSERT INTO hoa_don (ma_hd, ma_kh, ma_nv, ma_gg, ngay_nhan, ngay_hen, trang_thai, thanh_tien) VALUES (@ma_hd, @ma_kh, @ma_nv, @ma_gg, @ngay_nhan, @ngay_hen, @trang_thai, @thanh_tien)`);

        for (let dv of ds_dich_vu) {
            await pool.request().input('ma_hd', sql.VarChar, ma_hd).input('ma_dv', sql.VarChar, dv.ma_dv).input('so_luong', sql.Int, dv.so_luong).input('don_gia', sql.Decimal(12,2), dv.don_gia).query(`INSERT INTO chi_tiet_hoa_don (ma_hd, ma_dv, so_luong, don_gia) VALUES (@ma_hd, @ma_dv, @so_luong, @don_gia)`);
        }
        res.json({ success: true, message: `Chốt đơn thành công! Mã: ${ma_hd}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/hoadon', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT h.ma_hd, k.ten_kh, h.ngay_nhan, h.ngay_hen, h.thanh_tien, h.trang_thai, nv.ten_nv 
            FROM hoa_don h JOIN khach_hang k ON h.ma_kh = k.ma_kh JOIN nhan_vien nv ON h.ma_nv = nv.ma_nv ORDER BY h.ngay_nhan DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/hoadon/:id', async (req, res) => {
    const { trang_thai } = req.body;
    try {
        let pool = await sql.connect(config);
        await pool.request().input('ma_hd', sql.VarChar, req.params.id).input('trang_thai', sql.NVarChar, trang_thai).query("UPDATE hoa_don SET trang_thai = @trang_thai WHERE ma_hd = @ma_hd");
        res.json({ success: true, message: "Đã cập nhật trạng thái!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 10000; // Render thường dùng port 10000
app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));
