require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI found");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('cluso');
  
  const adminsCol = db.collection('admins');

  // Delete ALL existing CRM admins
  const deleteResult = await adminsCol.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} existing admin(s) from 'admins' collection.`);

  const passwordHash = await bcrypt.hash('Cluso@2026', 10);

  // Create pkumar@cluso.in
  await adminsCol.insertOne({
    id: 'superadmin-001',
    name: 'P Kumar',
    email: 'pkumar@cluso.in',
    password: passwordHash,
    role: 'Super Admin',
    status: 'active',
    createdAt: new Date().toISOString()
  });
  console.log('Created: pkumar@cluso.in (Super Admin)');

  // Create indiaops@cluso.in
  await adminsCol.insertOne({
    id: 'superadmin-002',
    name: 'India Ops',
    email: 'indiaops@cluso.in',
    password: passwordHash,
    role: 'Super Admin',
    status: 'active',
    createdAt: new Date().toISOString()
  });
  console.log('Created: indiaops@cluso.in (Super Admin)');

  console.log('\n--- CRM Admin Credentials ---');
  console.log('Email: pkumar@cluso.in   | Password: Cluso@2026');
  console.log('Email: indiaops@cluso.in | Password: Cluso@2026');

  await client.close();
}

seed().catch(console.error);
