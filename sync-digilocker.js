const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('cluso');
    
    console.log('Connected to MongoDB.');

    // Find all candidates
    const candidates = await db.collection('users').find({ role: 'candidate' }).toArray();
    console.log(`Found ${candidates.length} candidates in database.`);

    let syncedCount = 0;

    for (const cand of candidates) {
      if (cand.digilockerProfile && cand.digilockerProfile.verified) {
        console.log(`\nCandidate ${cand.name} (${cand.email}) is DigiLocker verified.`);
        
        // Find corresponding employee in users collection
        const employee = await db.collection('users').findOne({ email: cand.email.toLowerCase(), role: { $ne: 'candidate' } });
        if (employee) {
          console.log(`-> Found employee record for ${cand.email} (ID: ${employee.id}).`);
          
          // Copy to digilocker_verifications
          const dlProfile = cand.digilockerProfile;
          let calculatedAge = null;
          if (dlProfile.dob) {
            try {
              let birthDate = null;
              const dobStr = dlProfile.dob.toString().trim();
              
              // Check format YYYY-MM-DD
              if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
                const parts = dobStr.split('-');
                birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
              }
              // Check format DDMMYYYY
              else if (/^\d{8}$/.test(dobStr)) {
                const part1 = parseInt(dobStr.substring(0, 2), 10);
                const part2 = parseInt(dobStr.substring(2, 4), 10);
                const year = parseInt(dobStr.substring(4, 8), 10);
                let day = part1;
                let month = part2;
                if (part2 > 12) {
                  day = part2;
                  month = part1;
                }
                birthDate = new Date(year, month - 1, day);
              }
              // Check format with separators (e.g. DD-MM-YYYY, MM-DD-YYYY, DD/MM/YYYY, MM/DD/YYYY)
              else {
                const parts = dobStr.split(/[-/]/);
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                  } else if (parts[2].length === 4) {
                    const val1 = parseInt(parts[0], 10);
                    const val2 = parseInt(parts[1], 10);
                    const year = parseInt(parts[2], 10);
                    
                    let day = val1;
                    let month = val2;
                    
                    if (val2 > 12) {
                      day = val2;
                      month = val1;
                    } else if (val1 > 12) {
                      day = val1;
                      month = val2;
                    }
                    birthDate = new Date(year, month - 1, day);
                  }
                }
              }

              if (birthDate && !isNaN(birthDate.getTime())) {
                const today = new Date();
                calculatedAge = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                  calculatedAge--;
                }
              }
            } catch {}
          }

          const verificationData = {
            userId: employee.id,
            verified: true,
            digilockerid: dlProfile.digilockerid || null,
            name: dlProfile.name || null,
            dob: dlProfile.dob || null,
            age: calculatedAge,
            gender: dlProfile.gender || null,
            aadhaar: dlProfile.maskedAadhaar || null,
            mobile: dlProfile.mobile || null,
            email: dlProfile.email || null,
            reference_key: dlProfile.referenceKey || null,
            username: dlProfile.preferredUsername || null,
            pan: dlProfile.panNumber || null,
            dl_no: dlProfile.drivingLicence || null,
            photo: dlProfile.photo || null,
            documents: dlProfile.documents || null,
            rawTokenResponse: dlProfile.rawTokenResponse || null,
            rawUserResponse: dlProfile.rawUserResponse || null,
            rawDocumentsResponse: dlProfile.rawDocumentsResponse || null,
            verifiedAt: dlProfile.linkedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Update digilocker_verifications
          await db.collection('digilocker_verifications').updateOne(
            { userId: employee.id },
            { $set: verificationData },
            { upsert: true }
          );
          console.log(`   - Verification record synced in digilocker_verifications.`);

          // Update users collection record
          await db.collection('users').updateOne(
            { id: employee.id },
            {
              $set: {
                digilockerVerified: true,
                digilockerVerifiedAt: dlProfile.linkedAt || new Date().toISOString(),
                // Also copy profile details
                candidateProfile: cand.candidateProfile || null,
                digilockerProfile: dlProfile || null,
              }
            }
          );
          console.log(`   - Verification flag and profiles copied to user record.`);
          syncedCount++;
        } else {
          console.log(`-> No employee record found for ${cand.email} yet.`);
        }
      }
    }

    console.log(`\nSync complete! Successfully synchronized ${syncedCount} profiles.`);
  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    await client.close();
  }
}

run();
