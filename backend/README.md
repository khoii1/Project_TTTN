# CRM Backend — Salesforce-style Multi-Tenant API

Hệ thống CRM backend theo phong cách Salesforce, hỗ trợ multi-tenant, xây dựng bằng **NestJS 10**, **TypeScript 5**, **PostgreSQL 16** và **Prisma 5 ORM**.

---

## Mục lục

- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Cài đặt Database](#cài-đặt-database)
- [NPM Scripts](#npm-scripts)
- [Kiến trúc dự án](#kiến-trúc-dự-án)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Luồng xác thực](#luồng-xác-thực)
- [Mô hình bảo mật](#mô-hình-bảo-mật)
- [Audit Logging](#audit-logging)
- [Lead Conversion](#lead-conversion)
- [Testing](#testing)
- [Tài khoản test](#tài-khoản-test)
- [Báo cáo Backend Audit](#báo-cáo-backend-audit)

---

## Công nghệ sử dụng

| Thành phần       | Công nghệ                          |
| ---------------- | ----------------------------------- |
| Framework        | NestJS 10                           |
| Ngôn ngữ         | TypeScript 5                        |
| Database         | PostgreSQL 16                       |
| ORM              | Prisma 5                            |
| Xác thực         | JWT (Access + Refresh tokens)       |
| Hash mật khẩu    | bcrypt (10 rounds)                  |
| Validation       | class-validator + class-transformer |
| API Docs         | Swagger / OpenAPI 3.0               |
| Testing          | Jest + ts-jest                      |
| Container        | Docker + Docker Compose             |

---

## Bắt đầu nhanh

```bash
# 1. Cài dependencies
npm install

# 2. Khởi động PostgreSQL qua Docker
docker compose up -d

# 3. Chạy migration
npm run prisma:migrate

# 4. Generate Prisma client
npm run prisma:generate

# 5. Seed dữ liệu mẫu (2 organizations)
npm run prisma:seed

# 6. Chạy server dev
npm run start:dev

# 7. Mở Swagger UI
#    http://localhost:3000/api/docs
```

---

## Biến môi trường

Tạo file `.env` từ `.env.example`:

```env
# Database
DATABASE_URL=postgresql://postgres:12345@localhost:5432/crm_db

# JWT
JWT_ACCESS_TOKEN_SECRET=your_access_token_secret_key_change_in_production
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_SECRET=your_refresh_token_secret_key_change_in_production
JWT_REFRESH_TOKEN_EXPIRATION=7d

# API
API_PORT=3000
API_VERSION=v1
NODE_ENV=development

# Bcrypt
BCRYPT_ROUNDS=10
```

---

## Cài đặt Database

### Docker Compose (khuyến nghị)

```bash
docker compose up -d
```

Khởi động PostgreSQL trên port **5432**, user `postgres`, password `12345`, database `crm_db`.

### Local PostgreSQL

1. Cài PostgreSQL 16
2. Tạo database: `CREATE DATABASE crm_db;`
3. Cập nhật `DATABASE_URL` trong `.env`

### Migration & Seed

```bash
npm run prisma:migrate     # Chạy migrations
npm run prisma:generate    # Generate Prisma client
npm run prisma:seed        # Seed dữ liệu mẫu (2 organizations)
npm run prisma:reset       # Reset DB + re-seed (xóa hết data)
npx prisma studio          # Mở Prisma Studio (visual DB browser)
```

---

## NPM Scripts

| Script               | Lệnh                        | Mô tả                         |
| -------------------- | ---------------------------- | ------------------------------ |
| `start:dev`          | `nest start --watch`         | Dev server với hot reload      |
| `build`              | `nest build`                 | Build production               |
| `start:prod`         | `node dist/main`             | Chạy bản production            |
| `test`               | `jest`                       | Chạy toàn bộ unit tests        |
| `test:e2e`           | `jest --config jest-e2e.json`| Chạy E2E tests                 |
| `test:cov`           | `jest --coverage`            | Báo cáo test coverage          |
| `lint`               | `eslint --fix`               | Lint + auto-fix                |
| `format`             | `prettier --write`           | Format code                    |
| `prisma:migrate`     | `prisma migrate dev`         | Chạy migrations                |
| `prisma:seed`        | `ts-node prisma/seed.ts`     | Seed dữ liệu                  |
| `prisma:generate`    | `prisma generate`            | Generate Prisma client         |
| `prisma:reset`       | `prisma migrate reset`       | Reset + re-seed                |

---

## Kiến trúc dự án

```
src/
├── main.ts                              # Bootstrap + Swagger setup
├── app.module.ts                        # Root module
│
├── config/                              # Cấu hình môi trường
│   ├── app.config.ts                    # Port, version, env
│   ├── jwt.config.ts                    # JWT secrets + expiration
│   ├── database.config.ts              # Database URL
│   ├── bcrypt.config.ts                # Bcrypt rounds
│   └── env.validation.ts              # Joi validation schema
│
├── common/                              # Tiện ích dùng chung
│   ├── pagination/pagination.utils.ts  # calculatePagination, calculateMeta
│   └── types/response.types.ts         # PaginatedResponse, PaginationMeta
│
├── shared/                              # Components dùng chung
│   ├── guards/jwt.guard.ts             # JWT authentication guard
│   ├── guards/role.guard.ts            # RBAC authorization guard
│   ├── decorators/current-user.decorator.ts  # @CurrentUser()
│   ├── decorators/roles.decorator.ts         # @Roles()
│   ├── strategies/jwt.strategy.ts      # Passport JWT strategy
│   └── filters/global-exception.filter.ts    # Global exception handler
│
├── infrastructure/                      # Infrastructure layer
│   ├── database/
│   │   ├── prisma.module.ts            # Prisma module
│   │   └── prisma.service.ts           # PrismaClient wrapper
│   ├── security/
│   │   ├── password-hasher.service.ts  # bcrypt hash/compare
│   │   └── token.service.ts           # JWT generation/verification
│   └── audit/
│       ├── audit-log.module.ts         # Global audit module
│       └── audit-log.service.ts        # AuditLogService
│
└── modules/                             # Feature modules
    ├── auth/          # register, login, refresh, logout
    ├── organizations/ # GET /organizations/me
    ├── users/         # CRUD (ADMIN only cho write)
    ├── leads/         # CRUD + status change + conversion
    ├── accounts/      # CRUD
    ├── contacts/      # CRUD
    ├── opportunities/ # CRUD + stage change
    ├── tasks/         # CRUD + complete/status change
    ├── notes/         # CRUD
    └── cases/         # CRUD + status change
```

Mỗi module theo cấu trúc:
```
modules/<feature>/
├── <feature>.module.ts
├── application/
│   ├── dto/<feature>.dto.ts       # DTOs với class-validator
│   └── services/<feature>.service.ts  # Business logic
└── presentation/
    └── <feature>.controller.ts    # Thin controller
```

---

## Database Schema

**11 models** trong `prisma/schema.prisma`:

| Model          | Mô tả                                       |
| -------------- | -------------------------------------------- |
| Organization   | Tenant container — cách ly data giữa các tổ chức |
| User           | 4 roles: ADMIN, MANAGER, SALES, SUPPORT      |
| Lead           | 6 trạng thái, có thể convert thành Account+Contact+Opportunity |
| Account        | Thông tin công ty khách hàng                  |
| Contact        | Liên hệ cá nhân, thuộc về 1 Account          |
| Opportunity    | 5 stages: QUALIFY → PROPOSE → NEGOTIATE → WON/LOST |
| Task           | Công việc giao cho team, có dueDate + priority |
| Note           | Ghi chú gắn vào bất kỳ entity nào            |
| Case           | Ticket hỗ trợ với status + priority           |
| AuditLog       | Nhật ký hành động: create, update, delete, conversion... |

**Tất cả entity đều có**: `id (UUID)`, `organization_id`, `owner_id`, `created_at`, `updated_at`, `deleted_at` (soft delete).

---

## API Endpoints

**Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### Auth (Public — không cần token)

| Method | Endpoint         | Mô tả                             |
| ------ | ---------------- | ---------------------------------- |
| POST   | `/auth/register` | Tạo organization + admin user      |
| POST   | `/auth/login`    | Đăng nhập → access + refresh token |
| POST   | `/auth/refresh`  | Rotate tokens                      |
| POST   | `/auth/logout`   | Xóa refresh token                  |

### Users (ADMIN mới có quyền write)

| Method | Endpoint     | Mô tả            |
| ------ | ------------ | ----------------- |
| POST   | `/users`     | Tạo user          |
| GET    | `/users`     | Danh sách users   |
| GET    | `/users/:id` | Chi tiết user     |
| PATCH  | `/users/:id` | Cập nhật user     |
| DELETE | `/users/:id` | Soft delete user  |

### Leads

| Method | Endpoint              | Query Params                |
| ------ | --------------------- | --------------------------- |
| POST   | `/leads`              | —                           |
| GET    | `/leads`              | page, limit, search, status |
| GET    | `/leads/:id`          | —                           |
| PATCH  | `/leads/:id`          | —                           |
| PATCH  | `/leads/:id/status`   | —                           |
| POST   | `/leads/:id/convert`  | —                           |
| DELETE | `/leads/:id`          | —                           |

### Accounts

| Method | Endpoint         | Query Params        |
| ------ | ---------------- | ------------------- |
| POST   | `/accounts`      | —                   |
| GET    | `/accounts`      | page, limit, search |
| GET    | `/accounts/:id`  | —                   |
| PATCH  | `/accounts/:id`  | —                   |
| DELETE | `/accounts/:id`  | —                   |

### Contacts

| Method | Endpoint         | Query Params        |
| ------ | ---------------- | ------------------- |
| POST   | `/contacts`      | —                   |
| GET    | `/contacts`      | page, limit, search |
| GET    | `/contacts/:id`  | —                   |
| PATCH  | `/contacts/:id`  | —                   |
| DELETE | `/contacts/:id`  | —                   |

### Opportunities

| Method | Endpoint                    | Query Params                   |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/opportunities`            | —                              |
| GET    | `/opportunities`            | page, limit, search, stage     |
| GET    | `/opportunities/:id`        | —                              |
| PATCH  | `/opportunities/:id`        | —                              |
| PATCH  | `/opportunities/:id/stage`  | —                              |
| DELETE | `/opportunities/:id`        | —                              |

### Tasks

| Method | Endpoint               | Query Params        |
| ------ | ---------------------- | ------------------- |
| POST   | `/tasks`               | —                   |
| GET    | `/tasks`               | page, limit, status |
| GET    | `/tasks/:id`           | —                   |
| PATCH  | `/tasks/:id`           | —                   |
| PATCH  | `/tasks/:id/complete`  | —                   |
| DELETE | `/tasks/:id`           | —                   |

### Notes

| Method | Endpoint      | Query Params             |
| ------ | ------------- | ------------------------ |
| POST   | `/notes`      | —                        |
| GET    | `/notes`      | page, limit, relatedId   |
| GET    | `/notes/:id`  | —                        |
| PATCH  | `/notes/:id`  | —                        |
| DELETE | `/notes/:id`  | —                        |

### Cases

| Method | Endpoint             | Query Params        |
| ------ | -------------------- | ------------------- |
| POST   | `/cases`             | —                   |
| GET    | `/cases`             | page, limit, status |
| GET    | `/cases/:id`         | —                   |
| PATCH  | `/cases/:id`         | —                   |
| PATCH  | `/cases/:id/status`  | —                   |
| DELETE | `/cases/:id`         | —                   |

### Organizations

| Method | Endpoint             | Mô tả                  |
| ------ | -------------------- | ----------------------- |
| GET    | `/organizations/me`  | Lấy thông tin org hiện tại |

**Tổng: 50+ endpoints**

---

## Luồng xác thực

```
1. POST /auth/register   →  Tạo org + admin user → trả về accessToken + refreshToken
2. POST /auth/login      →  Xác thực credentials → trả về accessToken + refreshToken
3. Gửi request với header: Authorization: Bearer <accessToken>
4. POST /auth/refresh    →  refreshToken cũ → accessToken mới + refreshToken mới (rotated)
5. POST /auth/logout     →  Xóa refreshTokenHash khỏi DB
```

- Access token hết hạn sau **15 phút**
- Refresh token hết hạn sau **7 ngày**
- Refresh token được **hash bằng bcrypt** trước khi lưu
- Token được **rotate** mỗi lần refresh (token cũ bị vô hiệu hóa)

---

## Mô hình bảo mật

### Multi-Tenant Isolation

Mọi query đều được scope bởi `organizationId` từ JWT token. User **không bao giờ** truy cập được data của tổ chức khác.

```typescript
// Mọi findFirst/findMany đều có organizationId
const lead = await this.prisma.lead.findFirst({
  where: { id: leadId, organizationId, deletedAt: null },
});
```

**Đã kiểm chứng bằng 30 unit tests** (xem phần Testing).

### Soft Delete

- Tất cả entity dùng `deletedAt` thay vì xóa cứng
- List endpoints lọc `deletedAt: null`
- Detail endpoints lọc `deletedAt: null`
- Update endpoints từ chối record đã xóa
- Delete endpoints chỉ set `deletedAt = new Date()`

### Refresh Token Security

- Raw refresh token **không bao giờ** lưu trong database
- Chỉ lưu **bcrypt hash** trong `refresh_token_hash`
- Token được **rotate** mỗi lần gọi `/auth/refresh`
- Hash bị **xóa** khi `/auth/logout`
- `refreshTokenHash` **không bao giờ** xuất hiện trong API response

### RBAC

4 roles: `ADMIN`, `MANAGER`, `SALES`, `SUPPORT`
- Chỉ ADMIN mới có quyền create/update/delete users

---

## Audit Logging

### AuditLogService

Hệ thống audit log ghi lại mọi hành động quan trọng vào bảng `audit_logs`.

**Service**: `src/infrastructure/audit/audit-log.service.ts`
- Global module — available cho tất cả services
- Wrapped trong try/catch — lỗi audit log không bao giờ làm hỏng business operation

### Các hành động được ghi log

| Action            | Khi nào                                    | Áp dụng cho              |
| ----------------- | ------------------------------------------ | ------------------------ |
| `CREATE`          | Tạo mới entity                             | Tất cả 7 entity services |
| `UPDATE`          | Cập nhật entity                            | Tất cả 7 entity services |
| `SOFT_DELETE`     | Xóa mềm entity                            | Tất cả 7 entity services |
| `LEAD_CONVERSION` | Convert lead → Account + Contact + Opportunity | LeadService          |
| `STAGE_CHANGE`    | Đổi stage của Opportunity                  | OpportunityService       |
| `STATUS_CHANGE`   | Đổi status của Lead hoặc Case              | LeadService, CaseService |
| `TASK_COMPLETION` | Hoàn thành hoặc đổi status Task            | TaskService              |

### Cấu trúc Audit Log

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "userId": "uuid",
  "action": "LEAD_CONVERSION",
  "entityType": "Lead",
  "entityId": "uuid",
  "oldValues": { "status": "NEW" },
  "newValues": { "status": "CONVERTED", "convertedAccountId": "..." },
  "createdAt": "2026-04-29T08:00:00.000Z"
}
```

---

## Lead Conversion

`POST /leads/:id/convert` chạy trong **Prisma transaction**:

1. Kiểm tra lead tồn tại và chưa `CONVERTED`
2. **Tạo Account** từ tên công ty của lead
3. **Tạo Contact** từ thông tin cá nhân của lead
4. **Tạo Opportunity** ở stage `QUALIFY`
5. **Cập nhật Lead** → status = `CONVERTED`, lưu IDs các entity đã tạo
6. **Ghi audit log** với action `LEAD_CONVERSION`
7. Nếu bất kỳ bước nào fail → **toàn bộ transaction rollback**

---

## Testing

```bash
npm test           # Chạy toàn bộ tests (47 tests)
npm run test:watch # Watch mode
npm run test:cov   # Coverage report
```

### Test Suites

| File                                | Tests | Mô tả                                           |
| ----------------------------------- | ----- | ------------------------------------------------ |
| `test/auth.service.spec.ts`         | 6     | Register, login, logout, duplicate email         |
| `test/lead-conversion.spec.ts`      | 5     | Conversion thành công, already converted, not found |
| `test/lead-conversion-e2e.spec.ts`  | 6     | Conversion E2E: cross-org, double convert, audit log, account data |
| `test/organization-isolation.spec.ts`| 30   | Multi-tenant isolation cho 6 entity services     |
| **Tổng**                            | **47**| **4 suites, tất cả pass**                        |

### Organization Isolation Tests (30 tests)

Mỗi entity (Lead, Account, Contact, Opportunity, Task, Case) được test 5 trường hợp:

- ✅ Org A user có thể đọc record của Org A
- ❌ Org A user KHÔNG THỂ đọc record của Org B
- ❌ Org A user KHÔNG THỂ update record của Org B
- ❌ Org A user KHÔNG THỂ delete record của Org B
- ✅ findAll chỉ trả về records của Org A

### Lead Conversion E2E Tests (6 tests)

- ✅ Convert lead thành công → tạo Account + Contact + Opportunity
- ❌ Không cho convert lead đã converted (BadRequestException)
- ❌ Không cho convert lead của org khác (NotFoundException)
- ❌ Không cho convert lead đã bị soft delete (NotFoundException)
- ✅ Audit log được ghi với action `LEAD_CONVERSION`
- ✅ Account được tạo đúng company name từ lead

### Chạy test qua Swagger UI

1. Mở [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
2. **Login**: `POST /auth/login` với tài khoản test
3. Copy `accessToken` từ response
4. Click nút **Authorize** → paste `Bearer <accessToken>`
5. Tạo Lead → Convert → Kiểm tra Account/Contact/Opportunity đã tạo
6. Login org khác → verify không thấy data org trước

---

## Tài khoản test

Sau khi chạy `npm run prisma:seed`, có **2 tổ chức**:

### Organization: Sample Company Inc.

| Role    | Email                  | Password     |
| ------- | ---------------------- | ------------ |
| ADMIN   | admin@example.com      | Admin@123    |
| MANAGER | manager@example.com    | Manager@123  |
| SALES   | sales@example.com      | Sales@123    |

### Organization: Rival Corp

| Role    | Email              | Password     |
| ------- | ------------------ | ------------ |
| ADMIN   | admin@rival.com    | Rival@123    |

> Dùng 2 tổ chức để test multi-tenant isolation: login Org A, không thấy data Org B.

---

## Báo cáo Backend Audit

Code review toàn diện được thực hiện ngày **29/04/2026**, bao gồm 10 modules, Prisma schema, authentication layer, và test suite.

### Đã kiểm chứng đạt ✅

| Hạng mục                  | Kết quả | Chi tiết |
| -------------------------- | ------- | -------- |
| Multi-tenant isolation     | ✅ Pass | Tất cả 7 services scope query bằng `organizationId` |
| Soft delete consistency    | ✅ Pass | Mọi find/update/delete check `deletedAt: null` |
| Lead conversion transaction| ✅ Pass | Dùng `prisma.$transaction(async (tx) => {...})` đầy đủ 4 bước |
| Refresh token hashing      | ✅ Pass | Hash bằng bcrypt, rotate khi refresh, xóa khi logout |
| Token không bị lộ          | ✅ Pass | `refreshTokenHash` không có trong bất kỳ response DTO |
| Input validation           | ✅ Pass | class-validator trên tất cả DTOs |
| Global error handling      | ✅ Pass | GlobalExceptionFilter bắt mọi exception |
| Pagination                 | ✅ Pass | MAX_LIMIT=100, page/limit validation |

### Đã hoàn thành trong đợt hardening

| Công việc                    | Trạng thái | Chi tiết |
| ---------------------------- | ---------- | -------- |
| AuditLogService              | ✅ Done | Tạo service + tích hợp vào 7 entity services |
| Seed data 2 organizations    | ✅ Done | Thêm "Rival Corp" với admin user, lead, account |
| Organization isolation tests | ✅ Done | 30 tests cho 6 entities |
| Lead conversion E2E tests    | ✅ Done | 6 tests bao gồm cross-org + audit log |
| Fix broken existing tests    | ✅ Done | Sửa 2 tests có mock thiếu return value |
| jest-e2e.json                | ✅ Done | Tạo E2E test config |

### Kết quả

```
Build:       ✅ Exit code 0
Test Suites: 4 passed, 4 total
Tests:       47 passed, 47 total
```

---

## Docker Deployment

```bash
# Build image
docker build -t crm-backend:latest .

# Chạy với env file
docker run -p 3000:3000 --env-file .env crm-backend:latest
```

### Production Checklist

- [ ] Tạo JWT secrets mạnh (tối thiểu 256-bit)
- [ ] Set `NODE_ENV=production`
- [ ] Chạy `npm run prisma:migrate:prod` (không dùng `dev`)
- [ ] Bật HTTPS / reverse proxy
- [ ] Cài đặt database backup
- [ ] Cấu hình monitoring & logging

---

## License

MIT
