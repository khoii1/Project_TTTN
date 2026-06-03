import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { RoleGuard } from '../../../shared/guards/role.guard';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import {
  CreateLeadAssignmentRuleDto,
  LeadAssignmentRuleResponseDto,
  UpdateLeadAssignmentRuleDto,
} from '../application/dto/lead-assignment-rule.dto';
import { LeadAssignmentService } from '../application/services/lead-assignment.service';

@ApiTags('Lead Assignment Rules')
@Controller('lead-assignment-rules')
@UseGuards(JwtGuard, RoleGuard)
@ApiBearerAuth()
export class LeadAssignmentRulesController {
  constructor(private readonly leadAssignmentService: LeadAssignmentService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List lead assignment rules' })
  findAll(@CurrentUser() user: TokenPayload): Promise<LeadAssignmentRuleResponseDto[]> {
    return this.leadAssignmentService.findAll(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get lead assignment rule details' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<LeadAssignmentRuleResponseDto> {
    return this.leadAssignmentService.findById(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a lead assignment rule' })
  create(
    @Body() dto: CreateLeadAssignmentRuleDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<LeadAssignmentRuleResponseDto> {
    return this.leadAssignmentService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a lead assignment rule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadAssignmentRuleDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<LeadAssignmentRuleResponseDto> {
    return this.leadAssignmentService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a lead assignment rule' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<LeadAssignmentRuleResponseDto> {
    return this.leadAssignmentService.remove(id, user.organizationId);
  }
}
