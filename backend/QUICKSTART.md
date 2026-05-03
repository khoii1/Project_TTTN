# CRM Backend - Quick Start Guide

## Project Initialization Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

Verify PostgreSQL is running:

```bash
docker compose ps
```

### 3. Set Up Database

```bash
# Run all migrations
npx prisma migrate dev

# Or reset the database and run migrations
npx prisma migrate reset --force
```

### 4. Seed Sample Data (Optional)

```bash
npx prisma db seed
```

This creates:

- 1 organization
- 3 users (Admin, Manager, Sales with ADMIN, MANAGER, SALES roles)
- 2 leads
- 2 accounts
- 2 contacts
- 2 opportunities
- 1 task
- 1 note
- 1 case

Test Credentials:

- Admin: admin@example.com / Admin@123
- Manager: manager@example.com / Manager@123
- Sales: sales@example.com / Sales@123

### 5. Start Development Server

```bash
npm run start:dev
```

The API will be available at:

- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs

## Quick API Test

### 1. Register (Create Organization and Admin User)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "My Company",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@mycompany.com",
    "password": "SecurePass123"
  }'
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "john@mycompany.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "organizationId": "uuid"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@mycompany.com",
    "password": "SecurePass123"
  }'
```

### 3. Create a Lead

```bash
curl -X POST http://localhost:3000/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "firstName": "Alice",
    "lastName": "Johnson",
    "company": "Tech Corp",
    "email": "alice@techcorp.com",
    "phone": "+1-555-0100",
    "title": "CTO",
    "source": "Website",
    "industry": "Technology"
  }'
```

### 4. Get All Leads with Pagination

```bash
curl "http://localhost:3000/leads?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Convert a Lead

```bash
curl -X POST http://localhost:3000/leads/LEAD_ID/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "contactTitle": "Managing Director",
    "accountType": "Enterprise"
  }'
```

This creates:

- 1 Account from the lead's company
- 1 Contact with lead's personal info
- 1 Opportunity in QUALIFY stage

## Project Structure Overview

```
crm-backend/
├── prisma/                      # Database
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Root module
│   ├── config/                 # Configuration
│   │   ├── app.config.ts
│   │   ├── jwt.config.ts
│   │   ├── database.config.ts
│   │   ├── bcrypt.config.ts
│   │   └── env.validation.ts
│   ├── common/                 # Common utilities
│   │   ├── types/
│   │   ├── pagination/
│   │   └── responses/
│   ├── shared/                 # Shared components
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── strategies/
│   │   └── utils/
│   ├── infrastructure/         # Infrastructure layer
│   │   ├── database/
│   │   └── security/
│   └── modules/                # Feature modules
│       ├── auth/
│       ├── organizations/
│       ├── users/
│       ├── leads/
│       ├── accounts/
│       ├── contacts/
│       ├── opportunities/
│       ├── tasks/
│       ├── notes/
│       └── cases/
├── test/                       # Tests
├── docker-compose.yml
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc.json
└── README.md
```

## Module Endpoints

### Auth (No authentication required)

- POST `/auth/register` - Register organization and admin user
- POST `/auth/login` - Login
- POST `/auth/refresh` - Refresh access token
- POST `/auth/logout` - Logout

### Organizations

- GET `/organizations/me` - Get current organization

### Users

- POST `/users` - Create user (ADMIN only)
- GET `/users` - Get all users
- GET `/users/:id` - Get user
- PATCH `/users/:id` - Update user (ADMIN only)
- DELETE `/users/:id` - Delete user (ADMIN only)

### Leads

- POST `/leads` - Create lead
- GET `/leads` - Get leads with pagination
- GET `/leads/:id` - Get lead
- PATCH `/leads/:id` - Update lead
- PATCH `/leads/:id/status` - Change lead status
- POST `/leads/:id/convert` - Convert lead
- DELETE `/leads/:id` - Delete lead

### Accounts

- POST `/accounts` - Create account
- GET `/accounts` - Get accounts with pagination
- GET `/accounts/:id` - Get account
- PATCH `/accounts/:id` - Update account
- DELETE `/accounts/:id` - Delete account

### Contacts

- POST `/contacts` - Create contact
- GET `/contacts` - Get contacts with pagination
- GET `/contacts/:id` - Get contact
- PATCH `/contacts/:id` - Update contact
- DELETE `/contacts/:id` - Delete contact

### Opportunities

- POST `/opportunities` - Create opportunity
- GET `/opportunities` - Get opportunities with pagination
- GET `/opportunities/:id` - Get opportunity
- PATCH `/opportunities/:id` - Update opportunity
- PATCH `/opportunities/:id/stage` - Change opportunity stage
- DELETE `/opportunities/:id` - Delete opportunity

### Tasks

- POST `/tasks` - Create task
- GET `/tasks` - Get tasks with pagination
- GET `/tasks/:id` - Get task
- PATCH `/tasks/:id` - Update task
- PATCH `/tasks/:id/complete` - Change task status
- DELETE `/tasks/:id` - Delete task

### Notes

- POST `/notes` - Create note
- GET `/notes` - Get notes with pagination
- GET `/notes/:id` - Get note
- PATCH `/notes/:id` - Update note
- DELETE `/notes/:id` - Delete note

### Cases

- POST `/cases` - Create case
- GET `/cases` - Get cases with pagination
- GET `/cases/:id` - Get case
- PATCH `/cases/:id` - Update case
- PATCH `/cases/:id/status` - Change case status
- DELETE `/cases/:id` - Delete case

## Useful Commands

```bash
# Development
npm run start:dev                # Start in watch mode
npm run build                    # Build for production
npm run start:prod               # Run production build

# Code quality
npm run lint                     # Run ESLint
npm run format                   # Format with Prettier

# Testing
npm run test                     # Run tests
npm run test:watch               # Watch mode
npm run test:cov                 # Coverage report

# Database
npx prisma studio               # Open Prisma Studio GUI
npx prisma migrate dev           # Create and run migrations
npx prisma db seed              # Run seed script
npx prisma migrate reset         # Reset database

# Other
npm run prisma:generate         # Generate Prisma client
```

## Environment Variables

All variables are in `.env` file:

```env
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm_db
JWT_ACCESS_TOKEN_SECRET=your_secret
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_SECRET=your_refresh_secret
JWT_REFRESH_TOKEN_EXPIRATION=7d
API_PORT=3000
API_VERSION=v1
NODE_ENV=development
BCRYPT_ROUNDS=10
```

## Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker build -t crm-backend:latest .
docker run -p 3000:3000 --env-file .env crm-backend:latest
```

### Generate Strong JWT Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Documentation

- **Swagger UI**: http://localhost:3000/api/docs
- **Full README**: See [README.md](./README.md)

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
docker compose ps

# Restart PostgreSQL
docker compose restart postgres
```

### Prisma Migration Issues

```bash
# Reset database and migrations
npx prisma migrate reset --force

# Create new migration
npx prisma migrate dev --name migration_name
```

### Port Already in Use

```bash
# Change API port in .env
API_PORT=3001
```

## Support

For issues or questions:

1. Check the full [README.md](./README.md)
2. Review [NestJS documentation](https://docs.nestjs.com)
3. Check [Prisma documentation](https://www.prisma.io/docs)

---

Enjoy building with the CRM Backend!
