import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import bcryptConfig from './config/bcrypt.config';
import { validationSchema } from './config/env.validation';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AuditLogModule } from './infrastructure/audit/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotesModule } from './modules/notes/notes.module';
import { CasesModule } from './modules/cases/cases.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [appConfig, jwtConfig, databaseConfig, bcryptConfig],
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    LeadsModule,
    AccountsModule,
    ContactsModule,
    OpportunitiesModule,
    TasksModule,
    NotesModule,
    CasesModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
