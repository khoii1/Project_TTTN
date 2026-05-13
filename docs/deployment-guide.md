# Deployment Guide Với Supabase Free

## 1. Kiến Trúc Deploy Đề Xuất

- Database: Supabase Free PostgreSQL
- Backend: Render / Railway / VPS
- Frontend: Vercel
- ORM: Prisma

## 2. Tạo Database Supabase Free

1. Tạo project Supabase mới.
2. Mở phần database settings và lấy PostgreSQL connection string.
3. Cấu hình `DATABASE_URL` cho backend bằng Supabase transaction pooler connection string.
4. Cấu hình `DIRECT_URL` bằng Supabase Session pooler port `5432`, hoặc direct database connection string nếu môi trường hỗ trợ direct connection.
5. Không commit `DATABASE_URL` hoặc `DIRECT_URL` lên Git.

Lưu ý: Supabase có nhiều loại connection string. Với Prisma, nên dùng `DATABASE_URL` qua transaction pooler port `6543` cho runtime và `DIRECT_URL` qua Session pooler port `5432` cho migration. Nếu môi trường hỗ trợ IPv6 hoặc có IPv4 add-on, có thể dùng direct host `db.<project-ref>.supabase.co:5432` cho `DIRECT_URL`. Tránh chạy `prisma migrate deploy` qua transaction pooler `6543` với `pgbouncer=true` vì có thể rất chậm hoặc lỗi lock/transaction.

## 3. Backend Environment Variables

```env
DATABASE_URL=
DIRECT_URL=
JWT_ACCESS_TOKEN_SECRET=
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_SECRET=
JWT_REFRESH_TOKEN_EXPIRATION=7d
API_PORT=3000
API_VERSION=v1
CORS_ORIGIN=https://your-frontend-domain.com
ENABLE_SWAGGER=false
NODE_ENV=production
BCRYPT_ROUNDS=10
```

Giải thích:

- `DATABASE_URL`: kết nối Supabase PostgreSQL.
- `DIRECT_URL`: Supabase Session pooler port `5432` hoặc direct connection đến Supabase PostgreSQL, dùng bởi Prisma migration.
- `JWT_ACCESS_TOKEN_SECRET`: secret ký access token.
- `JWT_REFRESH_TOKEN_SECRET`: secret ký refresh token.
- `JWT_ACCESS_TOKEN_EXPIRATION`: thời hạn access token, ví dụ `15m`.
- `JWT_REFRESH_TOKEN_EXPIRATION`: thời hạn refresh token, ví dụ `7d`.
- `PORT`: port runtime do production hosting cấp tự động, ví dụ Render/Railway.
- `API_PORT`: port fallback/local nếu hosting không cấp `PORT`.
- `API_VERSION`: version config của API.
- `CORS_ORIGIN`: domain frontend production được phép gọi API. Có thể khai báo nhiều domain bằng dấu phẩy, ví dụ `https://app.example.com,https://www.example.com`.
- `ENABLE_SWAGGER`: bật/tắt Swagger public. Dev bật mặc định nếu không khai báo. Production nên để `false`, riêng staging/demo có thể đặt `true`.
- `NODE_ENV`: dùng `production` khi deploy.
- `BCRYPT_ROUNDS`: số rounds bcrypt, mặc định `10`.

JWT secrets phải mạnh và không dùng secret mặc định.

Lưu ý CORS: production phải set `CORS_ORIGIN` bằng domain frontend thật trên Vercel. Nếu có nhiều domain frontend hợp lệ, dùng comma-separated string. Local dev vẫn cho phép `localhost` / `127.0.0.1` với các port dev.

## 4. Frontend Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=
```

Ví dụ:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com
```

## 5. Prisma Production Commands

```bash
npx prisma generate
npx prisma migrate deploy
```

Nếu cần seed demo data:

```bash
npm run prisma:seed
```

Lưu ý:

- Production dùng `migrate deploy`, không dùng `migrate dev`.
- Prisma migration sẽ dùng `DIRECT_URL` nếu Prisma schema có `directUrl = env("DIRECT_URL")`.
- Nếu `DIRECT_URL` dạng `db.<project-ref>.supabase.co:5432` báo `P1001`, hãy đổi sang Supabase Session pooler dạng `<region>.pooler.supabase.com:5432/postgres`.
- Seed tạo dữ liệu demo tiếng Việt có liên kết đầy đủ cho 2 tenant: `Công ty Mẫu Việt Nam` và `Công ty Đối Thủ`.
- Seed sẽ xóa dữ liệu hiện có trước khi tạo lại demo data; chỉ dùng cho demo/staging, không dùng bừa cho production thật.

