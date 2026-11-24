import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Multi-Tenant SaaS Database...');

  // Clean existing data
  await prisma.processedEvent.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const saltRounds = 10;
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', saltRounds);
  const tenantAdminPassword = await bcrypt.hash('TenantAdmin123!', saltRounds);
  const staffPassword = await bcrypt.hash('StaffPass123!', saltRounds);

  // 1. Create Tenant 1: ABC Electronics
  const tenantABC = await prisma.tenant.create({
    data: {
      name: 'ABC Electronics',
      slug: 'abc-electronics',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    },
  });

  // 2. Create Tenant 2: XYZ Fashion
  const tenantXYZ = await prisma.tenant.create({
    data: {
      name: 'XYZ Fashion',
      slug: 'xyz-fashion',
      plan: 'PRO',
      status: 'ACTIVE',
    },
  });

  console.log(`Created Tenants: ${tenantABC.name} (${tenantABC.id}) and ${tenantXYZ.name} (${tenantXYZ.id})`);

  // 3. Create Super Admin (Associated to Tenant ABC default root, with global SUPER_ADMIN role)
  await prisma.user.create({
    data: {
      tenant_id: tenantABC.id,
      email: 'superadmin@saasplatform.com',
      password_hash: superAdminPassword,
      first_name: 'Platform',
      last_name: 'SuperAdmin',
      role: Role.SUPER_ADMIN,
    },
  });

  // 4. Create Users for ABC Electronics
  const abcAdmin = await prisma.user.create({
    data: {
      tenant_id: tenantABC.id,
      email: 'admin@abcelectronics.com',
      password_hash: tenantAdminPassword,
      first_name: 'Alex',
      last_name: 'Chen',
      role: Role.TENANT_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      tenant_id: tenantABC.id,
      email: 'staff@abcelectronics.com',
      password_hash: staffPassword,
      first_name: 'Brian',
      last_name: 'Smith',
      role: Role.STAFF,
    },
  });

  // 5. Create Users for XYZ Fashion
  const xyzAdmin = await prisma.user.create({
    data: {
      tenant_id: tenantXYZ.id,
      email: 'admin@xyzfashion.com',
      password_hash: tenantAdminPassword,
      first_name: 'Elena',
      last_name: 'Rostova',
      role: Role.TENANT_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      tenant_id: tenantXYZ.id,
      email: 'staff@xyzfashion.com',
      password_hash: staffPassword,
      first_name: 'Marcus',
      last_name: 'Vance',
      role: Role.STAFF,
    },
  });

  // 6. Create Customers for ABC Electronics
  const abcCustomer1 = await prisma.customer.create({
    data: {
      tenant_id: tenantABC.id,
      name: 'Acme Technologies Inc',
      email: 'procurement@acmetech.io',
      phone: '+1 (555) 234-5678',
      address: '100 Silicon Blvd, San Jose, CA',
    },
  });

  const abcCustomer2 = await prisma.customer.create({
    data: {
      tenant_id: tenantABC.id,
      name: 'Apex Solutions LLC',
      email: 'office@apexsolutions.com',
      phone: '+1 (555) 876-5432',
      address: '450 Innovation Way, Austin, TX',
    },
  });

  // 7. Create Customers for XYZ Fashion
  const xyzCustomer1 = await prisma.customer.create({
    data: {
      tenant_id: tenantXYZ.id,
      name: 'Manhattan Boutique Co',
      email: 'buyer@manhattanboutique.com',
      phone: '+1 (212) 555-0199',
      address: '742 5th Avenue, New York, NY',
    },
  });

  const xyzCustomer2 = await prisma.customer.create({
    data: {
      tenant_id: tenantXYZ.id,
      name: 'Urban Trends Retail',
      email: 'orders@urbantrends.co',
      phone: '+1 (312) 555-0144',
      address: '88 Michigan Ave, Chicago, IL',
    },
  });

  // 8. Create Products & Inventory for ABC Electronics
  const abcProductsData = [
    { sku: 'ELEC-LT-01', name: 'Pro Gaming Laptop 16"', price: 1499.99, qty: 45, category: 'Computers' },
    { sku: 'ELEC-SP-02', name: 'Ultra Smartphone 256GB', price: 899.99, qty: 120, category: 'Mobile' },
    { sku: 'ELEC-HD-03', name: 'Noise-Cancelling ANC Headphones', price: 249.99, qty: 80, category: 'Audio' },
    { sku: 'ELEC-MN-04', name: 'Curved UltraWide 34" Monitor', price: 599.99, qty: 35, category: 'Displays' },
    { sku: 'ELEC-KB-05', name: 'RGB Mechanical Gaming Keyboard', price: 129.99, qty: 150, category: 'Accessories' },
  ];

  const createdAbcProducts = [];
  for (const item of abcProductsData) {
    const product = await prisma.product.create({
      data: {
        tenant_id: tenantABC.id,
        sku: item.sku,
        name: item.name,
        price: item.price,
        category: item.category,
        description: `High performance ${item.name} for enterprise and power users.`,
        inventory: {
          create: {
            tenant_id: tenantABC.id,
            quantity: item.qty,
            reserved_quantity: 0,
            location: 'Warehouse-Silicon-Valley',
          },
        },
      },
    });
    createdAbcProducts.push(product);
  }

  // 9. Create Products & Inventory for XYZ Fashion
  const xyzProductsData = [
    { sku: 'FASH-JK-01', name: 'Vintage Denim Jacket', price: 89.50, qty: 60, category: 'Outerwear' },
    { sku: 'FASH-SN-02', name: 'Premium Streetwear Sneakers', price: 145.00, qty: 95, category: 'Footwear' },
    { sku: 'FASH-SC-03', name: 'Mulberry Silk Scarf', price: 48.00, qty: 110, category: 'Accessories' },
    { sku: 'FASH-TS-04', name: 'Organic Cotton Crew T-Shirt', price: 28.00, qty: 250, category: 'Apparel' },
    { sku: 'FASH-BL-05', name: 'Full-Grain Leather Belt', price: 55.00, qty: 75, category: 'Accessories' },
  ];

  const createdXyzProducts = [];
  for (const item of xyzProductsData) {
    const product = await prisma.product.create({
      data: {
        tenant_id: tenantXYZ.id,
        sku: item.sku,
        name: item.name,
        price: item.price,
        category: item.category,
        description: `Handcrafted ${item.name} designed with premium eco-friendly materials.`,
        inventory: {
          create: {
            tenant_id: tenantXYZ.id,
            quantity: item.qty,
            reserved_quantity: 0,
            location: 'Warehouse-SoHo-NYC',
          },
        },
      },
    });
    createdXyzProducts.push(product);
  }

  // 10. Create Sample Orders for ABC Electronics
  const orderABC1 = await prisma.order.create({
    data: {
      tenant_id: tenantABC.id,
      customer_id: abcCustomer1.id,
      order_number: 'ORD-ABC-1001',
      status: OrderStatus.CONFIRMED,
      total_amount: 3249.97,
      notes: 'Corporate workstation upgrade order',
      items: {
        create: [
          {
            tenant_id: tenantABC.id,
            product_id: createdAbcProducts[0].id, // Laptop
            quantity: 2,
            unit_price: 1499.99,
            subtotal: 2999.98,
          },
          {
            tenant_id: tenantABC.id,
            product_id: createdAbcProducts[2].id, // Headphones
            quantity: 1,
            unit_price: 249.99,
            subtotal: 249.99,
          },
        ],
      },
    },
  });

  const orderABC2 = await prisma.order.create({
    data: {
      tenant_id: tenantABC.id,
      customer_id: abcCustomer2.id,
      order_number: 'ORD-ABC-1002',
      status: OrderStatus.PROCESSING,
      total_amount: 729.98,
      notes: 'Urgent replacement accessories',
      items: {
        create: [
          {
            tenant_id: tenantABC.id,
            product_id: createdAbcProducts[3].id, // Monitor
            quantity: 1,
            unit_price: 599.99,
            subtotal: 599.99,
          },
          {
            tenant_id: tenantABC.id,
            product_id: createdAbcProducts[4].id, // Keyboard
            quantity: 1,
            unit_price: 129.99,
            subtotal: 129.99,
          },
        ],
      },
    },
  });

  // 11. Create Sample Orders for XYZ Fashion
  const orderXYZ1 = await prisma.order.create({
    data: {
      tenant_id: tenantXYZ.id,
      customer_id: xyzCustomer1.id,
      order_number: 'ORD-XYZ-5001',
      status: OrderStatus.DELIVERED,
      total_amount: 324.00,
      notes: 'Spring showcase display items',
      items: {
        create: [
          {
            tenant_id: tenantXYZ.id,
            product_id: createdXyzProducts[0].id, // Denim Jacket
            quantity: 2,
            unit_price: 89.50,
            subtotal: 179.00,
          },
          {
            tenant_id: tenantXYZ.id,
            product_id: createdXyzProducts[1].id, // Sneakers
            quantity: 1,
            unit_price: 145.00,
            subtotal: 145.00,
          },
        ],
      },
    },
  });

  console.log('Database seeded successfully with demo accounts, catalogs, and orders!');
  console.log('--- DEMO CREDENTIALS ---');
  console.log('Super Admin:       superadmin@saasplatform.com / SuperAdmin123!');
  console.log('ABC Tenant Admin:  admin@abcelectronics.com    / TenantAdmin123!');
  console.log('ABC Staff:         staff@abcelectronics.com    / StaffPass123!');
  console.log('XYZ Tenant Admin:  admin@xyzfashion.com        / TenantAdmin123!');
  console.log('XYZ Staff:         staff@xyzfashion.com        / StaffPass123!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
