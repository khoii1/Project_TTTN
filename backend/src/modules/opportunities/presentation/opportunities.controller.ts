import {
  ArgumentsHost,
  BadRequestException,
  Catch,
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
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { OpportunityService } from '../application/services/opportunity.service';
import { OpportunityAttachmentService } from '../application/services/opportunity-attachment.service';
import { OpportunitySalesService } from '../application/services/opportunity-sales.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ChangeOpportunityStageDto,
  OpportunityResponseDto,
} from '../application/dto/opportunity.dto';
import { OpportunityAttachmentResponseDto } from '../application/dto/opportunity-attachment.dto';
import {
  AddOpportunityPackageDto,
  AddOpportunityProductDto,
  ContractResponseDto,
  CreateContractDto,
  CreateQuoteDto,
  OpportunityProductResponseDto,
  ProductPackageResponseDto,
  ProductResponseDto,
  QuoteResponseDto,
  UpdateQuoteStatusDto,
} from '../application/dto/sales-document.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { PaginatedResponse } from '../../../common/types/response.types';
import { ImportCsvResult } from '../../../common/import-csv/import-csv.types';
import { assertCsvFile, CSV_MAX_FILE_SIZE_BYTES } from '../../../common/import-csv/import-csv.utils';
import {
  TASK_ATTACHMENT_MAX_FILE_SIZE_BYTES,
  TASK_ATTACHMENT_MAX_FILES,
} from '../../../shared/storage/storage.service';

