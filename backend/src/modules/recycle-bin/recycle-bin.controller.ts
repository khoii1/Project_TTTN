import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TokenPayload } from '../../infrastructure/security/token.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RoleGuard } from '../../shared/guards/role.guard';
import { RecycleBinService } from './recycle-bin.service';
import { isPermanentDeleteEntity } from './recycle-bin.types';

@ApiTags('Recycle Bin')
@Controller('recycle-bin')
@UseGuards(JwtGuard, RoleGuard)
@ApiBearerAuth()
export class RecycleBinController {
  constructor(private recycleBinService: RecycleBinService) {}

  @Delete(':entity/:id/permanent')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete one recycle-bin record' })
  permanentDelete(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<{ message: string }> {
    if (!isPermanentDeleteEntity(entity)) {
      throw new BadRequestException('Loại bản ghi trong Thùng rác không hợp lệ.');
    }
    return this.recycleBinService.permanentDelete(entity, id, user);
  }
}
