# Deployment Guide Với Supabase Free

## 1. Kiến Trúc Deploy Đề Xuất

- Database: Supabase Free PostgreSQL
- Backend: Render / Railway / VPS
- Frontend: Vercel
- ORM: Prisma

## 2. Tạo Database Supabase Free

1. Tạo project Supabase mới.
2. Mở phần database settings và lấy PostgreSQL connection string.
3. Cấu hình `DATABASE_URL` cho backend bằng connection string của Supabase.
4. Chọn connection string phù hợp với Prisma.
5. Không commit `DATABASE_URL` lên Git.

Lưu ý: Supabase có thể cung cấp nhiều loại connection string. Khi dùng Prisma, ưu tiên connection string PostgreSQL chuẩn và kiểm tra SSL/connection pooling theo hướng dẫn hiện tại của Supabase.

## 3. Backend Environment Variables

```env
DATABASE_URL=
JWT_ACCESS_TOKEN_SECRET=
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_SECRET=
JWT_REFRESH_TOKEN_EXPIRATION=7d
API_PORT=3000
API_VERSION=v1
CORS_ORIGIN=https://your-frontend-domain.com
NODE_ENV=production
BCRYPT_ROUNDS=10
```

Giải thích:

- `DATABASE_URL`: kết nối Supabase PostgreSQL.
- `JWT_ACCESS_TOKEN_SECRET`: secret ký access token.
- `JWT_REFRESH_TOKEN_SECRET`: secret ký refresh token.
- `JWT_ACCESS_TOKEN_EXPIRATION`: thời hạn access token, ví dụ `15m`.
- `JWT_REFRESH_TOKEN_EXPIRATION`: thời hạn refresh token, ví dụ `7d`.
- `PORT`: port runtime do production hosting cấp tự động, ví dụ Render/Railway.
- `API_PORT`: port fallback/local nếu hosting không cấp `PORT`.
- `API_VERSION`: version config của API.
- `CORS_ORIGIN`: domain frontend production được phép gọi API. Có thể khai báo nhiều domain bằng dấu phẩy, ví dụ `https://app.example.com,https://www.example.com`.
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
npx prisma db seed
```

Lưu ý:

- Production dùng `migrate deploy`, không dùng `migrate dev`.
- Seed chỉ dùng cho demo/staging, không dùng bừa cho production thật.

## 6. Deploy Order Checklist

- [ ] Create Supabase project
- [ ] Copy Supabase PostgreSQL `DATABASE_URL`
- [ ] Set backend environment variables
- [ ] Deploy backend
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma migrate deploy`
- [ ] Optional: seed demo data with `npx prisma db seed`
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

Staging có thể giữ Swagger tại `/api/docs` để demo và kiểm thử API. Production thật nên cân nhắc giới hạn hoặc tắt Swagger public nếu API không cần công khai.

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

- [ ] Login Sample admin
- [ ] Dashboard
- [ ] Create Lead
- [ ] Convert Lead
- [ ] Opportunity VNĐ
- [ ] Global Search
- [ ] Recycle Bin
- [ ] Logout
- [ ] Login Rival Org
- [ ] Kiểm tra không thấy dữ liệu Sample Company

## 12. Known Deploy Risks

- Supabase Free có giới hạn.
- Backend free hosting có thể sleep.
- Nếu backend sleep, request đầu tiên có thể chậm.
- CORS sai sẽ làm frontend không gọi được API.
- `DATABASE_URL` sai sẽ làm Prisma không kết nối được.
