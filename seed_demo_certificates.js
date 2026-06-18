require('dotenv').config();
const { MongoClient } = require('mongodb');

const DEMO_CERTS = [
  {
    id: 'cb245a4eda644354',
    type: 'completion',
    category: 'internship',
    recipientId: 'CI-2026-AHMAD',
    recipientName: 'Ahmad Shajee',
    recipientEmail: 'ahmadshajee0@gmail.com',
    recipientDesignation: 'AI Engineer',
    respondentName: 'Prabir Kumar',
    respondentRole: 'Super Admin',
    respondentDepartment: 'Operations',
    dateFrom: '17 June 2026',
    dateTo: '17 December 2026',
    remarks: 'hardworking, diligent, and honest in performing their duties',
    template: 'modern',
    createdAt: new Date().toISOString(),
    createdBy: 'pkumar@cluso.in',
    shared: true,
    sharedAt: new Date().toISOString()
  },
  {
    id: 'eb325f4eda644999',
    type: 'excellence',
    category: '',
    recipientId: 'CI-2026-AHMAD',
    recipientName: 'Ahmad Shajee',
    recipientEmail: 'ahmadshajee0@gmail.com',
    recipientDesignation: 'Product Manager',
    respondentName: 'Prabir Kumar',
    respondentRole: 'Founder & CEO',
    respondentDepartment: 'Management',
    dateFrom: '01 June 2026',
    dateTo: '15 June 2026',
    remarks: 'demonstrated exceptional leadership, outstanding engineering execution, and dedication',
    template: 'executive',
    createdAt: new Date().toISOString(),
    createdBy: 'pkumar@cluso.in',
    shared: true,
    sharedAt: new Date().toISOString()
  }
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI found in env");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('cluso');
  
  const certsCol = db.collection('certificates');
  
  for (const cert of DEMO_CERTS) {
    const existing = await certsCol.findOne({ id: cert.id });
    if (!existing) {
      await certsCol.insertOne(cert);
      console.log(`Seeded demo certificate: ${cert.id} for ${cert.recipientEmail}`);
    } else {
      console.log(`Certificate ${cert.id} already exists`);
    }
  }
  
  await client.close();
}

seed().catch(console.error);
