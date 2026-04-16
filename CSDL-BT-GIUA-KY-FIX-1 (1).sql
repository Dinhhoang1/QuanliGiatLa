create database QuanliTiemGiat;
use QuanliTiemGiat;

create table loai_khach_hang(
	ma_loai varchar(10) primary key,
	ten_loai nvarchar(50) not null,
	mo_ta nvarchar(100)
);
-- tạo bảng KHACH_HANG
CREATE TABLE khach_hang (
	ma_kh VARCHAR(10) PRIMARY KEY,
	ten_kh NVARCHAR(35) NOT NULL,
	sdt VARCHAR(15) NOT NULL,
	dia_chi NVARCHAR(100) NOT NULL,
	ma_loai varchar (10),
	foreign key(ma_loai) references loai_khach_hang(ma_loai)
);
-- tạo bảng NHAN_VIEN
CREATE TABLE nhan_vien(
 ma_nv VARCHAR(10) PRIMARY KEY,
 ten_nv NVARCHAR(35) NOT NULL,
 sdt VARCHAR(15) NOT NULL,
 chuc_vu NVARCHAR(50) NOT NULL,
 luong DECIMAL(12,2) NOT NULL
);
-- tạo bảng GIAM_GIA
CREATE TABLE giam_gia (
 ma_gg VARCHAR(10) PRIMARY KEY,
 ten_chuong_trinh NVARCHAR(50) NOT NULL,
 phan_tram INT NOT NULL,
 dieu_kien NVARCHAR(100) NOT NULL,
 ngay_bat_dau DATE NOT NULL,
 ngay_ket_thuc DATE NOT NULL
);
-- tạo bảng DICH_VU
CREATE TABLE dich_vu (
 ma_dv VARCHAR(10) PRIMARY KEY,
 ten_dv NVARCHAR(50) NOT NULL,
 don_gia DECIMAL(10,2) NOT NULL
);
--Tạo bảng đơn đặt
CREATE TABLE don_dat (
    ma_dd VARCHAR(10) PRIMARY KEY,
    ma_kh VARCHAR(10),
    ma_nv VARCHAR(10),

    ngay_nhan DATE NOT NULL,
    ngay_hen DATE NOT NULL,
    trang_thai NVARCHAR(50) NOT NULL,

    FOREIGN KEY (ma_kh) REFERENCES khach_hang(ma_kh),
    FOREIGN KEY (ma_nv) REFERENCES nhan_vien(ma_nv)
);
--Tạo bảng hóa đơn 
CREATE TABLE hoa_don (
    ma_hd VARCHAR(10) PRIMARY KEY,
    ma_dd VARCHAR(10) NULL,
    ma_gg VARCHAR(10) NULL,

    ngay_nhan DATE NOT NULL,
    ngay_hen DATE NOT NULL,
    trang_thai NVARCHAR(50) NOT NULL,

    thanh_tien DECIMAL(12,2) NOT NULL,

    FOREIGN KEY (ma_dd) REFERENCES don_dat(ma_dd),
    FOREIGN KEY (ma_gg) REFERENCES giam_gia(ma_gg)
    );
