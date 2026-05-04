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

  @Get()
  @ApiOperation({ summary: 'Get all contacts with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
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
    return this.contactService.restore(id, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.contactService.delete(id, user.organizationId);
    return { message: 'Contact deleted successfully' };
  }
}
