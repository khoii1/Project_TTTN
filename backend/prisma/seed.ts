import {
  CasePriority,
  CaseStatus,
  LeadStatus,
  OpportunityStage,
  PrismaClient,
  ProductType,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const HCM_PROVINCE = 'Thành phố Hồ Chí Minh';
const WEBSITE_SOURCE_DETAIL = 'Form đăng ký tư vấn trên website';

const hashPassword = (password: string) => bcrypt.hash(password, 10);

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const daysAgo = (days: number) => daysFromNow(-days);

async function cleanDatabase() {
  await prisma.taskCommentAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.opportunityProduct.deleteMany();
  await prisma.productPackageItem.deleteMany();
  await prisma.productPackage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.case.deleteMany();
  await prisma.task.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.taskTemplateItem.deleteMany();
  await prisma.taskTemplateGroup.deleteMany();
  await prisma.taskTemplate.deleteMany();
  await prisma.leadAssignmentRule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function createTaskTemplate(params: {
  organizationId: string;
  name: string;
  description: string;
  isDefault?: boolean;
  groups: Array<{
    name: string;
    description?: string;
    items: Array<{
      title: string;
      description?: string;
      priority: TaskPriority;
      dueAfterDays: number;
    }>;
  }>;
}) {
  return prisma.taskTemplate.create({
    data: {
      id: randomUUID(),
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      isActive: true,
      isDefault: params.isDefault ?? false,
      groups: {
        create: params.groups.map((group, groupIndex) => ({
          id: randomUUID(),
          name: group.name,
          description: group.description,
          sortOrder: groupIndex + 1,
          items: {
            create: group.items.map((item, itemIndex) => ({
              id: randomUUID(),
              title: item.title,
              description: item.description,
              priority: item.priority,
              dueAfterDays: item.dueAfterDays,
              sortOrder: itemIndex + 1,
              isActive: true,
            })),
          },
        })),
      },
    },
  });
}

async function createProductCatalog(organizationId: string) {
  const productSeeds = [
    {
      code: 'CF-MAY-PHA',
      name: 'Máy pha cà phê chuyên nghiệp',
      type: ProductType.PRODUCT,
      unit: 'bộ',
      defaultPrice: 45000000,
      description: 'Máy pha cà phê phù hợp quầy vận hành tiêu chuẩn.',
    },
    {
      code: 'CF-MAY-XAY',
      name: 'Máy xay cà phê',
      type: ProductType.PRODUCT,
      unit: 'máy',
      defaultPrice: 18000000,
      description: 'Máy xay hạt cà phê cho cửa hàng nhượng quyền.',
    },
    {
      code: 'CF-QUAY',
      name: 'Quầy pha chế',
      type: ProductType.PRODUCT,
      unit: 'bộ',
      defaultPrice: 60000000,
      description: 'Quầy pha chế theo nhận diện thương hiệu.',
    },
    {
      code: 'CF-BAN-GHE',
      name: 'Bộ bàn ghế tiêu chuẩn',
      type: ProductType.PRODUCT,
      unit: 'bộ',
      defaultPrice: 35000000,
      description: 'Bàn ghế cho khu vực phục vụ khách tại cửa hàng.',
    },
    {
      code: 'CF-BANG-HIEU',
      name: 'Bảng hiệu nhận diện',
      type: ProductType.PRODUCT,
      unit: 'bộ',
      defaultPrice: 22000000,
      description: 'Bảng hiệu và hạng mục nhận diện cơ bản.',
    },
    {
      code: 'CF-DONG-PHUC',
      name: 'Đồng phục nhân viên',
      type: ProductType.PRODUCT,
      unit: 'bộ',
      defaultPrice: 8000000,
      description: 'Đồng phục khai trương cho đội vận hành.',
    },
    {
      code: 'CF-NGUYEN-LIEU',
      name: 'Nguyên liệu khai trương',
      type: ProductType.PRODUCT,
      unit: 'gói',
      defaultPrice: 25000000,
      description: 'Cà phê, syrup và nguyên liệu khởi động cửa hàng.',
    },
    {
      code: 'CF-BAO-BI',
      name: 'Bao bì mang đi',
      type: ProductType.PRODUCT,
      unit: 'gói',
      defaultPrice: 12000000,
      description: 'Ly, túi, tem nhãn và bao bì bán mang đi.',
    },
    {
      code: 'CF-DAO-TAO',
      name: 'Đào tạo vận hành',
      type: ProductType.SERVICE,
      unit: 'khóa',
      defaultPrice: 30000000,
      description: 'Đào tạo pha chế, phục vụ và quy trình cửa hàng.',
    },
    {
      code: 'CF-KHAI-TRUONG',
      name: 'Hỗ trợ khai trương',
      type: ProductType.SERVICE,
      unit: 'gói',
      defaultPrice: 28000000,
      description: 'Đội hỗ trợ hiện trường trong giai đoạn khai trương.',
    },
  ];

  const products: Record<string, { id: string; defaultPrice: number }> = {};

  for (const item of productSeeds) {
    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        organizationId,
        ...item,
      },
    });
    products[item.code] = {
      id: product.id,
      defaultPrice: item.defaultPrice,
    };
  }

  const packageSeeds = [
    {
      code: 'PKG-KET-NOI',
      name: 'Gói Kết Nối',
      description: 'Gói khởi động nhẹ cho điểm bán cà phê nhỏ.',
      items: [
        ['CF-MAY-PHA', 1],
        ['CF-MAY-XAY', 1],
        ['CF-NGUYEN-LIEU', 1],
        ['CF-DAO-TAO', 1],
      ] as Array<[string, number]>,
    },
    {
      code: 'PKG-KHOI-NGHIEP',
      name: 'Gói Khởi Nghiệp',
      description: 'Gói triển khai cửa hàng cà phê nhượng quyền tiêu chuẩn.',
      items: [
        ['CF-MAY-PHA', 1],
        ['CF-MAY-XAY', 1],
        ['CF-QUAY', 1],
        ['CF-BAN-GHE', 1],
        ['CF-BANG-HIEU', 1],
        ['CF-DONG-PHUC', 1],
        ['CF-NGUYEN-LIEU', 1],
        ['CF-BAO-BI', 1],
        ['CF-DAO-TAO', 1],
      ] as Array<[string, number]>,
    },
    {
      code: 'PKG-THINH-VUONG',
      name: 'Gói Thịnh Vượng',
      description: 'Gói triển khai đầy đủ cho cửa hàng quy mô lớn.',
      items: [
        ['CF-MAY-PHA', 2],
        ['CF-MAY-XAY', 2],
        ['CF-QUAY', 1],
        ['CF-BAN-GHE', 2],
        ['CF-BANG-HIEU', 1],
        ['CF-DONG-PHUC', 2],
        ['CF-NGUYEN-LIEU', 2],
        ['CF-BAO-BI', 2],
        ['CF-DAO-TAO', 1],
        ['CF-KHAI-TRUONG', 1],
      ] as Array<[string, number]>,
    },
  ];

  for (const packageSeed of packageSeeds) {
    await prisma.productPackage.create({
      data: {
        id: randomUUID(),
        organizationId,
        code: packageSeed.code,
        name: packageSeed.name,
        description: packageSeed.description,
        items: {
          create: packageSeed.items.map(([code, quantity], index) => ({
            id: randomUUID(),
            productId: products[code].id,
            quantity,
            unitPrice: products[code].defaultPrice,
            sortOrder: index + 1,
          })),
        },
      },
    });
  }
}

