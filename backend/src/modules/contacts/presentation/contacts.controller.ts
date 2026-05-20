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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContactService } from '../application/services/contact.service';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactResponseDto,
} from '../application/dto/contact.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';
import { ImportCsvResult } from '../../../common/import-csv/import-csv.types';
import { assertCsvFile, CSV_MAX_FILE_SIZE_BYTES } from '../../../common/import-csv/import-csv.utils';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created', type: ContactResponseDto })
  async create(
    @Body() dto: CreateContactDto,
    @CurrentUser() user: TokenPayload
  ): Promise<ContactResponseDto> {
    return this.contactService.create(user.organizationId, user.sub, dto);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CSV_MAX_FILE_SIZE_BYTES } }))
  @ApiOperation({ summary: 'Import contacts from CSV' })
  async importCsv(
    @UploadedFile() file: any,
    @CurrentUser() user: TokenPayload
  ): Promise<ImportCsvResult> {
    const buffer = assertCsvFile(file);
    return this.contactService.importCsv(user.organizationId, user.sub, buffer);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contacts with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Contacts list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('accountId') accountId?: string,
    @Query('source') source?: string,
    @Query('deleted') deleted?: string
  ): Promise<PaginatedResponse<ContactResponseDto>> {
    return this.contactService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      source,
      deleted === 'true',
      accountId
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact details', type: ContactResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<ContactResponseDto> {
    return this.contactService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact' })
  @ApiResponse({ status: 200, description: 'Contact updated', type: ContactResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: TokenPayload
  ): Promise<ContactResponseDto> {
    return this.contactService.update(id, user.organizationId, dto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted contact' })
  @ApiResponse({ status: 200, description: 'Contact restored', type: ContactResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<ContactResponseDto> {
    return this.contactService.restore(id, user.organizationId, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.contactService.delete(id, user.organizationId, user.sub);
    return { message: 'Contact deleted successfully' };
  }
}
