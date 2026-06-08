import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskCommentService } from '../src/modules/tasks/application/services/task-comment.service';

describe('Task Comments', () => {
  const organizationId = 'org-1';
  const taskId = 'task-1';
  const authorId = 'user-1';
  const currentUser = {
    sub: authorId,
    email: 'admin@example.com',
    organizationId,
    role: 'ADMIN',
  };

  const mockPrisma = {
    task: {
      findFirst: jest.fn(),
    },
    taskComment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorage = {
    validateFiles: jest.fn(),
    buildStoragePath: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getBucket: jest.fn(),
    isImage: jest.fn(),
    createSignedUrl: jest.fn(),
  };

  const mockAuditLog = {
    log: jest.fn(),
  };

  let service: TaskCommentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TaskCommentService(
      mockPrisma as any,
      mockStorage as any,
      mockAuditLog as any,
    );
    mockPrisma.task.findFirst.mockResolvedValue({
      id: taskId,
      organizationId,
      ownerId: authorId,
      assignedToId: authorId,
      deletedAt: null,
    });
    mockStorage.getBucket.mockReturnValue('task-attachments');
    mockStorage.isImage.mockImplementation((mimeType: string) => mimeType.startsWith('image/'));
    mockStorage.createSignedUrl.mockResolvedValue('https://signed-url.example/file');
  });

  it('creates a text-only comment', async () => {
    const created = {
      id: 'comment-1',
      taskId,
      authorId,
      content: 'Đã gọi khách và hẹn demo.',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        firstName: 'Nguyễn',
        lastName: 'Quản Trị',
        email: 'admin@example.com',
      },
      attachments: [],
    };
    mockPrisma.taskComment.create.mockResolvedValue(created);

    const result = await service.create(
      taskId,
      currentUser,
      { content: '  Đã gọi khách và hẹn demo.  ' },
      [],
    );

    expect(mockStorage.validateFiles).toHaveBeenCalledWith([]);
    expect(mockPrisma.taskComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId,
          taskId,
          authorId,
          content: 'Đã gọi khách và hẹn demo.',
        }),
      }),
    );
    expect(result.content).toBe('Đã gọi khách và hẹn demo.');
    expect(result.authorEmail).toBe('admin@example.com');
  });

  it('uploads files and stores attachment metadata', async () => {
    const file = {
      originalname: 'yeu-cau-khach-hang.pdf',
      mimetype: 'application/pdf',
      size: 1234,
      buffer: Buffer.from('pdf'),
    };
    mockStorage.buildStoragePath.mockReturnValue(
      'organizations/org-1/tasks/task-1/comments/comment-1/1-yeu-cau-khach-hang.pdf',
    );
    const created = {
      id: 'comment-1',
      taskId,
      authorId,
      content: 'Xem file đính kèm.',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        firstName: 'Nguyễn',
        lastName: 'Quản Trị',
        email: 'admin@example.com',
      },
      attachments: [
        {
          id: 'attachment-1',
          fileName: '1-yeu-cau-khach-hang.pdf',
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storagePath:
            'organizations/org-1/tasks/task-1/comments/comment-1/1-yeu-cau-khach-hang.pdf',
          createdAt: new Date(),
        },
      ],
    };
    mockPrisma.taskComment.create.mockResolvedValue(created);

    const result = await service.create(
      taskId,
      currentUser,
      { content: 'Xem file đính kèm.' },
      [file],
    );

    expect(mockStorage.uploadFile).toHaveBeenCalledWith(
      file,
      expect.stringContaining('organizations/org-1/tasks/task-1/comments/'),
    );
    expect(mockPrisma.taskComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachments: {
            create: [
              expect.objectContaining({
                organizationId,
                taskId,
                uploadedById: authorId,
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                storageBucket: 'task-attachments',
              }),
            ],
          },
        }),
      }),
    );
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].signedUrl).toBe('https://signed-url.example/file');
  });

  it('rejects empty comment without files', async () => {
    await expect(
      service.create(taskId, currentUser, { content: '   ' }, []),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.taskComment.create).not.toHaveBeenCalled();
  });

  it('propagates file validation errors before creating comment', async () => {
    mockStorage.validateFiles.mockImplementation(() => {
      throw new BadRequestException('File không đúng định dạng được hỗ trợ.');
    });

    await expect(
      service.create(taskId, currentUser, { content: 'File' }, [
        {
          originalname: 'script.js',
          mimetype: 'application/javascript',
          size: 100,
          buffer: Buffer.from('alert(1)'),
        },
      ]),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.taskComment.create).not.toHaveBeenCalled();
    expect(mockStorage.uploadFile).not.toHaveBeenCalled();
  });

  it('blocks comments for tasks outside the current organization', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.findAll(taskId, currentUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('limits sales users to owned or assigned tasks before returning comments', async () => {
    mockPrisma.taskComment.findMany.mockResolvedValue([]);

    await service.findAll(taskId, {
      sub: 'sales-user-1',
      organizationId,
      role: 'SALES',
    });

    expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: taskId,
        organizationId,
        deletedAt: null,
        OR: [
          { ownerId: 'sales-user-1' },
          { assignedToId: 'sales-user-1' },
        ],
      }),
    });
  });

  it('allows the author to edit their own comment', async () => {
    const existing = {
      id: 'comment-1',
      taskId,
      organizationId,
      authorId,
      content: 'Old content',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const updated = {
      ...existing,
      content: 'New content',
      updatedAt: new Date('2026-01-01T00:01:00.000Z'),
      author: { firstName: 'John', lastName: 'Admin', email: 'admin@example.com' },
      attachments: [],
    };
    mockPrisma.taskComment.findFirst.mockResolvedValue(existing);
    mockPrisma.taskComment.update.mockResolvedValue(updated);

    const result = await service.update(taskId, 'comment-1', currentUser, {
      content: ' New content ',
    });

    expect(mockPrisma.taskComment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comment-1' },
        data: { content: 'New content' },
      }),
    );
    expect(result.content).toBe('New content');
    expect(result.isEdited).toBe(true);
  });

  it('blocks admin from editing another user comment', async () => {
    mockPrisma.taskComment.findFirst.mockResolvedValue({
      id: 'comment-1',
      taskId,
      organizationId,
      authorId: 'other-user',
      content: 'Other content',
      deletedAt: null,
    });

    await expect(
      service.update(taskId, 'comment-1', currentUser, { content: 'Hack' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows author to soft delete their own comment', async () => {
    const existing = {
      id: 'comment-1',
      taskId,
      organizationId,
      authorId,
      content: 'Delete me',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: { firstName: 'John', lastName: 'Admin', email: 'admin@example.com' },
      attachments: [
        {
          id: 'attachment-1',
          fileName: 'file.pdf',
          originalName: 'file.pdf',
          mimeType: 'application/pdf',
          fileSize: 100,
          storagePath: 'organizations/org-1/tasks/task-1/comments/comment-1/file.pdf',
          createdAt: new Date(),
        },
      ],
    };
    mockPrisma.taskComment.findFirst.mockResolvedValue(existing);
    mockPrisma.taskComment.update.mockResolvedValue({
      ...existing,
      deletedAt: new Date(),
      deletedById: authorId,
    });

    const result = await service.delete(taskId, 'comment-1', currentUser);

    expect(mockPrisma.taskComment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date), deletedById: authorId }),
      }),
    );
    expect(result.isDeleted).toBe(true);
    expect(result.attachments).toHaveLength(0);
    expect(mockStorage.createSignedUrl).not.toHaveBeenCalled();
  });

  it('allows admin to delete another user comment', async () => {
    const existing = {
      id: 'comment-1',
      taskId,
      organizationId,
      authorId: 'other-user',
      content: 'Other comment',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: { firstName: 'Other', lastName: 'User', email: 'other@example.com' },
      attachments: [],
    };
    mockPrisma.taskComment.findFirst.mockResolvedValue(existing);
    mockPrisma.taskComment.update.mockResolvedValue({
      ...existing,
      deletedAt: new Date(),
      deletedById: authorId,
    });

    const result = await service.delete(taskId, 'comment-1', currentUser);

    expect(result.isDeleted).toBe(true);
  });

  it('blocks sales from deleting another user comment', async () => {
    mockPrisma.taskComment.findFirst.mockResolvedValue({
      id: 'comment-1',
      taskId,
      organizationId,
      authorId: 'other-user',
      content: 'Other comment',
      deletedAt: null,
    });

    await expect(
      service.delete(taskId, 'comment-1', {
        sub: 'sales-user-1',
        organizationId,
        role: 'SALES',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
