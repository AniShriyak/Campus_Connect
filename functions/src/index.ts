import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Nodemailer configuration
// Using a mock Ethereal mail account by default. For production, replace with SendGrid/Resend
let mailTransporter: nodemailer.Transporter;

async function getMailTransporter(): Promise<nodemailer.Transporter> {
  if (mailTransporter) return mailTransporter;
  
  try {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    mailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal SMTP transporter configured successfully.');
  } catch (err) {
    console.error('Failed to create Ethereal SMTP transporter, falling back to mock logger:', err);
    mailTransporter = {
      sendMail: async (options: any) => {
        console.log('--- MOCK EMAIL ---');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Body:', options.text);
        console.log('------------------');
        return { messageId: 'mock-id' };
      }
    } as any;
  }
  return mailTransporter;
}

/**
 * Cloud Function to generate and send a 6-digit OTP to the student's college email.
 */
export const sendOTP = onCall(async (request) => {
  const { email } = request.data as { email?: string };

  if (!email) {
    throw new HttpsError('invalid-argument', 'The function must be called with an email address.');
  }

  // Regex validation for college emails ending in .ac.in
  const collegeEmailRegex = /^[^\s@]+@[^\s@]+\.ac\.in$/;
  if (!collegeEmailRegex.test(email)) {
    throw new HttpsError('invalid-argument', 'Only college emails (.ac.in) are permitted.');
  }

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save OTP to Firestore with 10 min TTL
  const otpRef = db.collection('otpCodes').doc(email);
  await otpRef.set({
    code: otpCode,
    createdAt: Date.now(),
    attempts: 0
  });

  // Log to Console for testing/emulators
  console.log(`[AUTH] Generated OTP for ${email}: ${otpCode}`);

  try {
    const transporter = await getMailTransporter();
    const info = await transporter.sendMail({
      from: '"CampusConnect Auth" <auth@campusconnect.app>',
      to: email,
      subject: 'Your CampusConnect Verification Code',
      text: `Your verification code is ${otpCode}. It is valid for 10 minutes.`,
      html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #007AFF;">CampusConnect Verification</h2>
        <p>Use the following 6-digit code to complete your login or registration:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1C1C1E; margin: 20px 0;">${otpCode}</div>
        <p style="color: #666; font-size: 12px;">This code is valid for 10 minutes and can only be used 3 times.</p>
      </div>`,
    });

    // If using ethereal.email, return preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[AUTH] Ethereal email preview URL: ${previewUrl}`);
      return { success: true, previewUrl };
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }

  return { success: true };
});

/**
 * Cloud Function to verify the OTP.
 * On success, generates a custom Firebase Auth token and creates the user profile if it's a signup.
 */
export const verifyOTP = onCall(async (request) => {
  const { email, otp, fullName, college, isSignup } = request.data as {
    email?: string;
    otp?: string;
    fullName?: string;
    college?: string;
    isSignup?: boolean;
  };

  if (!email || !otp) {
    throw new HttpsError('invalid-argument', 'Email and OTP are required.');
  }

  const otpRef = db.collection('otpCodes').doc(email);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    throw new HttpsError('not-found', 'No verification code found for this email.');
  }

  const otpData = otpDoc.data()!;
  
  // Check lockout (max 3 attempts)
  if (otpData.attempts >= 3) {
    throw new HttpsError('resource-exhausted', 'Maximum verification attempts exceeded. Please request a new OTP.');
  }

  // Check TTL (10 minutes)
  const tenMinutesMs = 10 * 60 * 1000;
  if (Date.now() - otpData.createdAt > tenMinutesMs) {
    await otpRef.delete();
    throw new HttpsError('deadline-exceeded', 'The verification code has expired. Please request a new one.');
  }

  // Verify OTP
  if (otpData.code !== otp) {
    // Increment attempts
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new HttpsError('permission-denied', 'Incorrect verification code.');
  }

  // OTP verified successfully, clean up
  await otpRef.delete();

  // Handle Firebase Auth User Creation/Retrieval
  let uid = '';
  let userRecord;

  try {
    userRecord = await admin.auth().getUserByEmail(email);
    uid = userRecord.uid;
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      // User doesn't exist, must create
      const createdUser = await admin.auth().createUser({
        email,
        displayName: fullName || undefined,
      });
      uid = createdUser.uid;
    } else {
      throw new HttpsError('internal', e.message || 'Authentication error.');
    }
  }

  // Role Assignment Rules:
  // If email contains "coordinator", assign coordinator role. Else assign student.
  const isCoordinatorEmail = email.toLowerCase().includes('coordinator');
  const roles = isCoordinatorEmail ? ['coordinator'] : ['student'];

  // For signup, create the user profile document in Firestore
  const userDocRef = db.collection('users').doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists && isSignup) {
    await userDocRef.set({
      id: uid,
      fullName: fullName || 'Campus User',
      email,
      college: college || 'Campus College',
      roles: roles,
      interests: [],
      joinedClubs: [],
      createdAt: Date.now()
    });
  }

  // Generate Custom Auth Token
  const customToken = await admin.auth().createCustomToken(uid);
  return { customToken };
});

