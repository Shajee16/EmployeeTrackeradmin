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
  const existing = await adminsCol.findOne({ email: 'pkumar@cluso.in' });
  if (!existing) {
    const password = await bcrypt.hash('Cluso@2026', 10);
    await adminsCol.insertOne({
      id: 'superadmin-001',
      name: 'P Kumar',
      email: 'pkumar@cluso.in',
      password: password,
      role: 'Super Admin',
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log('Seeded pkumar@cluso.in');
  } else {
    console.log('pkumar@cluso.in already exists');
  }
  await client.close();
}

seed().catch(console.error);