-- tạo bảng CT_HOA_DON
CREATE TABLE chi_tiet_hoa_don (
 ma_hd VARCHAR(10),
 ma_dv VARCHAR(10),
 so_luong INT NOT NULL,
 don_gia DECIMAL(12,2) NOT NULL,
 PRIMARY KEY (ma_hd, ma_dv),
 FOREIGN KEY (ma_hd) REFERENCES hoa_don(ma_hd),
 FOREIGN KEY (ma_dv) REFERENCES dich_vu(ma_dv)
);
-- tạo bảng THANH_TOAN
CREATE TABLE thanh_toan (
    ma_tt VARCHAR(10) PRIMARY KEY,
    ma_hd VARCHAR(10),
    ngay_thanh_toan DATE NOT NULL,
    so_tien DECIMAL(12,2) NOT NULL,
    phuong_thuc NVARCHAR(50) NOT NULL,
    trang_thai NVARCHAR(50) NOT NULL,

    FOREIGN KEY (ma_hd) REFERENCES hoa_don(ma_hd)
);
--chèn dữ liệu vào cột loại khách hàng 
INSERT INTO loai_khach_hang VALUES
('L01', N'Khách thường', N'Khách mua lẻ'),
('L02', N'Khách VIP', N'Chi tiêu cao'),
('L03', N'Khách thân thiết', N'Quay lại nhiều lần');
GO
--chèn dữ liệu vào bảng KHACH_HANG
INSERT INTO KHACH_HANG VALUES
('KH01', N'Nguyễn Văn A', '0901234567', N'Hà Nội','L01'),
('KH02', N'Trần Thị B', '0912345678', N'Hải Phòng','L02'),
('KH03', N'Lê Văn C', '0923456789', N'Đà Nẵng','L03');
go
-- chèn dữ liệu vào bảng NHAN_VIEN
INSERT INTO NHAN_VIEN VALUES
('NV01', N'Phạm Văn D','0934567890', N'Nhân viên',5000000),
('NV02', N'Hoàng Thị E','0945678901', N'Quản lý',8000000);
go
-- chèn dữ liệu vào bảng GIAM_GIA
INSERT INTO GIAM_GIA VALUES
('GG01', N'Khuyến mãi 10%', 10, N'Đơn > 100k', '2026-03-01', '2026-03-31'),
('GG02', N'Khuyến mãi 20%', 20, N'Khách VIP', '2026-03-01', '2026-04-01');
go
-- chèn dữ liệu vào bảng DICH_VU
INSERT INTO DICH_VU VALUES
('DV01', N'Giặt thường', 10000),
('DV02', N'Giặt sấy', 15000),
('DV03', N'Ủi đồ', 5000);
go
-- chèn dữ liệu vào bảng DON_DAT
INSERT INTO don_dat VALUES
('DG01', 'KH01', 'NV01', '2026-03-20', '2026-03-21', N'Đã nhận'),
('DG02', 'KH02', 'NV02', '2026-03-21', '2026-03-22', N'Đang xử lý'),
('DG03', 'KH03', 'NV01', '2026-03-22', '2026-03-23', N'Hoàn thành');
go
-- chèn dữ liệu vào bảng HOA_DON
INSERT INTO hoa_don VALUES
('HD01', 'DG01', 'GG01', '2026-03-20', '2026-03-21', N'Đã xong', 135000),
('HD02', 'DG02', NULL, '2026-03-21', '2026-03-22', N'Đang xử lý', 80000),
('HD03', 'DG03', 'GG02', '2026-03-22', '2026-03-23', N'Đã trả', 160000);
go
-- chèn dữ liệu vào bảng CT_HOA_DON
INSERT INTO chi_tiet_hoa_don VALUES
('HD01', 'DV02', 5, 10000),

('HD02', 'DV01', 5, 10000),
('HD02', 'DV03', 6, 5000),

('HD03', 'DV02', 10, 15000),
('HD03', 'DV03', 10, 5000);
go
-- chèn dữ liệu vào bảng THANH_TOAN
INSERT INTO THANH_TOAN VALUES
('TT01', 'HD01', '2026-03-21', 100000, N'Tiền mặt', N'Đã thanh toán'),
('TT02', 'HD01', '2026-03-21', 35000, N'Chuyển khoản', N'Đã thanh toán'),

('TT03', 'HD02', '2026-03-21', 40000, N'Tiền mặt', N'Chưa đủ'),

('TT04', 'HD03', '2026-03-23', 160000, N'Chuyển khoản', N'Đã thanh toán');
go
SELECT * FROM hoa_don;
SELECT * FROM chi_tiet_hoa_don;
SELECT * FROM don_dat;
SELECT * FROM loai_khach_hang;
SELECT * FROM khach_hang;
SELECT * FROM nhan_vien;
SELECT * FROM giam_gia;
SELECT * FROM dich_vu;
SELECT * FROM thanh_toan;

-- xóa dữ liệu trong bảng
DROP TABLE thanh_toan;
DROP TABLE chi_tiet_hoa_don;
DROP TABLE hoa_don;
DROP TABLE don_dat;
DROP TABLE dich_vu;
DROP TABLE giam_gia;
DROP TABLE nhan_vien;
DROP TABLE khach_hang;
DROP TABLE loai_khach_hang;