@Catch()
class OpportunityAttachmentUploadExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status =
      typeof exception?.getStatus === 'function' ? exception.getStatus() : 500;
    const rawMessage =
      typeof exception?.message === 'string' ? exception.message : 'Upload failed';
    const path = host.switchToHttp().getRequest()?.url;

    if (exception?.code === 'LIMIT_FILE_SIZE' || rawMessage === 'File too large') {
      return response.status(413).json({
        statusCode: 413,
        message: 'File vượt quá giới hạn 5MB.',
        error: 'Payload Too Large',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    if (
      exception?.code === 'LIMIT_UNEXPECTED_FILE' ||
      rawMessage === 'Unexpected field'
    ) {
      return response.status(400).json({
        statusCode: 400,
        message: `Chỉ được tải tối đa ${TASK_ATTACHMENT_MAX_FILES} file mỗi lần.`,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    if (exception instanceof BadRequestException) {
      const body = exception.getResponse() as any;
      return response.status(status).json({
        statusCode: status,
        message: body?.message || rawMessage,
        error: body?.error || 'Bad Request',
        timestamp: new Date().toISOString(),
        path,
      });
    }

    return response.status(status).json({
      statusCode: status,
      message: rawMessage,
      error: exception?.name || 'Error',
      timestamp: new Date().toISOString(),
      path,
    });
  }
}

@ApiTags('Opportunities')
@Controller('opportunities')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class OpportunitiesController {
  constructor(
    private opportunityService: OpportunityService,
    private opportunityAttachmentService: OpportunityAttachmentService,
    private opportunitySalesService: OpportunitySalesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created', type: OpportunityResponseDto })
  async create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.create(user.organizationId, user.sub, dto, user);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CSV_MAX_FILE_SIZE_BYTES } }))
  @ApiOperation({ summary: 'Import opportunities from CSV' })
  async importCsv(
    @UploadedFile() file: any,
    @CurrentUser() user: TokenPayload
  ): Promise<ImportCsvResult> {
    const buffer = assertCsvFile(file);
    return this.opportunityService.importCsv(user.organizationId, user.sub, buffer);
  }

  @Get()
  @ApiOperation({ summary: 'Get all opportunities with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'stage', required: false, type: String })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'contactId', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Opportunities list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('accountId') accountId?: string,
    @Query('contactId') contactId?: string,
    @Query('source') source?: string,
    @Query('deleted') deleted?: string
  ): Promise<PaginatedResponse<OpportunityResponseDto>> {
    return this.opportunityService.findAll(
      user.organizationId,
      page || 1,
      limit || 10,
      search,
      stage,
      source,
      deleted === 'true',
      accountId,
      contactId,
      user,
    );
  }

  @Get('catalog/products')
  @ApiOperation({ summary: 'Get active products for opportunity sales flow' })
  async findProducts(
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductResponseDto[]> {
    return this.opportunitySalesService.findProducts(user);
  }

  @Get('catalog/packages')
  @ApiOperation({ summary: 'Get active product packages for opportunity sales flow' })
  async findPackages(
    @CurrentUser() user: TokenPayload,
  ): Promise<ProductPackageResponseDto[]> {
    return this.opportunitySalesService.findPackages(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity details', type: OpportunityResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.findById(id, user.organizationId, user);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get products selected for an opportunity' })
  async findOpportunityProducts(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<OpportunityProductResponseDto[]> {
    return this.opportunitySalesService.findOpportunityProducts(id, user);
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Add a product to an opportunity' })
  async addOpportunityProduct(
    @Param('id') id: string,
    @Body() dto: AddOpportunityProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<OpportunityProductResponseDto> {
    return this.opportunitySalesService.addOpportunityProduct(id, user, dto);
  }

  @Post(':id/product-packages')
  @ApiOperation({ summary: 'Add all products from a package to an opportunity' })
  async addOpportunityPackage(
    @Param('id') id: string,
    @Body() dto: AddOpportunityPackageDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<OpportunityProductResponseDto[]> {
    return this.opportunitySalesService.addPackage(id, user, dto);
  }

  @Delete(':id/products/:rowId')
  @ApiOperation({ summary: 'Remove a product row from an opportunity' })
  async removeOpportunityProduct(
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ message: string }> {
    return this.opportunitySalesService.removeOpportunityProduct(id, rowId, user);
  }

  @Get(':id/quotes')
  @ApiOperation({ summary: 'Get quotes for an opportunity' })
  async findQuotes(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<QuoteResponseDto[]> {
    return this.opportunitySalesService.findQuotes(id, user);
  }

  @Post(':id/quotes')
  @ApiOperation({ summary: 'Create a quote from opportunity products' })
  async createQuote(
    @Param('id') id: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<QuoteResponseDto> {
    return this.opportunitySalesService.createQuote(id, user, dto);
  }

  @Patch(':id/quotes/:quoteId/status')
  @ApiOperation({ summary: 'Update quote status' })
  async updateQuoteStatus(
    @Param('id') id: string,
    @Param('quoteId') quoteId: string,
    @Body() dto: UpdateQuoteStatusDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<QuoteResponseDto> {
    return this.opportunitySalesService.updateQuoteStatus(
      id,
      quoteId,
      dto.status,
      user,
    );
  }

  @Post(':id/quotes/:quoteId/pdf')
  @ApiOperation({ summary: 'Generate quote PDF and store it in private storage' })
  async generateQuotePdf(
    @Param('id') id: string,
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<QuoteResponseDto> {
    return this.opportunitySalesService.generateQuotePdf(id, quoteId, user);
  }

  @Get(':id/quotes/:quoteId/pdf')
  @ApiOperation({ summary: 'Get a temporary signed URL for quote PDF' })
  async getQuotePdf(
    @Param('id') id: string,
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ signedUrl: string }> {
    return this.opportunitySalesService.getQuotePdfSignedUrl(id, quoteId, user);
  }

  @Get(':id/contracts')
  @ApiOperation({ summary: 'Get contracts for an opportunity' })
  async findContracts(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<ContractResponseDto[]> {
    return this.opportunitySalesService.findContracts(id, user);
  }

  @Post(':id/contracts')
  @ApiOperation({ summary: 'Create a contract from an accepted quote' })
  async createContract(
    @Param('id') id: string,
    @Body() dto: CreateContractDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<ContractResponseDto> {
    return this.opportunitySalesService.createContract(id, user, dto);
  }

  @Post(':id/contracts/:contractId/pdf')
  @ApiOperation({ summary: 'Generate contract PDF and store it in private storage' })
  async generateContractPdf(
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<ContractResponseDto> {
    return this.opportunitySalesService.generateContractPdf(id, contractId, user);
  }

  @Get(':id/contracts/:contractId/pdf')
  @ApiOperation({ summary: 'Get a temporary signed URL for contract PDF' })
  async getContractPdf(
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ signedUrl: string }> {
    return this.opportunitySalesService.getContractPdfSignedUrl(
      id,
      contractId,
      user,
    );
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'Get opportunity attachments with temporary signed URLs' })
  async findAttachments(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<OpportunityAttachmentResponseDto[]> {
    return this.opportunityAttachmentService.findAll(id, user);
  }

  @Post(':id/attachments')
  @UseFilters(OpportunityAttachmentUploadExceptionFilter)
  @UseInterceptors(
    FilesInterceptor('files', TASK_ATTACHMENT_MAX_FILES, {
      limits: { fileSize: TASK_ATTACHMENT_MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload opportunity attachments' })
  async uploadAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: any[] = [],
    @CurrentUser() user: TokenPayload,
  ): Promise<OpportunityAttachmentResponseDto[]> {
    return this.opportunityAttachmentService.upload(id, user, files);
  }

  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Create temporary signed URL for an opportunity attachment' })
  async getAttachmentSignedUrl(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ signedUrl: string }> {
    return this.opportunityAttachmentService.getSignedUrl(id, attachmentId, user);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete an opportunity attachment' })
  async deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ message: string }> {
    return this.opportunityAttachmentService.delete(id, attachmentId, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated', type: OpportunityResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.update(id, user.organizationId, dto, user);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Change opportunity stage' })
  @ApiResponse({
    status: 200,
    description: 'Opportunity stage updated',
    type: OpportunityResponseDto,
  })
  async changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeOpportunityStageDto,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.changeStage(id, user.organizationId, user.sub, dto, user);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity restored', type: OpportunityResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.restore(id, user.organizationId, user.sub, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.opportunityService.delete(id, user.organizationId, user.sub, user);
    return { message: 'Opportunity deleted successfully' };
  }
}
