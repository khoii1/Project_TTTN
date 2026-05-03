import { PrismaClient, UserRole, LeadStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.note.deleteMany();
  await prisma.case.deleteMany();
  await prisma.task.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: randomUUID(),
      name: 'Sample Company Inc.',
    },
  });

  console.log(`Created organization: ${org.name}`);

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@123', 10);
  const salesPasswordHash = await bcrypt.hash('Sales@123', 10);

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      firstName: 'John',
      lastName: 'Admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      firstName: 'Jane',
      lastName: 'Manager',
      email: 'manager@example.com',
      passwordHash: managerPasswordHash,
      role: UserRole.MANAGER,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      firstName: 'Bob',
      lastName: 'Sales',
      email: 'sales@example.com',
      passwordHash: salesPasswordHash,
      role: UserRole.SALES,
    },
  });

  console.log(`Created users: ${adminUser.email}, ${managerUser.email}, ${salesUser.email}`);

  // Create leads
  const lead1 = await prisma.lead.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      firstName: 'Alice',
      lastName: 'Johnson',
      company: 'Tech Corp',
      email: 'alice@techcorp.com',
      phone: '+1-555-0101',
      status: LeadStatus.NEW,
      source: 'Website',
      industry: 'Technology',
      title: 'CTO',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      firstName: 'Charlie',
      lastName: 'Smith',
      company: 'Innovation Labs',
      email: 'charlie@innovationlabs.com',
      phone: '+1-555-0102',
      status: LeadStatus.CONTACTED,
      source: 'LinkedIn',
      industry: 'Consulting',
      title: 'CEO',
    },
  });

  console.log(`Created leads: ${lead1.company}, ${lead2.company}`);

  // Create accounts
  const account1 = await prisma.account.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      name: 'Global Solutions Inc',
      website: 'https://globalsolutions.com',
      type: 'Enterprise',
      phone: '+1-555-0201',
      billingCountry: 'USA',
      billingCity: 'New York',
    },
  });

  const account2 = await prisma.account.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: managerUser.id,
      name: 'Digital Innovations Ltd',
      website: 'https://digitalinnovations.com',
      type: 'Mid-Market',
      phone: '+1-555-0202',
      billingCountry: 'USA',
      billingCity: 'San Francisco',
    },
  });

  console.log(`Created accounts: ${account1.name}, ${account2.name}`);

  // Create contacts
  const contact1 = await prisma.contact.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      accountId: account1.id,
      firstName: 'David',
      lastName: 'Brown',
      email: 'david@globalsolutions.com',
      phone: '+1-555-0301',
      title: 'VP Sales',
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: managerUser.id,
      accountId: account2.id,
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma@digitalinnovations.com',
      phone: '+1-555-0302',
      title: 'COO',
    },
  });

  console.log(
    `Created contacts: ${contact1.firstName} ${contact1.lastName}, ${contact2.firstName} ${contact2.lastName}`
  );

  // Create opportunities
  const opp1 = await prisma.opportunity.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      accountId: account1.id,
      contactId: contact1.id,
      name: 'Enterprise Software Deal',
      stage: 'QUALIFY',
      amount: '500000',
      closeDate: new Date('2024-12-31'),
      description: 'Large enterprise software implementation',
    },
  });

  const opp2 = await prisma.opportunity.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: managerUser.id,
      accountId: account2.id,
      contactId: contact2.id,
      name: 'Digital Transformation Project',
      stage: 'PROPOSE',
      amount: '250000',
      closeDate: new Date('2024-11-30'),
      description: 'Cloud migration and modernization',
    },
  });

  console.log(`Created opportunities: ${opp1.name}, ${opp2.name}`);

  // Create tasks
  const task1 = await prisma.task.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      assignedToId: salesUser.id,
      subject: 'Follow up with Global Solutions',
      dueDate: new Date('2024-05-30'),
      status: 'NOT_STARTED',
      priority: 'HIGH',
      relatedType: 'ACCOUNT',
      relatedId: account1.id,
      description: 'Schedule demo for enterprise software',
    },
  });

  console.log(`Created task: ${task1.subject}`);

  // Create notes
  const note1 = await prisma.note.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: salesUser.id,
      content: 'Client is interested in Q3 implementation',
      relatedType: 'ACCOUNT',
      relatedId: account1.id,
    },
  });

  console.log(`Created note for account`);

  // Create case
  const crmCase = await prisma.case.create({
    data: {
      id: randomUUID(),
      organizationId: org.id,
      ownerId: managerUser.id,
      accountId: account2.id,
      contactId: contact2.id,
      subject: 'Integration issue with legacy system',
      status: 'WORKING',
      priority: 'HIGH',
      description: 'Need to resolve data sync issues',
    },
  });

  console.log(`Created case: ${crmCase.subject}`);

  // ===== Second Organization (for multi-tenant isolation testing) =====

  const org2 = await prisma.organization.create({
    data: {
      id: randomUUID(),
      name: 'Rival Corp',
    },
  });

  const rivalPasswordHash = await bcrypt.hash('Rival@123', 10);

  const rivalAdmin = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: org2.id,
      firstName: 'Eve',
      lastName: 'Rival',
      email: 'admin@rival.com',
      passwordHash: rivalPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const rivalLead = await prisma.lead.create({
    data: {
      id: randomUUID(),
      organizationId: org2.id,
      ownerId: rivalAdmin.id,
      firstName: 'Frank',
      lastName: 'Competitor',
      company: 'Rival Startup',
      email: 'frank@rivalstartup.com',
      status: LeadStatus.NEW,
      source: 'Referral',
    },
  });

  const rivalAccount = await prisma.account.create({
    data: {
      id: randomUUID(),
      organizationId: org2.id,
      ownerId: rivalAdmin.id,
      name: 'Rival Client LLC',
      type: 'SMB',
    },
  });

  console.log(`Created second organization: ${org2.name}`);
  console.log(`Created rival user: ${rivalAdmin.email}`);
  console.log(`Created rival lead: ${rivalLead.company}`);
  console.log(`Created rival account: ${rivalAccount.name}`);

  console.log('\nSeed data created successfully!');
  console.log('\nTest Credentials:');
  console.log('--- Organization: Sample Company Inc. ---');
  console.log('Admin - Email: admin@example.com, Password: Admin@123');
  console.log('Manager - Email: manager@example.com, Password: Manager@123');
  console.log('Sales - Email: sales@example.com, Password: Sales@123');
  console.log('--- Organization: Rival Corp ---');
  console.log('Admin - Email: admin@rival.com, Password: Rival@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
