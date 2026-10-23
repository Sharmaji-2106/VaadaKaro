import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // Create some users with LAWYER role
  const lawyers = [
    {
      name: 'Adv. Rahul Deshmukh',
      email: 'rahul.lawyer@example.com',
      role: 'LAWYER',
      location: 'Mumbai',
      lawyerProfile: {
        create: {
          barNumber: 'MAH/1234/2010',
          specialization: ['Criminal', 'RTl'],
          location: 'Mumbai',
          pincode: '400001',
          fees: 1500,
          experience: 12,
          languages: ['English', 'Marathi', 'Hindi'],
          bio: 'Expert in criminal defense and RTI matters with over 12 years of experience in Bombay High Court.',
          rating: 4.8
        }
      }
    },
    {
      name: 'Adv. Priya Kulkarni',
      email: 'priya.lawyer@example.com',
      role: 'LAWYER',
      location: 'Pune',
      lawyerProfile: {
        create: {
          barNumber: 'MAH/5678/2015',
          specialization: ['Consumer', 'Family'],
          location: 'Pune',
          pincode: '411001',
          fees: 1000,
          experience: 8,
          languages: ['English', 'Marathi', 'Hindi'],
          bio: 'Specialized in consumer protection and family law disputes.',
          rating: 4.9
        }
      }
    }
  ];

  for (const lawyer of lawyers) {
    await prisma.user.upsert({
      where: { email: lawyer.email },
      update: {},
      create: {
        name: lawyer.name,
        email: lawyer.email,
        role: 'LAWYER' as any,
        location: lawyer.location,
        lawyerProfile: lawyer.lawyerProfile
      } as any
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
