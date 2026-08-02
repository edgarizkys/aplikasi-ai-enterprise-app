import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Starting database seed...');

    // Clean existing data
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // Seed Tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'tenant-default-001',
        name: 'Aplikasi AI Enterprise',
        slug: 'ai-enterprise',
        logo: null,
        isActive: true,
      },
    });
    console.log('✅ Tenant created:', tenant.id);

    // Seed Users
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        id: 'user-admin-001',
        tenantId: tenant.id,
        email: 'admin@aienter.local',
        password: hashedPassword,
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });
    console.log('✅ Admin user created:', adminUser.email);

    const editorUser = await prisma.user.create({
      data: {
        id: 'user-editor-001',
        tenantId: tenant.id,
        email: 'editor@aienter.local',
        password: hashedPassword,
        fullName: 'Editor User',
        role: 'EDITOR',
        isActive: true,
        emailVerified: true,
      },
    });
    console.log('✅ Editor user created:', editorUser.email);

    const viewerUser = await prisma.user.create({
      data: {
        id: 'user-viewer-001',
        tenantId: tenant.id,
        email: 'viewer@aienter.local',
        password: hashedPassword,
        fullName: 'Viewer User',
        role: 'VIEWER',
        isActive: true,
        emailVerified: true,
      },
    });
    console.log('✅ Viewer user created:', viewerUser.email);

    // Seed Items
    const itemsData = [
      {
        id: 'item-001',
        tenantId: tenant.id,
        name: 'Item 1',
        description: 'Deskripsi item pertama untuk testing dan dokumentasi sistem',
        status: 'active',
        createdBy: adminUser.id,
      },
      {
        id: 'item-002',
        tenantId: tenant.id,
        name: 'Item 2',
        description: 'Deskripsi item kedua dengan data sample lengkap',
        status: 'active',
        createdBy: adminUser.id,
      },
      {
        id: 'item-003',
        tenantId: tenant.id,
        name: 'Item 3',
        description: 'Item tidak aktif untuk testing filter status',
        status: 'inactive',
        createdBy: editorUser.id,
      },
      {
        id: 'item-004',
        tenantId: tenant.id,
        name: 'Item 4',
        description: 'Item dalam draft untuk workflow management',
        status: 'draft',
        createdBy: editorUser.id,
      },
      {
        id: 'item-005',
        tenantId: tenant.id,
        name: 'Item 5',
        description: 'Item terakhir untuk completeness testing',
        status: 'active',
        createdBy: adminUser.id,
      },
    ];

    const createdItems = await Promise.all(
      itemsData.map(item =>
        prisma.item.create({
          data: item,
        })
      )
    );
    console.log('✅ Items created:', createdItems.length);

    // Print seed summary
    console.log('\n📊 Seed Summary:');
    console.log('─'.repeat(50));
    console.log(`Tenant: ${tenant.name}`);
    console.log(`Users: 3 (Admin, Editor, Viewer)`);
    console.log(`Items: ${createdItems.length}`);
    console.log('─'.repeat(50));
    console.log('\n🔐 Test Credentials:');
    console.log(`Admin:  admin@aienter.local / admin123`);
    console.log(`Editor: editor@aienter.local / admin123`);
    console.log(`Viewer: viewer@aienter.local / admin123`);
    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();