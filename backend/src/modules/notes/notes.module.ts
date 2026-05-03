import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { NotesController } from './presentation/notes.controller';
import { NoteService } from './application/services/note.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotesController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NotesModule {}
