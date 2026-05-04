import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/application/services/auth.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { PasswordHasherService } from '../src/infrastructure/security/password-hasher.service';
import { TokenService } from '../src/infrastructure/security/token.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let tokenService: TokenService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
  };

  const mockPasswordHasherService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PasswordHasherService,
          useValue: mockPasswordHasherService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    passwordHasher = module.get<PasswordHasherService>(PasswordHasherService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user and organization', async () => {
      const registerDto = {
        organizationName: 'Test Org',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123',
      };

      const mockOrg = {
        id: 'org-1',
        name: 'Test Org',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockUser = {
        id: 'user-1',
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        refreshTokenHash: null,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPasswordHasherService.hash.mockResolvedValue('hashed-password');
      mockPrismaService.organization.create.mockResolvedValue(mockOrg);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('tokens.accessToken');
      expect(result).toHaveProperty('tokens.refreshToken');
      expect((result.user as any).email).toBe('john@example.com');
      expect((result.user as any).role).toBe('ADMIN');
    });

    it('should throw BadRequestException if email already exists', async () => {
      const registerDto = {
        organizationName: 'Test Org',
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'Password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'Password123',
      };

      const mockUser = {
        id: 'user-1',
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        role: 'SALES',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordHasherService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');
      mockPasswordHasherService.hash.mockResolvedValue('hashed-refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('tokens.accessToken');
      expect(result).toHaveProperty('tokens.refreshToken');
      expect((result.user as any).email).toBe('john@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordHasherService.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user by clearing refresh token', async () => {
      const userId = 'user-1';

      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        refreshTokenHash: null,
      });

      await service.logout(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    });
  });
});