/**
 * Trigger function: Generates PDF Certificate automatically when a registration status changes to "attended".
 */
export const onRegistrationUpdate = onDocumentUpdated('registrations/{regId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  // Trigger only when transitioning status to 'attended'
  if (beforeData.status !== 'attended' && afterData.status === 'attended') {
    const regId = event.params.regId;
    const { userId, userName, eventId, eventTitle } = afterData;

    console.log(`[CERT] Generating certificate for registration ${regId} (${userName} -> ${eventTitle})`);

    try {
      // 1. Generate PDF Certificate in-memory using pdfkit
      const pdfBuffer = await generatePremiumCertificatePdf(userName, eventTitle);

      // 2. Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const filePath = `certificates/${eventId}/${userId}.pdf`;
      const fileRef = bucket.file(filePath);

      await fileRef.save(pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          metadata: {
            registrationId: regId,
            userId: userId,
            eventId: eventId,
          }
        }
      });

      // 3. Make file publicly readable or construct public media URL
      // Under firebase rules, authenticated users can read.
      // Constructing public URL
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;

      // 4. Update registration document with the URL
      await db.collection('registrations').doc(regId).update({
        certificateUrl: publicUrl
      });

      console.log(`[CERT] Certificate uploaded and updated successfully: ${publicUrl}`);
    } catch (err) {
      console.error('[CERT] Failed to generate or upload certificate:', err);
    }
  }
});

/**
 * Helper function to construct a premium PDF certificate in memory using pdfkit.
 */
function generatePremiumCertificatePdf(studentName: string, eventName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err: Error) => reject(err));

    // Design layout & background
    const width = doc.page.width;
    const height = doc.page.height;

    // Draw Certificate Border
    doc.rect(20, 20, width - 40, height - 40)
       .lineWidth(5)
       .stroke('#007AFF'); // Primary blue color

    doc.rect(28, 28, width - 56, height - 56)
       .lineWidth(1)
       .stroke('#FF9500'); // Accent secondary gold

    // Draw Gold corner designs
    doc.lineWidth(2);
    doc.moveTo(35, 60).lineTo(35, 35).lineTo(60, 35).stroke('#FF9500');
    doc.moveTo(width - 35, 60).lineTo(width - 35, 35).lineTo(width - 60, 35).stroke('#FF9500');
    doc.moveTo(35, height - 60).lineTo(35, height - 35).lineTo(60, height - 35).stroke('#FF9500');
    doc.moveTo(width - 35, height - 60).lineTo(width - 35, height - 35).lineTo(width - 60, height - 35).stroke('#FF9500');

    // Title
    doc.fillColor('#1C1C1E')
       .fontSize(36)
       .font('Helvetica-Bold')
       .text('CERTIFICATE OF PARTICIPATION', 0, 100, { align: 'center' });

    doc.fillColor('#8E8E93')
       .fontSize(16)
       .font('Helvetica')
       .text('This is proudly presented to', 0, 160, { align: 'center' });

    // Student Name
    doc.fillColor('#007AFF')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text(studentName.toUpperCase(), 0, 200, { align: 'center' });

    // Decorative underline under name
    doc.moveTo(width / 2 - 150, 240)
       .lineTo(width / 2 + 150, 240)
       .lineWidth(1.5)
       .stroke('#8E8E93');

    // Event content
    doc.fillColor('#1C1C1E')
       .fontSize(14)
       .font('Helvetica')
       .text(`for successfully attending and participating in the campus event`, 0, 260, { align: 'center' });

    doc.fillColor('#FF9500')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text(`"${eventName}"`, 0, 290, { align: 'center' });

    doc.fillColor('#636366')
       .fontSize(12)
       .font('Helvetica-Oblique')
       .text(`Organized by the Club Coordinator Council, CampusConnect`, 0, 330, { align: 'center' });

    // Footer - Date and Signature lines
    const footerY = height - 120;
    
    // Date
    doc.moveTo(80, footerY)
       .lineTo(240, footerY)
       .lineWidth(1)
       .stroke('#C7C7CC');
    doc.fillColor('#1C1C1E')
       .fontSize(12)
       .font('Helvetica')
       .text(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), 80, footerY + 10, { width: 160, align: 'center' });
    doc.fillColor('#8E8E93')
       .text('Date Issued', 80, footerY + 25, { width: 160, align: 'center' });

    // Signature
    doc.moveTo(width - 240, footerY)
       .lineTo(width - 80, footerY)
       .lineWidth(1)
       .stroke('#C7C7CC');
    doc.fillColor('#1C1C1E')
       .font('Helvetica-Bold')
       .text('CampusConnect Coordinator', width - 240, footerY + 10, { width: 160, align: 'center' });
    doc.fillColor('#8E8E93')
       .font('Helvetica')
       .text('Authorized Signature', width - 240, footerY + 25, { width: 160, align: 'center' });

    doc.end();
  });
}
