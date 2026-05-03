import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserService } from '../application/services/user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../application/dto/user.dto';
import { JwtGuard } from '../../../shared/guards/jwt.guard';
import { RoleGuard } from '../../../shared/guards/role.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TokenPayload } from '../../../infrastructure/security/token.service';
import { UserRole } from '@prisma/client';
import { PaginatedResponse } from '../../../common/types/response.types';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtGuard, RoleGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private userService: UserService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: TokenPayload
  ): Promise<UserResponseDto> {
    return this.userService.create(user.organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users in organization with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({
    status: 200,
    description: 'Users list',
    type: () => PaginatedResponse,
  })
  async findAll(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.userService.findAll(user.organizationId, page || 1, limit || 10, search, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<UserResponseDto> {
    return this.userService.findById(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: TokenPayload
  ): Promise<UserResponseDto> {
    return this.userService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload
  ): Promise<{ message: string }> {
    await this.userService.delete(id, user.organizationId);
    return { message: 'User deleted successfully' };
  }
}