async function main() {
  await cleanDatabase();

  const sampleOrg = await prisma.organization.create({
    data: {
      id: randomUUID(),
      name: 'Công ty Mẫu Việt Nam',
    },
  });

  const rivalOrg = await prisma.organization.create({
    data: {
      id: randomUUID(),
      name: 'Công ty Đối Thủ',
    },
  });

  const [
    adminPasswordHash,
    managerPasswordHash,
    salesPasswordHash,
    supportPasswordHash,
    rivalPasswordHash,
  ] = await Promise.all([
    hashPassword('Admin@123'),
    hashPassword('Manager@123'),
    hashPassword('Sales@123'),
    hashPassword('Support@123'),
    hashPassword('Rival@123'),
  ]);

  const adminUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: sampleOrg.id,
      firstName: 'Nguyễn',
      lastName: 'Quản Trị',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: sampleOrg.id,
      firstName: 'Trần Minh',
      lastName: 'Quản',
      email: 'manager@example.com',
      passwordHash: managerPasswordHash,
      role: UserRole.MANAGER,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: sampleOrg.id,
      firstName: 'Lê Hoàng',
      lastName: 'Sales',
      email: 'sales@example.com',
      passwordHash: salesPasswordHash,
      role: UserRole.SALES,
    },
  });

  const supportUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: sampleOrg.id,
      firstName: 'Phạm Anh',
      lastName: 'Hỗ Trợ',
      email: 'support@example.com',
      passwordHash: supportPasswordHash,
      role: UserRole.SUPPORT,
    },
  });

  const rivalAdmin = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: rivalOrg.id,
      firstName: 'Quản trị',
      lastName: 'Đối Thủ',
      email: 'admin@rival.com',
      passwordHash: rivalPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  await createProductCatalog(sampleOrg.id);

  const leadAssignmentRules = await Promise.all([
    prisma.leadAssignmentRule.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        provinceName: HCM_PROVINCE,
        wardName: 'Phường Sài Gòn',
        assigneeId: salesUser.id,
        isActive: true,
      },
    }),
    prisma.leadAssignmentRule.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        provinceName: HCM_PROVINCE,
        wardName: 'Phường An Khánh',
        assigneeId: supportUser.id,
        isActive: true,
      },
    }),
    prisma.leadAssignmentRule.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        provinceName: HCM_PROVINCE,
        wardName: 'Phường Hạnh Thông',
        assigneeId: supportUser.id,
        isActive: true,
      },
    }),
  ]);

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        firstName: 'Minh An',
        lastName: 'Nguyễn',
        company: 'Công ty TNHH Nội Thất An Phát',
        title: 'Giám đốc kinh doanh',
        email: 'an.nguyen@noithatanphat.vn',
        phone: '0908 456 789',
        website: 'https://noithatanphat.vn',
        status: LeadStatus.QUALIFIED,
        source: 'FACEBOOK',
        sourceDetail: 'Quảng cáo Facebook về giải pháp CRM cho doanh nghiệp vừa và nhỏ',
        industry: 'Nội thất',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường Sài Gòn',
        addressDetail: '25 Nguyễn Văn Trỗi',
        description:
          'Khách cần CRM để quản lý khách hàng, phân công nhân viên kinh doanh theo khu vực và theo dõi cơ hội bán hàng.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        firstName: 'Thu Hà',
        lastName: 'Trần',
        company: 'Công ty Cổ phần Giáo dục Minh Tâm',
        title: 'Trưởng phòng tuyển sinh',
        email: 'ha.tran@giaoducminhtam.vn',
        phone: '0912 345 678',
        website: 'https://giaoducminhtam.vn',
        status: LeadStatus.NEW,
        source: 'WEBSITE',
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        industry: 'Giáo dục',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường An Khánh',
        addressDetail: '12 Lê Văn Sỹ',
        description:
          'Khách muốn tư vấn hệ thống CRM để quản lý học viên tiềm năng, phân công tư vấn viên và theo dõi lịch chăm sóc. Quy mô công ty khoảng 20-50 nhân sự, mong muốn được liên hệ vào buổi sáng.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        firstName: 'Quốc Huy',
        lastName: 'Phạm',
        company: 'Công ty TNHH Thương mại Hải Nam',
        title: 'Chủ doanh nghiệp',
        email: 'huy.pham@hainamtrade.vn',
        phone: '0933 222 111',
        website: 'https://hainamtrade.vn',
        status: LeadStatus.CONTACTED,
        source: 'PHONE',
        sourceDetail: 'Nhân viên gọi điện tư vấn sau hội thảo',
        industry: 'Thương mại',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường Hạnh Thông',
        addressDetail: '88 Nguyễn Hữu Cảnh',
        description:
          'Khách cần quản lý báo giá, lịch chăm sóc và dữ liệu khách hàng doanh nghiệp.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        firstName: 'Bảo Long',
        lastName: 'Võ',
        company: 'Công ty Cổ phần Công nghệ Sao Việt',
        title: 'Giám đốc vận hành',
        email: 'long.vo@saoviettech.vn',
        phone: '0987 654 321',
        website: 'https://saoviettech.vn',
        status: LeadStatus.NURTURING,
        source: 'REFERRAL',
        sourceDetail: 'Được giới thiệu từ khách hàng cũ',
        industry: 'Công nghệ',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường Sài Gòn',
        addressDetail: '2 Hải Triều',
        description:
          'Khách đang tìm giải pháp CRM có dashboard quản trị, phân quyền người dùng và báo cáo hiệu quả bán hàng.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        firstName: 'Kim Ngân',
        lastName: 'Đặng',
        company: 'Công ty TNHH Dịch vụ Du lịch Biển Xanh',
        title: 'Quản lý chăm sóc khách hàng',
        email: 'ngan.dang@bienxanhtravel.vn',
        phone: '0977 888 999',
        website: 'https://bienxanhtravel.vn',
        status: LeadStatus.UNQUALIFIED,
        source: 'EMAIL',
        sourceDetail: 'Khách gửi email hỏi thông tin nhưng chưa có ngân sách triển khai',
        industry: 'Du lịch',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường An Khánh',
        addressDetail: '45 Trần Hưng Đạo',
        description:
          'Khách cần thêm thời gian đánh giá ngân sách và nhu cầu thực tế, vẫn giữ trong danh sách chăm sóc lại.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        firstName: 'Thanh Tú',
        lastName: 'Lâm',
        company: 'Công ty TNHH Phân phối Đại Phát',
        title: 'Trưởng phòng kinh doanh',
        email: 'tu.lam@daiphat.vn',
        phone: '0902 555 777',
        website: 'https://daiphat.vn',
        status: LeadStatus.NEW,
        source: 'WEBSITE',
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        industry: 'Phân phối',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường Sài Gòn',
        addressDetail: '60 Pasteur',
        description:
          'Khách muốn được tư vấn hệ thống CRM để quản lý khách hàng, phân công nhân viên theo khu vực và theo dõi công việc sau tư vấn. Quy mô công ty khoảng 20-50 nhân sự, mong muốn được liên hệ vào buổi sáng.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        firstName: 'Mai Anh',
        lastName: 'Đỗ',
        company: 'Công ty Cổ phần Dịch vụ Sức Khỏe An Khang',
        title: 'Quản lý vận hành',
        email: 'maianh.do@ankhangcare.vn',
        phone: '0906 333 444',
        website: 'https://ankhangcare.vn',
        status: LeadStatus.NEW,
        source: 'WEBSITE',
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        industry: 'Y tế',
        provinceName: HCM_PROVINCE,
        wardName: 'Phường An Khánh',
        addressDetail: '18 Mai Chí Thọ',
        description:
          'Khách muốn được tư vấn CRM để quản lý khách hàng đặt lịch, nhắc việc chăm sóc và theo dõi phản hồi sau tư vấn. Quy mô công ty khoảng 50-100 nhân sự, mong muốn được liên hệ vào đầu giờ chiều.',
      },
    }),
  ]);

  const deletedLead = await prisma.lead.create({
    data: {
      id: randomUUID(),
      organizationId: sampleOrg.id,
      ownerId: salesUser.id,
      firstName: 'Thanh Bình',
      lastName: 'Hoàng',
      company: 'Hộ kinh doanh Bình Minh',
      title: 'Chủ hộ kinh doanh',
      email: 'binh.hoang@example.vn',
      phone: '0901 111 222',
      status: LeadStatus.UNQUALIFIED,
      source: 'OTHER',
      sourceDetail: 'Khách hàng tiềm năng không còn nhu cầu',
      industry: 'Bán lẻ',
      provinceName: HCM_PROVINCE,
      wardName: 'Phường Sài Gòn',
      addressDetail: '9 Lê Lợi',
      description: 'Lead demo đã bị xóa mềm để kiểm tra Thùng rác.',
      deletedAt: daysAgo(2),
      deletedById: salesUser.id,
    },
  });

  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        name: 'Công ty TNHH Nội Thất An Phát',
        type: 'Khách hàng doanh nghiệp',
        website: 'https://noithatanphat.vn',
        phone: '0908 456 789',
        source: 'FACEBOOK',
        sourceDetail: 'Khách phát sinh từ quảng cáo Facebook',
        description:
          'Doanh nghiệp nội thất cần CRM để quản lý khách hàng và đội kinh doanh theo khu vực.',
        billingCountry: 'Việt Nam',
        billingStreet: '25 Nguyễn Văn Trỗi, Phường Sài Gòn',
        billingCity: HCM_PROVINCE,
        billingState: 'Phường Sài Gòn',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        name: 'Công ty Cổ phần Giáo dục Minh Tâm',
        type: 'Khách hàng tiềm năng',
        website: 'https://giaoducminhtam.vn',
        phone: '0912 345 678',
        source: 'WEBSITE',
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        description:
          'Đơn vị giáo dục cần quản lý học viên tiềm năng, lịch tư vấn và phản hồi chăm sóc.',
        billingCountry: 'Việt Nam',
        billingStreet: '12 Lê Văn Sỹ, Phường An Khánh',
        billingCity: HCM_PROVINCE,
        billingState: 'Phường An Khánh',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        name: 'Công ty TNHH Thương mại Hải Nam',
        type: 'Khách hàng doanh nghiệp',
        website: 'https://hainamtrade.vn',
        phone: '0933 222 111',
        source: 'PHONE',
        sourceDetail: 'Khách được liên hệ qua điện thoại',
        description: 'Công ty thương mại cần quản lý báo giá và cơ hội bán hàng.',
        billingCountry: 'Việt Nam',
        billingStreet: '88 Nguyễn Hữu Cảnh, Phường Hạnh Thông',
        billingCity: HCM_PROVINCE,
        billingState: 'Phường Hạnh Thông',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        name: 'Công ty Cổ phần Công nghệ Sao Việt',
        type: 'Đối tác / khách hàng tiềm năng',
        website: 'https://saoviettech.vn',
        phone: '0987 654 321',
        source: 'REFERRAL',
        sourceDetail: 'Giới thiệu từ khách hàng cũ',
        description: 'Công ty công nghệ quan tâm đến CRM có phân quyền và dashboard.',
        billingCountry: 'Việt Nam',
        billingStreet: '2 Hải Triều, Phường Sài Gòn',
        billingCity: HCM_PROVINCE,
        billingState: 'Phường Sài Gòn',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        name: 'Công ty TNHH Dịch vụ Du lịch Biển Xanh',
        type: 'Khách hàng chưa triển khai',
        website: 'https://bienxanhtravel.vn',
        phone: '0977 888 999',
        source: 'EMAIL',
        sourceDetail: 'Khách hỏi thông tin qua email',
        description:
          'Công ty du lịch quan tâm gói CRM thử nghiệm nhưng chưa có ngân sách.',
        billingCountry: 'Việt Nam',
        billingStreet: '45 Trần Hưng Đạo, Phường An Khánh',
        billingCity: HCM_PROVINCE,
        billingState: 'Phường An Khánh',
      },
    }),
  ]);

  const [anPhat, minhTam, haiNam, saoViet, bienXanh] = accounts;

  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: anPhat.id,
        firstName: 'Minh An',
        lastName: 'Nguyễn',
        title: 'Giám đốc kinh doanh',
        email: 'an.nguyen@noithatanphat.vn',
        phone: '0908 456 789',
        source: 'FACEBOOK',
        sourceDetail: 'Khách phát sinh từ quảng cáo Facebook',
        description: 'Người quyết định chính trong dự án triển khai CRM.',
        mailingCountry: 'Việt Nam',
        mailingStreet: '25 Nguyễn Văn Trỗi, Phường Sài Gòn',
        mailingCity: HCM_PROVINCE,
        mailingState: 'Phường Sài Gòn',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: minhTam.id,
        firstName: 'Thu Hà',
        lastName: 'Trần',
        title: 'Trưởng phòng tuyển sinh',
        email: 'ha.tran@giaoducminhtam.vn',
        phone: '0912 345 678',
        source: 'WEBSITE',
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        description: 'Phụ trách đội tư vấn tuyển sinh và quản lý học viên tiềm năng.',
        mailingCountry: 'Việt Nam',
        mailingStreet: '12 Lê Văn Sỹ, Phường An Khánh',
        mailingCity: HCM_PROVINCE,
        mailingState: 'Phường An Khánh',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: haiNam.id,
        firstName: 'Quốc Huy',
        lastName: 'Phạm',
        title: 'Chủ doanh nghiệp',
        email: 'huy.pham@hainamtrade.vn',
        phone: '0933 222 111',
        source: 'PHONE',
        sourceDetail: 'Khách được liên hệ qua điện thoại',
        description: 'Người cần theo dõi báo giá và danh sách khách hàng doanh nghiệp.',
        mailingCountry: 'Việt Nam',
        mailingStreet: '88 Nguyễn Hữu Cảnh, Phường Hạnh Thông',
        mailingCity: HCM_PROVINCE,
        mailingState: 'Phường Hạnh Thông',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: saoViet.id,
        firstName: 'Bảo Long',
        lastName: 'Võ',
        title: 'Giám đốc vận hành',
        email: 'long.vo@saoviettech.vn',
        phone: '0987 654 321',
        source: 'REFERRAL',
        sourceDetail: 'Giới thiệu từ khách hàng cũ',
        description: 'Phụ trách đánh giá giải pháp và quy trình triển khai nội bộ.',
        mailingCountry: 'Việt Nam',
        mailingStreet: '2 Hải Triều, Phường Sài Gòn',
        mailingCity: HCM_PROVINCE,
        mailingState: 'Phường Sài Gòn',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: bienXanh.id,
        firstName: 'Kim Ngân',
        lastName: 'Đặng',
        title: 'Quản lý chăm sóc khách hàng',
        email: 'ngan.dang@bienxanhtravel.vn',
        phone: '0977 888 999',
        source: 'EMAIL',
        sourceDetail: 'Khách hỏi thông tin qua email',
        description: 'Đầu mối trao đổi khi khách có ngân sách triển khai lại.',
        mailingCountry: 'Việt Nam',
        mailingStreet: '45 Trần Hưng Đạo, Phường An Khánh',
        mailingCity: HCM_PROVINCE,
        mailingState: 'Phường An Khánh',
      },
    }),
  ]);

  const [contactAnPhat, contactMinhTam, contactHaiNam, contactSaoViet, contactBienXanh] =
    contacts;

  const opportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: anPhat.id,
        contactId: contactAnPhat.id,
        name: 'Triển khai CRM cho Công ty TNHH Nội Thất An Phát',
        stage: OpportunityStage.PROPOSE,
        amount: 85000000,
        closeDate: daysFromNow(30),
        nextStep: 'Gửi bảng báo giá và lịch demo sản phẩm',
        source: 'FACEBOOK',
        sourceDetail: 'Khách phát sinh từ quảng cáo Facebook',
        description: 'Khách đã xác định nhu cầu và đang chờ đề xuất triển khai.',
        stageChangedAt: daysAgo(1),
        stageChangedById: salesUser.id,
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: minhTam.id,
        contactId: contactMinhTam.id,
        name: 'Gói CRM tuyển sinh cho Giáo dục Minh Tâm',
        stage: OpportunityStage.QUALIFY,
        amount: 62000000,
        closeDate: daysFromNow(45),
        nextStep: 'Tư vấn quy trình quản lý học viên tiềm năng',
        source: 'WEBSITE',
        sourceDetail: WEBSITE_SOURCE_DETAIL,
        description:
          'Khách cần đánh giá mức phù hợp của hệ thống với quy trình tuyển sinh.',
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: haiNam.id,
        contactId: contactHaiNam.id,
        name: 'Quản lý báo giá cho Thương mại Hải Nam',
        stage: OpportunityStage.NEGOTIATE,
        amount: 45000000,
        closeDate: daysFromNow(20),
        nextStep: 'Thương lượng chi phí triển khai và thời gian bàn giao',
        source: 'PHONE',
        sourceDetail: 'Khách được liên hệ qua điện thoại',
        description: 'Khách đã nhận báo giá và đang thương lượng điều khoản.',
        stageChangedAt: daysAgo(2),
        stageChangedById: supportUser.id,
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: saoViet.id,
        contactId: contactSaoViet.id,
        name: 'CRM quản trị khách hàng cho Công nghệ Sao Việt',
        stage: OpportunityStage.CLOSED_WON,
        amount: 120000000,
        closeDate: daysAgo(7),
        nextStep: 'Bàn giao tài khoản và lên lịch onboarding',
        source: 'REFERRAL',
        sourceDetail: 'Giới thiệu từ khách hàng cũ',
        description: 'Cơ hội đã chốt thành công và chuyển sang giai đoạn triển khai.',
        stageChangedAt: daysAgo(7),
        stageChangedById: salesUser.id,
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: bienXanh.id,
        contactId: contactBienXanh.id,
        name: 'Gói CRM thử nghiệm cho Du lịch Biển Xanh',
        stage: OpportunityStage.CLOSED_LOST,
        amount: 30000000,
        closeDate: daysAgo(5),
        nextStep: 'Theo dõi lại sau 3 tháng',
        source: 'EMAIL',
        sourceDetail: 'Khách hỏi thông tin qua email',
        description: 'Khách chưa có ngân sách nên chưa triển khai trong thời điểm hiện tại.',
        stageChangedAt: daysAgo(5),
        stageChangedById: supportUser.id,
      },
    }),
  ]);

  const [oppAnPhat, oppMinhTam, oppHaiNam] = opportunities;

  const cases = await Promise.all([
    prisma.case.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: minhTam.id,
        contactId: contactMinhTam.id,
        subject: 'Yêu cầu hướng dẫn sử dụng dashboard',
        status: CaseStatus.WORKING,
        priority: CasePriority.MEDIUM,
        source: 'PHONE',
        sourceDetail: 'Khách gọi điện đến bộ phận hỗ trợ',
        description:
          'Khách cần được hướng dẫn cách xem số liệu khách hàng tiềm năng và cơ hội bán hàng trên dashboard.',
      },
    }),
    prisma.case.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        accountId: haiNam.id,
        contactId: contactHaiNam.id,
        subject: 'Kiểm tra lỗi hiển thị báo giá',
        status: CaseStatus.NEW,
        priority: CasePriority.URGENT,
        source: 'PHONE',
        sourceDetail: 'Khách gọi điện báo lỗi định dạng tiền tệ',
        description: 'Khách phản ánh báo giá hiển thị sai định dạng tiền tệ.',
      },
    }),
    prisma.case.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: anPhat.id,
        contactId: contactAnPhat.id,
        subject: 'Yêu cầu bổ sung kịch bản demo phân công Lead',
        status: CaseStatus.RESOLVED,
        priority: CasePriority.HIGH,
        source: 'EMAIL',
        sourceDetail: 'Khách gửi email sau buổi tư vấn',
        description:
          'Khách muốn xem thêm demo phân công Lead theo phường/xã trước khi ra quyết định.',
        closedAt: daysAgo(1),
        closedById: salesUser.id,
      },
    }),
    prisma.case.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
        accountId: saoViet.id,
        contactId: contactSaoViet.id,
        subject: 'Cập nhật thông tin người dùng trong hệ thống',
        status: CaseStatus.CLOSED,
        priority: CasePriority.LOW,
        source: 'EMAIL',
        sourceDetail: 'Khách gửi yêu cầu cập nhật qua email',
        description: 'Khách yêu cầu cập nhật lại thông tin người dùng nội bộ.',
        closedAt: daysAgo(2),
        closedById: managerUser.id,
      },
    }),
  ]);

  const [dashboardCase, pricingCase, salesDemoCase] = cases;

  const taskTemplates = await Promise.all([
    createTaskTemplate({
      organizationId: sampleOrg.id,
      name: 'Quy trình chăm sóc Lead từ Website',
      description:
        'Dùng cho khách hàng tiềm năng được tạo từ form đăng ký tư vấn trên website.',
      isDefault: true,
      groups: [
        {
          name: 'Xác nhận thông tin khách hàng',
          items: [
            {
              title: 'Gọi điện xác nhận nhu cầu',
              priority: TaskPriority.HIGH,
              dueAfterDays: 1,
              description: 'Xác nhận nhu cầu, người phụ trách và thời gian tư vấn phù hợp.',
            },
            {
              title: 'Kiểm tra thông tin liên hệ',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 1,
              description: 'Kiểm tra email, số điện thoại, công ty và khu vực của khách.',
            },
            {
              title: 'Ghi chú lại nhu cầu ban đầu',
              priority: TaskPriority.HIGH,
              dueAfterDays: 1,
              description: 'Tóm tắt nhu cầu tư vấn để cả nhóm theo dõi trong CRM.',
            },
          ],
        },
        {
          name: 'Chuẩn bị nội dung tư vấn',
          items: [
            {
              title: 'Chuẩn bị nội dung tư vấn phù hợp',
              priority: TaskPriority.HIGH,
              dueAfterDays: 2,
              description: 'Chuẩn bị nội dung theo ngành nghề và quy mô khách hàng.',
            },
            {
              title: 'Gửi tài liệu giới thiệu hệ thống',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 2,
              description: 'Gửi tài liệu tổng quan CRM và các luồng demo chính.',
            },
            {
              title: 'Hẹn lịch trao đổi hoặc demo',
              priority: TaskPriority.HIGH,
              dueAfterDays: 3,
              description: 'Chốt lịch demo với khách và người ra quyết định.',
            },
          ],
        },
        {
          name: 'Theo dõi sau tư vấn',
          items: [
            {
              title: 'Cập nhật phản hồi của khách hàng',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 4,
              description: 'Ghi nhận phản hồi và các điểm khách còn băn khoăn.',
            },
            {
              title: 'Cập nhật giai đoạn cơ hội bán hàng',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 5,
              description: 'Cập nhật Opportunity để Dashboard phản ánh đúng pipeline.',
            },
            {
              title: 'Lên lịch chăm sóc tiếp theo',
              priority: TaskPriority.LOW,
              dueAfterDays: 7,
              description: 'Đặt lịch follow-up nếu khách chưa ra quyết định.',
            },
          ],
        },
      ],
    }),
    createTaskTemplate({
      organizationId: sampleOrg.id,
      name: 'Quy trình tư vấn và demo giải pháp CRM',
      description: 'Dùng cho Lead đã có nhu cầu rõ ràng và cần demo hệ thống.',
      groups: [
        {
          name: 'Khảo sát nhu cầu chi tiết',
          items: [
            {
              title: 'Thu thập thông tin quy trình hiện tại của khách hàng',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 1,
            },
            {
              title: 'Xác định vấn đề khách hàng đang gặp phải',
              priority: TaskPriority.HIGH,
              dueAfterDays: 1,
            },
            {
              title: 'Xác định người ra quyết định',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 2,
            },
          ],
        },
        {
          name: 'Chuẩn bị demo hệ thống',
          items: [
            {
              title: 'Chuẩn bị kịch bản demo theo nhu cầu khách hàng',
              priority: TaskPriority.HIGH,
              dueAfterDays: 2,
            },
            {
              title: 'Chuẩn bị dữ liệu mẫu cho buổi demo',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 2,
            },
            {
              title: 'Kiểm tra lại tài khoản và đường dẫn demo',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 2,
            },
          ],
        },
        {
          name: 'Thực hiện demo và ghi nhận phản hồi',
          items: [
            {
              title: 'Demo luồng tiếp nhận khách hàng từ website',
              priority: TaskPriority.HIGH,
              dueAfterDays: 3,
            },
            {
              title: 'Demo luồng phân công và chuyển đổi Lead',
              priority: TaskPriority.HIGH,
              dueAfterDays: 3,
            },
            {
              title: 'Ghi nhận phản hồi sau demo',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 4,
            },
          ],
        },
      ],
    }),
    createTaskTemplate({
      organizationId: sampleOrg.id,
      name: 'Quy trình báo giá và onboarding khách hàng mới',
      description:
        'Dùng khi khách hàng cần chuyển sang báo giá và thống nhất phạm vi triển khai.',
      groups: [
        {
          name: 'Chuẩn bị báo giá',
          items: [
            {
              title: 'Xác định phạm vi khách hàng cần sử dụng',
              priority: TaskPriority.HIGH,
              dueAfterDays: 1,
            },
            {
              title: 'Chuẩn bị báo giá sơ bộ',
              priority: TaskPriority.HIGH,
              dueAfterDays: 2,
            },
            {
              title: 'Gửi báo giá cho khách hàng',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 2,
            },
          ],
        },
        {
          name: 'Theo dõi phản hồi báo giá',
          items: [
            {
              title: 'Liên hệ xác nhận khách đã nhận báo giá',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 3,
            },
            {
              title: 'Ghi nhận phản hồi về chi phí và phạm vi triển khai',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 4,
            },
            {
              title: 'Cập nhật trạng thái cơ hội bán hàng',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 4,
            },
          ],
        },
        {
          name: 'Chuẩn bị onboarding',
          items: [
            {
              title: 'Chuẩn bị tài khoản dùng thử hoặc tài khoản triển khai',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 5,
            },
            {
              title: 'Chuẩn bị tài liệu hướng dẫn sử dụng ban đầu',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 5,
            },
            {
              title: 'Hẹn lịch hướng dẫn sử dụng',
              priority: TaskPriority.HIGH,
              dueAfterDays: 6,
            },
          ],
        },
        {
          name: 'Theo dõi sau onboarding',
          items: [
            {
              title: 'Kiểm tra khách hàng đã đăng nhập và dùng thử hệ thống',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 7,
            },
            {
              title: 'Ghi nhận khó khăn trong quá trình sử dụng ban đầu',
              priority: TaskPriority.NORMAL,
              dueAfterDays: 8,
            },
            {
              title: 'Đề xuất bước chăm sóc tiếp theo',
              priority: TaskPriority.LOW,
              dueAfterDays: 10,
            },
          ],
        },
      ],
    }),
  ]);

  const createdTasks = await Promise.all([
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        assignedToId: salesUser.id,
        subject: 'Gọi tư vấn giải pháp CRM cho Công ty An Phát',
        dueDate: daysAgo(1),
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.HIGH,
        relatedType: 'LEAD',
        relatedId: leads[0].id,
        description: 'Liên hệ khách hàng để tư vấn quy trình triển khai CRM.',
        completedAt: daysAgo(1),
        completedById: salesUser.id,
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        assignedToId: salesUser.id,
        subject: '[Xác nhận thông tin khách hàng] Gọi điện xác nhận nhu cầu',
        dueDate: daysFromNow(1),
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        relatedType: 'OPPORTUNITY',
        relatedId: oppAnPhat.id,
        description:
          'Task demo được tạo từ mẫu sau chuyển đổi Lead để xác nhận nhu cầu và thời gian demo.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        assignedToId: salesUser.id,
        subject: '[Chuẩn bị nội dung tư vấn] Gửi tài liệu giới thiệu hệ thống',
        dueDate: daysFromNow(2),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.NORMAL,
        relatedType: 'OPPORTUNITY',
        relatedId: oppAnPhat.id,
        description: 'Gửi tài liệu giới thiệu CRM, Web-to-Lead và phân công Lead theo khu vực.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        assignedToId: salesUser.id,
        subject: '[Theo dõi sau tư vấn] Cập nhật phản hồi của khách hàng',
        dueDate: daysFromNow(4),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.NORMAL,
        relatedType: 'OPPORTUNITY',
        relatedId: oppAnPhat.id,
        description: 'Cập nhật phản hồi sau buổi tư vấn để điều chỉnh bước tiếp theo.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        assignedToId: supportUser.id,
        subject: '[Xác nhận thông tin khách hàng] Kiểm tra thông tin liên hệ',
        dueDate: daysFromNow(1),
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.NORMAL,
        relatedType: 'OPPORTUNITY',
        relatedId: oppMinhTam.id,
        description: 'Kiểm tra số điện thoại, email và nhu cầu tư vấn của khách từ website.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        assignedToId: supportUser.id,
        subject: 'Kiểm tra phản hồi hỗ trợ dashboard',
        dueDate: daysFromNow(1),
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        relatedType: 'CASE',
        relatedId: dashboardCase.id,
        description: 'Hướng dẫn khách xem dashboard và kiểm tra lại tài khoản trước khi phản hồi.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        assignedToId: supportUser.id,
        subject: 'Kiểm tra lỗi định dạng báo giá',
        dueDate: daysFromNow(2),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        relatedType: 'CASE',
        relatedId: pricingCase.id,
        description: 'Xác minh dữ liệu tiền tệ VNĐ trước khi phản hồi khách Hải Nam.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        assignedToId: salesUser.id,
        subject: 'Chuẩn bị kịch bản demo phân công Lead',
        dueDate: daysFromNow(3),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        relatedType: 'CASE',
        relatedId: salesDemoCase.id,
        description: 'Chuẩn bị demo Web-to-Lead, phường/xã và phân công owner tự động.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: adminUser.id,
        assignedToId: salesUser.id,
        subject: 'Gọi nhắc lịch demo cũ',
        dueDate: daysAgo(4),
        status: TaskStatus.CANCELLED,
        priority: TaskPriority.NORMAL,
        relatedType: 'OPPORTUNITY',
        relatedId: oppHaiNam.id,
        description: 'Task demo đã bị xóa mềm để kiểm tra Thùng rác.',
        deletedAt: daysAgo(1),
        deletedById: adminUser.id,
      },
    }),
  ]);

  const [
    salesLeadTask,
    salesTemplateTask,
    salesSendDocTask,
    salesFollowUpTask,
    supportTemplateTask,
    supportDashboardTask,
  ] = createdTasks;

  const taskComments = await Promise.all([
    prisma.taskComment.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        taskId: salesTemplateTask.id,
        authorId: salesUser.id,
        content:
          'Em đã gọi cho khách, khách muốn xem demo phần phân công Lead theo khu vực và theo dõi công việc sau chuyển đổi.',
      },
    }),
    prisma.taskComment.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        taskId: salesTemplateTask.id,
        authorId: managerUser.id,
        content:
          'Chuẩn bị thêm kịch bản demo luồng Web-to-Lead, Task Template và tab Trao đổi trong công việc.',
      },
    }),
    prisma.taskComment.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        taskId: salesSendDocTask.id,
        authorId: salesUser.id,
        content:
          'Em sẽ gửi tài liệu giới thiệu hệ thống và hẹn khách demo vào buổi sáng.',
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
    }),
    prisma.taskComment.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        taskId: salesFollowUpTask.id,
        authorId: salesUser.id,
        content: 'Nội dung cũ không còn hiển thị',
        createdAt: daysAgo(3),
        updatedAt: daysAgo(1),
        deletedAt: daysAgo(1),
        deletedById: adminUser.id,
      },
    }),
    prisma.taskComment.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        taskId: supportDashboardTask.id,
        authorId: supportUser.id,
        content: 'Khách báo cần được hướng dẫn lại phần đăng nhập và xem dashboard.',
      },
    }),
    prisma.taskComment.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        taskId: supportDashboardTask.id,
        authorId: adminUser.id,
        content: 'Kiểm tra lại tài khoản khách hàng trước khi phản hồi.',
      },
    }),
  ]);

  await Promise.all([
    prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        relatedType: 'LEAD',
        relatedId: leads[0].id,
        content:
          'Khách đang quản lý khách bằng Excel, cần hệ thống tập trung để theo dõi chăm sóc và cơ hội bán hàng.',
      },
    }),
    prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        relatedType: 'OPPORTUNITY',
        relatedId: oppAnPhat.id,
        content:
          'Khách đồng ý xem demo sản phẩm trong tuần này, cần chuẩn bị kịch bản theo quy trình bán hàng thực tế.',
      },
    }),
    prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        relatedType: 'CASE',
        relatedId: dashboardCase.id,
        content:
          'Khách cần hướng dẫn lại dashboard và cách lọc công việc theo người phụ trách.',
      },
    }),
    prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
        relatedType: 'ACCOUNT',
        relatedId: saoViet.id,
        content:
          'Khách đã chốt triển khai, cần lên lịch onboarding và bàn giao tài khoản quản trị.',
      },
    }),
  ]);

  const rivalAccount = await prisma.account.create({
    data: {
      id: randomUUID(),
      organizationId: rivalOrg.id,
      ownerId: rivalAdmin.id,
      name: 'Công ty Rival Demo',
      type: 'Khách hàng đối thủ',
      website: 'https://rival-demo.vn',
      phone: '0900 000 001',
      source: 'MANUAL',
      sourceDetail: 'Dữ liệu riêng của Công ty Đối Thủ',
      description: 'Account dùng để kiểm tra cách ly dữ liệu multi-tenant.',
      billingCountry: 'Việt Nam',
      billingStreet: '1 Đường Đối Thủ',
      billingCity: 'Hà Nội',
      billingState: 'Cầu Giấy',
    },
  });

  const rivalContact = await prisma.contact.create({
    data: {
      id: randomUUID(),
      organizationId: rivalOrg.id,
      ownerId: rivalAdmin.id,
      accountId: rivalAccount.id,
      firstName: 'Văn Đối Thủ',
      lastName: 'Lê',
      title: 'Giám đốc',
      email: 'doithu.le@rival-demo.vn',
      phone: '0900 000 002',
      source: 'MANUAL',
      description: 'Contact riêng của Công ty Đối Thủ.',
    },
  });

  const rivalLead = await prisma.lead.create({
    data: {
      id: randomUUID(),
      organizationId: rivalOrg.id,
      ownerId: rivalAdmin.id,
      firstName: 'Văn Rival',
      lastName: 'Nguyễn',
      company: 'Công ty Rival Demo',
      title: 'Trưởng nhóm kinh doanh',
      email: 'rival.nguyen@rival-demo.vn',
      phone: '0900 000 003',
      status: LeadStatus.NEW,
      source: 'MANUAL',
      sourceDetail: 'Lead riêng của Công ty Đối Thủ',
      industry: 'Dịch vụ',
      provinceName: HCM_PROVINCE,
      wardName: 'Phường Sài Gòn',
      addressDetail: '10 Đường Rival',
      description:
        'Lead dùng để kiểm tra tenant Công ty Đối Thủ chỉ thấy dữ liệu riêng.',
    },
  });

  const rivalOpportunity = await prisma.opportunity.create({
    data: {
      id: randomUUID(),
      organizationId: rivalOrg.id,
      ownerId: rivalAdmin.id,
      accountId: rivalAccount.id,
      contactId: rivalContact.id,
      name: 'Cơ hội Rival CRM',
      stage: OpportunityStage.QUALIFY,
      amount: 15000000,
      closeDate: daysFromNow(15),
      source: 'MANUAL',
      nextStep: 'Kiểm tra dữ liệu riêng của tenant đối thủ',
      description: 'Opportunity riêng của Công ty Đối Thủ.',
    },
  });

  const rivalCase = await prisma.case.create({
    data: {
      id: randomUUID(),
      organizationId: rivalOrg.id,
      ownerId: rivalAdmin.id,
      accountId: rivalAccount.id,
      contactId: rivalContact.id,
      subject: 'Yêu cầu hỗ trợ Rival',
      status: CaseStatus.NEW,
      priority: CasePriority.MEDIUM,
      source: 'MANUAL',
      description: 'Case riêng của Công ty Đối Thủ.',
    },
  });

  await Promise.all([
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: rivalOrg.id,
        ownerId: rivalAdmin.id,
        assignedToId: rivalAdmin.id,
        subject: 'Theo dõi cơ hội Rival CRM',
        dueDate: daysFromNow(3),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.NORMAL,
        relatedType: 'OPPORTUNITY',
        relatedId: rivalOpportunity.id,
        description: 'Task riêng để kiểm tra tenant đối thủ.',
      },
    }),
    prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId: rivalOrg.id,
        ownerId: rivalAdmin.id,
        relatedType: 'CASE',
        relatedId: rivalCase.id,
        content: 'Ghi chú riêng của Công ty Đối Thủ, không hiển thị ở tenant mẫu.',
      },
    }),
  ]);

  console.log('\nSeed dữ liệu demo tiếng Việt thành công!');
  console.log('\nOrganizations:');
  console.log(
    `- ${sampleOrg.name}: ${leads.length + 1} leads, ${accounts.length} accounts, ${contacts.length} contacts, ${opportunities.length} opportunities, ${cases.length} cases`,
  );
  console.log(
    `- ${rivalOrg.name}: 1 lead, 1 account, 1 contact, 1 opportunity, 1 case`,
  );
  console.log(`- Lead assignment rules: ${leadAssignmentRules.length} rules`);
  console.log(`- Task templates: ${taskTemplates.length} templates`);
  console.log(
    `- Task comments: ${taskComments.length} comments, including one edited and one deleted comment`,
  );
  console.log(
    `- Recycle Bin demo: Lead "${deletedLead.company}" và Task "Gọi nhắc lịch demo cũ"`,
  );
  console.log(
    `- Owner demo: Sales owns ${leads.filter((lead) => lead.ownerId === salesUser.id).length} active leads; Support owns ${leads.filter((lead) => lead.ownerId === supportUser.id).length} active leads`,
  );
  console.log(`- Web-to-Lead demo wards: Phường Sài Gòn -> Sales, Phường An Khánh -> Support`);
  console.log(`- Sample task with comments: "${salesTemplateTask.subject}"`);
  console.log(`- Sample support task with comments: "${supportDashboardTask.subject}"`);
  console.log('\nDemo Credentials:');
  console.log('--- Công ty Mẫu Việt Nam ---');
  console.log('Admin   - admin@example.com / Admin@123');
  console.log('Manager - manager@example.com / Manager@123');
  console.log('Sales   - sales@example.com / Sales@123');
  console.log('Support - support@example.com / Support@123');
  console.log('--- Công ty Đối Thủ ---');
  console.log('Admin   - admin@rival.com / Rival@123');
  console.log(
    '\nLưu ý: seed không upload file thật lên Supabase Storage; Task attachment nên được test bằng chức năng upload trên giao diện.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
