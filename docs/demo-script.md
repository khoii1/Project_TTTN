# Demo Script CRM MVP

## 1. Mục Tiêu Demo

Đây là hệ thống CRM kiểu Salesforce mini, dùng để quản lý khách hàng tiềm năng, khách hàng/công ty, người liên hệ, cơ hội bán hàng, công việc và yêu cầu hỗ trợ.

Flow chính của hệ thống:

`Lead -> Convert Wizard -> Account + Contact + Opportunity -> Sales -> Support`

## 2. Tài Khoản Demo

Công ty Mẫu Việt Nam:

- `admin@example.com` / `Admin@123`
- `manager@example.com` / `Manager@123`
- `sales@example.com` / `Sales@123`
- `support@example.com` / `Support@123`

Công ty Đối Thủ:

- `admin@rival.com` / `Rival@123`

`npm run prisma:seed` tạo sẵn dữ liệu demo tiếng Việt có liên kết đầy đủ: Lead, Account, Contact, Opportunity, Task, Note, Case, Recycle Bin và dữ liệu riêng cho tenant đối thủ.

## 3. Demo Flow Chính

### A0. Web-to-Lead

- Mở `/dang-ky-tu-van` khi chưa đăng nhập.
- Nhập thông tin khách hàng đang cần tư vấn CRM.
- Gửi form và kiểm tra thông báo cảm ơn.
- Đăng nhập `admin@example.com`, mở danh sách Lead và tìm Lead vừa gửi.
- Nhấn mạnh Lead được tạo tự động với `source = Website`, `sourceDetail = Form đăng ký tư vấn trên website`, `status = NEW`.
- Convert Lead này bằng Lead Conversion Wizard để chứng minh luồng chăm sóc sau đăng ký vẫn dùng quy trình CRM cũ.

### A. Đăng nhập

- Đăng nhập bằng `admin@example.com`.
- Mở trang Tổng quan.
- Giới thiệu dashboard và các chỉ số chính.

### B. Dashboard Analytics

Trình bày:

- Tổng khách hàng tiềm năng
- Tổng khách hàng/công ty
- Tổng người liên hệ
- Tổng cơ hội bán hàng
- Giá trị cơ hội đang mở
- Giá trị chốt thành công
- Công việc sắp đến hạn
- Yêu cầu hỗ trợ theo mức ưu tiên

### C. Tạo khách hàng tiềm năng

Dữ liệu demo gợi ý:

- Họ: `Nguyễn`
- Tên: `Minh An`
- Công ty: `Công ty TNHH Nội Thất An Phát`
- Chức danh: `Giám đốc kinh doanh`
- Email: `an.nguyen@noithatanphat.vn`
- Số điện thoại: `0908 456 789`
- Website: `https://noithatanphat.vn`
- Nguồn: `Facebook`
- Chi tiết nguồn: `Khách để lại thông tin từ quảng cáo Facebook về giải pháp CRM cho doanh nghiệp vừa và nhỏ`
- Mô tả: `Khách hàng đang cần hệ thống CRM để quản lý khách hàng, công việc và cơ hội bán hàng.`

### D. Thêm ghi chú và công việc

- Thêm ghi chú vào Lead.
- Thêm công việc bằng Related Lookup.
- Nhấn mạnh người dùng không cần nhập ID thủ công.

Dữ liệu công việc:

- Tiêu đề: `Gọi tư vấn giải pháp CRM cho Công ty An Phát`
- Mức độ ưu tiên: `Cao`
- Liên quan đến: `Khách hàng tiềm năng Nguyễn Minh An`

### E. Chuyển đổi khách hàng tiềm năng

- Đổi trạng thái Lead sang `Đủ điều kiện`.
- Mở Lead Conversion Wizard.
- Chọn tạo mới:
  - Khách hàng/Công ty
  - Người liên hệ
  - Cơ hội bán hàng
- Tên cơ hội: `Triển khai CRM cho Công ty TNHH Nội Thất An Phát`
- Giải thích data propagation: dữ liệu từ Lead được chuyển sang Account, Contact, Opportunity.

### F. Kiểm tra bản ghi sau chuyển đổi

- Mở Account vừa tạo.
- Kiểm tra Contact liên quan.
- Kiểm tra Opportunity liên quan.
- Mở Opportunity detail.

### G. Quy trình cơ hội bán hàng

- Cập nhật giai đoạn Opportunity từ `Xác định nhu cầu` sang `Đề xuất`.
- Kiểm tra người cập nhật giai đoạn gần nhất.
- Kiểm tra giá trị tiền hiển thị VNĐ.

Dữ liệu gợi ý:

- Giá trị: `85.000.000 ₫`
- Bước tiếp theo: `Gửi bảng báo giá và lịch demo sản phẩm cho khách hàng.`

### H. Công việc

- Mở Task đã tạo.
- Bấm `Đánh dấu hoàn thành`.
- Kiểm tra `Người hoàn thành` và `Thời gian hoàn thành`.

### I. Yêu cầu hỗ trợ

- Tạo Case mới.
- Cập nhật trạng thái Case.
- Đóng Case.
- Kiểm tra `Người đóng yêu cầu` và `Thời gian đóng`.

Dữ liệu case gợi ý:

- Tiêu đề: `Vấn đề về đăng nhập`
- Mức độ ưu tiên: `Cao`
- Nguồn: `Email`
- Mô tả: `Khách hàng phản ánh không đăng nhập được vào hệ thống sau khi đổi mật khẩu.`

