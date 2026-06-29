import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxAttempts = 3;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          this.logger.error(
            'Database connection failed during startup. Continuing without an eager Prisma connection so the app can boot and retry on demand.',
            error instanceof Error ? error.stack : String(error)
          );
          return;
        }

        this.logger.warn(
          `Database connection failed during startup (attempt ${attempt}/${maxAttempts}). Retrying in ${retryDelayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
