import {
  CasePriority,
  CaseStatus,
  LeadStatus,
  OpportunityStage,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const hashPassword = (password: string) => bcrypt.hash(password, 10);

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const daysAgo = (days: number) => daysFromNow(-days);

async function cleanDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.case.deleteMany();
  await prisma.task.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
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
        sourceDetail:
          'Khách để lại thông tin từ quảng cáo Facebook về giải pháp CRM cho doanh nghiệp vừa và nhỏ',
        industry: 'Nội thất',
        description:
          'Khách hàng cần hệ thống CRM để quản lý khách hàng, công việc và cơ hội bán hàng.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        firstName: 'Thu Hà',
        lastName: 'Trần',
        company: 'Công ty Cổ phần Giáo dục Minh Tâm',
        title: 'Trưởng phòng tuyển sinh',
        email: 'ha.tran@giaoducminhtam.vn',
        phone: '0912 345 678',
        website: 'https://giaoducminhtam.vn',
        status: LeadStatus.NEW,
        source: 'WEBSITE',
        sourceDetail: 'Khách đăng ký tư vấn trên form website',
        industry: 'Giáo dục',
        description: 'Khách quan tâm giải pháp quản lý học viên và đội ngũ tư vấn tuyển sinh.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        firstName: 'Quốc Huy',
        lastName: 'Phạm',
        company: 'Công ty TNHH Thương mại Hải Nam',
        title: 'Chủ doanh nghiệp',
        email: 'huy.pham@hainamtrade.vn',
        phone: '0933 222 111',
        website: 'https://hainamtrade.vn',
        status: LeadStatus.CONTACTED,
        source: 'PHONE',
        sourceDetail: 'Nhân viên kinh doanh gọi điện tư vấn sau hội thảo',
        industry: 'Thương mại',
        description:
          'Khách hàng cần quản lý báo giá, lịch chăm sóc và thông tin khách hàng doanh nghiệp.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
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
        description: 'Khách đang tìm giải pháp CRM có dashboard quản trị và phân quyền người dùng.',
      },
    }),
    prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
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
        description: 'Khách cần thêm thời gian để đánh giá ngân sách và nhu cầu thực tế.',
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
          'Doanh nghiệp nội thất đang cần hệ thống CRM để quản lý khách hàng và đội kinh doanh.',
        billingCountry: 'Việt Nam',
        billingStreet: '25 Nguyễn Văn Trỗi, Phường 12',
        billingCity: 'TP. Hồ Chí Minh',
        billingState: 'Quận Phú Nhuận',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        name: 'Công ty Cổ phần Giáo dục Minh Tâm',
        type: 'Khách hàng tiềm năng',
        website: 'https://giaoducminhtam.vn',
        phone: '0912 345 678',
        source: 'WEBSITE',
        sourceDetail: 'Đăng ký tư vấn từ website',
        description: 'Đơn vị giáo dục cần quản lý học viên tiềm năng và lịch tư vấn.',
        billingCountry: 'Việt Nam',
        billingStreet: '12 Lê Văn Sỹ',
        billingCity: 'TP. Hồ Chí Minh',
        billingState: 'Quận 3',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        name: 'Công ty TNHH Thương mại Hải Nam',
        type: 'Khách hàng doanh nghiệp',
        website: 'https://hainamtrade.vn',
        phone: '0933 222 111',
        source: 'PHONE',
        sourceDetail: 'Khách được liên hệ qua điện thoại',
        description: 'Công ty thương mại cần quản lý báo giá và cơ hội bán hàng.',
        billingCountry: 'Việt Nam',
        billingStreet: '88 Nguyễn Hữu Cảnh',
        billingCity: 'TP. Hồ Chí Minh',
        billingState: 'Bình Thạnh',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
        name: 'Công ty Cổ phần Công nghệ Sao Việt',
        type: 'Đối tác / khách hàng tiềm năng',
        website: 'https://saoviettech.vn',
        phone: '0987 654 321',
        source: 'REFERRAL',
        sourceDetail: 'Giới thiệu từ khách hàng cũ',
        description: 'Công ty công nghệ quan tâm đến CRM có phân quyền và dashboard.',
        billingCountry: 'Việt Nam',
        billingStreet: '2 Hải Triều',
        billingCity: 'TP. Hồ Chí Minh',
        billingState: 'Quận 1',
      },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        name: 'Công ty TNHH Dịch vụ Du lịch Biển Xanh',
        type: 'Khách hàng chưa triển khai',
        website: 'https://bienxanhtravel.vn',
        phone: '0977 888 999',
        source: 'EMAIL',
        sourceDetail: 'Khách hỏi thông tin qua email',
        description: 'Công ty du lịch quan tâm gói CRM thử nghiệm nhưng chưa có ngân sách.',
        billingCountry: 'Việt Nam',
        billingStreet: '45 Trần Hưng Đạo',
        billingCity: 'Đà Nẵng',
        billingState: 'Quận Sơn Trà',
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
        mailingStreet: '25 Nguyễn Văn Trỗi, Phường 12',
        mailingCity: 'TP. Hồ Chí Minh',
        mailingState: 'Quận Phú Nhuận',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: minhTam.id,
        firstName: 'Thu Hà',
        lastName: 'Trần',
        title: 'Trưởng phòng tuyển sinh',
        email: 'ha.tran@giaoducminhtam.vn',
        phone: '0912 345 678',
        source: 'WEBSITE',
        sourceDetail: 'Đăng ký tư vấn từ website',
        description: 'Phụ trách đội tư vấn tuyển sinh và quản lý học viên tiềm năng.',
        mailingCountry: 'Việt Nam',
        mailingStreet: '12 Lê Văn Sỹ',
        mailingCity: 'TP. Hồ Chí Minh',
        mailingState: 'Quận 3',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
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
        mailingStreet: '88 Nguyễn Hữu Cảnh',
        mailingCity: 'TP. Hồ Chí Minh',
        mailingState: 'Bình Thạnh',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
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
        mailingStreet: '2 Hải Triều',
        mailingCity: 'TP. Hồ Chí Minh',
        mailingState: 'Quận 1',
      },
    }),
    prisma.contact.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
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
        mailingStreet: '45 Trần Hưng Đạo',
        mailingCity: 'Đà Nẵng',
        mailingState: 'Quận Sơn Trà',
      },
    }),
  ]);

  const [contactAnPhat, contactMinhTam, contactHaiNam, contactSaoViet, contactBienXanh] = contacts;

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
        description: 'Khách hàng đã xác định nhu cầu và đang chờ đề xuất triển khai.',
        stageChangedAt: daysAgo(1),
        stageChangedById: salesUser.id,
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: minhTam.id,
        contactId: contactMinhTam.id,
        name: 'Gói CRM tuyển sinh cho Giáo dục Minh Tâm',
        stage: OpportunityStage.QUALIFY,
        amount: 62000000,
        closeDate: daysFromNow(45),
        nextStep: 'Tư vấn quy trình quản lý học viên tiềm năng',
        source: 'WEBSITE',
        sourceDetail: 'Đăng ký tư vấn từ website',
        description:
          'Khách hàng cần đánh giá khả năng phù hợp của hệ thống với quy trình tuyển sinh.',
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        accountId: haiNam.id,
        contactId: contactHaiNam.id,
        name: 'Quản lý báo giá cho Thương mại Hải Nam',
        stage: OpportunityStage.NEGOTIATE,
        amount: 45000000,
        closeDate: daysFromNow(20),
        nextStep: 'Thương lượng chi phí triển khai và thời gian bàn giao',
        source: 'PHONE',
        sourceDetail: 'Khách được liên hệ qua điện thoại',
        description: 'Khách hàng đã nhận báo giá và đang thương lượng điều khoản.',
        stageChangedAt: daysAgo(2),
        stageChangedById: salesUser.id,
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
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
        stageChangedById: managerUser.id,
      },
    }),
    prisma.opportunity.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
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
        stageChangedById: salesUser.id,
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
        accountId: anPhat.id,
        contactId: contactAnPhat.id,
        subject: 'Vấn đề về đăng nhập',
        status: CaseStatus.NEW,
        priority: CasePriority.HIGH,
        source: 'EMAIL',
        sourceDetail: 'Khách gửi email cho bộ phận hỗ trợ',
        description: 'Khách hàng phản ánh không đăng nhập được vào hệ thống sau khi đổi mật khẩu.',
      },
    }),
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
        accountId: saoViet.id,
        contactId: contactSaoViet.id,
        subject: 'Cập nhật thông tin người dùng trong hệ thống',
        status: CaseStatus.CLOSED,
        priority: CasePriority.LOW,
        source: 'EMAIL',
        sourceDetail: 'Khách gửi yêu cầu cập nhật qua email',
        description: 'Khách yêu cầu cập nhật lại thông tin người dùng nội bộ.',
        closedAt: daysAgo(2),
        closedById: supportUser.id,
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
        status: CaseStatus.CLOSED,
        priority: CasePriority.URGENT,
        source: 'PHONE',
        sourceDetail: 'Khách gọi điện báo lỗi định dạng tiền tệ',
        description: 'Khách phản ánh báo giá hiển thị sai định dạng tiền tệ.',
        closedAt: daysAgo(1),
        closedById: supportUser.id,
      },
    }),
  ]);

  const [loginCase] = cases;

  await Promise.all([
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
        subject: 'Gửi bảng báo giá CRM cho Công ty An Phát',
        dueDate: daysFromNow(2),
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        relatedType: 'OPPORTUNITY',
        relatedId: oppAnPhat.id,
        description: 'Chuẩn bị bảng giá và lịch demo gửi cho khách hàng An Phát.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        assignedToId: salesUser.id,
        subject: 'Chuẩn bị demo cho Giáo dục Minh Tâm',
        dueDate: daysFromNow(5),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.NORMAL,
        relatedType: 'OPPORTUNITY',
        relatedId: oppMinhTam.id,
        description: 'Chuẩn bị kịch bản demo theo quy trình tư vấn tuyển sinh.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: supportUser.id,
        assignedToId: supportUser.id,
        subject: 'Kiểm tra phản hồi hỗ trợ đăng nhập',
        dueDate: daysFromNow(1),
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        relatedType: 'CASE',
        relatedId: loginCase.id,
        description: 'Kiểm tra tài khoản khách hàng và hướng dẫn đặt lại mật khẩu.',
      },
    }),
    prisma.task.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: managerUser.id,
        assignedToId: managerUser.id,
        subject: 'Cập nhật thông tin hợp đồng Sao Việt',
        dueDate: daysAgo(3),
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.NORMAL,
        relatedType: 'ACCOUNT',
        relatedId: saoViet.id,
        description: 'Hoàn tất thông tin hợp đồng và chuẩn bị onboarding cho Sao Việt.',
        completedAt: daysAgo(3),
        completedById: managerUser.id,
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

  await Promise.all([
    prisma.note.create({
      data: {
        id: randomUUID(),
        organizationId: sampleOrg.id,
        ownerId: salesUser.id,
        relatedType: 'LEAD',
        relatedId: leads[0].id,
        content:
          'Khách hàng đang quản lý khách bằng Excel, cần hệ thống tập trung để theo dõi chăm sóc và cơ hội bán hàng.',
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
        relatedId: loginCase.id,
        content:
          'Khách báo không đăng nhập được sau khi đổi mật khẩu, cần kiểm tra lại tài khoản và hướng dẫn đặt lại mật khẩu.',
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
      description: 'Lead dùng để kiểm tra tenant Công ty Đối Thủ chỉ thấy dữ liệu riêng.',
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
    `- ${sampleOrg.name}: ${leads.length + 1} leads, ${accounts.length} accounts, ${contacts.length} contacts`
  );
  console.log(`- ${rivalOrg.name}: 1 lead, 1 account, 1 contact, 1 opportunity, 1 case`);
  console.log(`- Recycle Bin demo: Lead "${deletedLead.company}" và Task "Gọi nhắc lịch demo cũ"`);
  console.log('\nDemo Credentials:');
  console.log('--- Công ty Mẫu Việt Nam ---');
  console.log('Admin   - admin@example.com / Admin@123');
  console.log('Manager - manager@example.com / Manager@123');
  console.log('Sales   - sales@example.com / Sales@123');
  console.log('Support - support@example.com / Support@123');
  console.log('--- Công ty Đối Thủ ---');
  console.log('Admin   - admin@rival.com / Rival@123');
  console.log(
    '\nLưu ý: Organization schema hiện chưa có field description, nên mô tả tổ chức không được lưu trong database.'
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