### J. Thùng rác

- Xóa một Task hoặc Lead.
- Mở Thùng rác.
- Kiểm tra `Người xóa` và `Ngày xóa`.
- Khôi phục bản ghi.
- Kiểm tra bản ghi quay lại danh sách chính.

### K. Tìm kiếm toàn cục

- Tìm từ khóa `An Phát` hoặc `Minh An`.
- Kiểm tra kết quả hiển thị theo nhóm.
- Click kết quả để mở trang chi tiết.

### L. Multi-tenant isolation

- Đăng xuất.
- Đăng nhập `admin@rival.com` / `Rival@123`.
- Kiểm tra Công ty Đối Thủ không thấy dữ liệu của Công ty Mẫu Việt Nam.

## 4. Điểm Nổi Bật Kỹ Thuật

- Backend NestJS + Prisma + PostgreSQL
- Frontend Next.js + TypeScript + Ant Design
- JWT access token + refresh token
- Multi-tenant theo organization
- RBAC
- Soft delete + Recycle Bin
- Audit logging
- Actor tracking
- Lead Conversion Wizard
- Duplicate prevention
- Related Lookup
- ActivityTimeline
- Global Search
- Dashboard Analytics
- Web-to-Lead public capture
- Vietnamese UI
- VNĐ currency display

## 5. Những Điểm Cần Nhấn Mạnh Khi Demo

- Nhập Lead một lần, sau đó convert ra Account + Contact + Opportunity.
- Không nhập ID thủ công, dùng lookup.
- Không hiển thị UUID thô.
- Có truy vết ai thực hiện hành động.
- Có cách ly dữ liệu giữa các tổ chức.
- Giao diện tiếng Việt, phù hợp người dùng Việt Nam.

## 6. Known Limitations

- Refresh token hiện dùng `js-cookie` cho MVP, production nên chuyển sang HttpOnly Secure Cookie.
- Dashboard chưa có bộ lọc theo khoảng thời gian.
- Global Search là MVP frontend parallel search, chưa có backend ranking/highlighting.
- Chưa có Flutter mobile app.
- Chưa deploy production chính thức.

## 7. Demo Checklist Nhanh

- [ ] Đăng nhập
- [ ] Dashboard
- [ ] Tạo Lead
- [ ] Thêm Note/Task
- [ ] Convert Lead
- [ ] Kiểm tra Account/Contact/Opportunity
- [ ] Update Opportunity Stage
- [ ] Complete Task
- [ ] Create/Close Case
- [ ] Recycle Bin
- [ ] Global Search
- [ ] Rival Org isolation
- [ ] Import CSV Lead/Account/Contact/Opportunity/Task/Case
- [ ] Web-to-Lead public form

## 8. Demo Import CSV

- Mở danh sách Lead, Account, Contact, Opportunity, Task hoặc Case.
- Bấm `Import CSV`, tải file mẫu, điền dữ liệu và import.
- Nhấn mạnh import xử lý từng dòng độc lập: dòng hợp lệ vẫn được tạo, dòng lỗi hoặc trùng dữ liệu được hiển thị trong bảng kết quả.
- Với Contact/Opportunity/Case có thể dùng `accountName` hoặc `contactEmail`; với Task có thể dùng `relatedType` + `relatedName`, không cần nhập UUID thủ công.

## 9. Demo Web-to-Lead

- Mở trang public `/dang-ky-tu-van`.
- Điền họ tên, công ty, email hoặc số điện thoại, và nhu cầu tư vấn.
- Gửi form, sau đó đăng nhập CRM để kiểm tra Lead mới.
- Mở Lead detail và chỉ ra section `Nhu cầu tư vấn`; nội dung này lấy từ field `description` và bao gồm nhu cầu khách nhập, quy mô công ty, thời gian muốn được liên hệ.
- Lead từ website luôn có `source = Website`, không cho người ngoài truyền `organizationId`, `ownerId`, `source`, hoặc `status`.
- Backend lấy tenant nhận Lead từ `PUBLIC_LEAD_ORGANIZATION_ID` và người phụ trách từ `PUBLIC_LEAD_OWNER_ID`.

Khi demo trên môi trường deploy/staging:

- Frontend deploy phải set `NEXT_PUBLIC_API_BASE_URL` trỏ đến backend deploy.
- Backend deploy phải có `PUBLIC_LEAD_ORGANIZATION_ID` và `PUBLIC_LEAD_OWNER_ID`.
- Kiểm tra nhanh `POST /public/lead-capture` trước buổi demo; nếu endpoint trả `404`, bản backend deploy chưa có code Web-to-Lead mới.

## 10. Demo Lead Assignment By Area

- Open Profile > `Cai dat tai khoan` > `Quy tac phan cong Lead`.
- Create a rule such as `Thanh pho Ho Chi Minh` + `Phuong Sai Gon` -> a Sales user.
- Submit a manual Lead or Web-to-Lead form with the same province/ward.
- Open Lead detail and verify `Nguoi phu trach` is the rule assignee.
- Verify Lead detail shows `Khu vuc phu trach` with province, ward, and address.
- If no rule matches, owner fallback remains the existing behavior: current user for manual/import flows, `PUBLIC_LEAD_OWNER_ID` for Web-to-Lead.
- Login as the assigned Sales user and verify they can see their assigned Lead; Admin/Manager can still see all organization Leads.
