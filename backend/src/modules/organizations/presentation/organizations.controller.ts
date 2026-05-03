import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  OrganizationService,
  OrganizationResponseDto,
} from '../application/services/organization.service';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private organizationService: OrganizationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: () => OrganizationResponseDto,
  })
  async getCurrentOrganization(
    @CurrentUser() user: TokenPayload
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.findById(user.organizationId);
  }
}
