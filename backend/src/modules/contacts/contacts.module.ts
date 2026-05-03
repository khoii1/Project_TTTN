import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { ContactsController } from './presentation/contacts.controller';
import { ContactService } from './application/services/contact.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContactsController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactsModule {}
