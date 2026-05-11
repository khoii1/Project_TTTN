import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NoteService } from '../application/services/note.service';
import { CreateNoteDto, UpdateNoteDto, NoteResponseDto } from '../application/dto/note.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';

@ApiTags('Notes')
@Controller('notes')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class NotesController {
  constructor(private noteService: NoteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  @ApiResponse({ status: 201, description: 'Note created', type: NoteResponseDto })
  async create(
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: TokenPayload
  ): Promise<NoteResponseDto> {
    return this.noteService.create(user.organizationId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notes with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'relatedType', required: false, type: String })
  @ApiQuery({ name: 'relatedId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Notes list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('relatedType') relatedType?: string,
    @Query('relatedId') relatedId?: string
  ): Promise<PaginatedResponse<NoteResponseDto>> {
    return this.noteService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      relatedType,
      relatedId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get note by ID' })
  @ApiResponse({ status: 200, description: 'Note details', type: NoteResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<NoteResponseDto> {
    return this.noteService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note' })
  @ApiResponse({ status: 200, description: 'Note updated', type: NoteResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: TokenPayload
  ): Promise<NoteResponseDto> {
    return this.noteService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete note' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.noteService.delete(id, user.organizationId);
    return { message: 'Note deleted successfully' };
  }
}