## 6. Deploy Order Checklist

- [ ] Create Supabase project
- [ ] Copy Supabase PostgreSQL `DATABASE_URL`
- [ ] Copy Supabase direct PostgreSQL `DIRECT_URL`
- [ ] Set backend environment variables
- [ ] Deploy backend
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma migrate deploy`
- [ ] Optional: seed demo data with `npm run prisma:seed`
- [ ] Check backend health endpoint `/health`
- [ ] Set frontend `NEXT_PUBLIC_API_BASE_URL`
- [ ] Deploy frontend
- [ ] Run post-deploy QA

## 7. Backend Deploy Checklist

- [ ] Cài dependencies
- [ ] Build backend
- [ ] Set environment variables
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma migrate deploy`
- [ ] Start backend production
- [ ] Kiểm tra `/health`
- [ ] Kiểm tra `/api/docs` nếu Swagger còn bật
- [ ] Kiểm tra login/register
- [ ] Kiểm tra CORS với frontend

Recommended backend commands:

```bash
npm install
npm run build
npm run prisma:generate
npm run prisma:migrate:prod
npm run start:prod
```

Nếu Render đang dùng default start command `yarn start` hoặc `npm run start`, script `start` của backend cũng chạy production entrypoint `node dist/src/main.js`.

Staging có thể giữ Swagger tại `/api/docs` để demo và kiểm thử API bằng cách đặt `ENABLE_SWAGGER=true`. Production thật nên đặt `ENABLE_SWAGGER=false` hoặc không khai báo biến này khi `NODE_ENV=production` để không expose Swagger public.

Lưu ý hosting: backend hỗ trợ thứ tự đọc port `PORT > API_PORT > 3000`. Render/Railway thường cấp `PORT`; local/dev có thể tiếp tục dùng `API_PORT`.

## 8. Frontend Deploy Checklist

- [ ] Set `NEXT_PUBLIC_API_BASE_URL`
- [ ] Build frontend
- [ ] Deploy Vercel
- [ ] Kiểm tra proxy route protection
- [ ] Kiểm tra login/logout
- [ ] Kiểm tra dashboard gọi API thật

Recommended frontend commands:

```bash
npm install
npm run build
npm run start
```

Trên Vercel, `NEXT_PUBLIC_API_BASE_URL` phải trỏ đến backend staging/demo thật, không dùng `localhost`.

## 9. Supabase Free Lưu Ý

- Phù hợp demo/staging/học tập.
- Có giới hạn dung lượng và tài nguyên.
- Không nên dùng cho production nhiều người dùng nếu chưa nâng cấp.
- Cần backup dữ liệu nếu demo quan trọng.
- Không lưu dữ liệu thật/nhạy cảm khi chỉ dùng môi trường demo.

## 10. Production Security Checklist

- [ ] Dùng HTTPS.
- [ ] JWT secrets mạnh.
- [ ] CORS chỉ allow frontend domain.
- [ ] Không expose database URL.
- [ ] Không commit `.env`.
- [ ] Không expose `passwordHash` / `refreshTokenHash`.
- [ ] Kiểm tra multi-tenant isolation.
- [ ] Sau này nên chuyển refresh token sang HttpOnly Secure Cookie.

## 11. Post-Deploy QA Checklist

- [ ] Login Công ty Mẫu Việt Nam admin
- [ ] Dashboard
- [ ] Create Lead
- [ ] Convert Lead
- [ ] Opportunity VNĐ
- [ ] Global Search
- [ ] Recycle Bin
- [ ] Logout
- [ ] Login Công ty Đối Thủ
- [ ] Kiểm tra không thấy dữ liệu Công ty Mẫu Việt Nam

## 12. Known Deploy Risks

- Supabase Free có giới hạn.
- Backend free hosting có thể sleep.
- Nếu backend sleep, request đầu tiên có thể chậm.
- CORS sai sẽ làm frontend không gọi được API.
- `DATABASE_URL` sai sẽ làm Prisma không kết nối được.
