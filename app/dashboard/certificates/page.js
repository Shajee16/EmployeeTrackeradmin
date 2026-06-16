'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, ChevronRight, ChevronLeft, ChevronDown, Search, User, Send, Eye, Check, X, FileText, Sparkles, Crown, Briefcase, GraduationCap, BookOpen, Wrench, FolderKanban, Star, Heart, Trophy, Download } from 'lucide-react';
import { useTheme } from '../layout';
import { LOGO_BASE64 } from '@/lib/logo-base64';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ═══════════════════════════════════════════════════════════
// CERTIFICATE TYPES & CATEGORIES
// ═══════════════════════════════════════════════════════════
const CERT_TYPES = [
  { key: 'excellence', label: 'Certificate of Excellence', icon: Star, color: '#f59e0b', desc: 'Recognize outstanding performance and contributions' },
  { key: 'completion', label: 'Certificate of Completion', icon: Check, color: '#10b981', desc: 'Certify successful completion of a program or tenure' },
  { key: 'appreciation', label: 'Certificate of Appreciation', icon: Heart, color: '#ec4899', desc: 'Express gratitude for dedicated service and efforts' },
  { key: 'achievement', label: 'Certificate of Achievement', icon: Trophy, color: '#8b5cf6', desc: 'Acknowledge a specific milestone or accomplishment' },
  { key: 'relieving', label: 'Relieving Letter', icon: FileText, color: '#3b82f6', desc: 'Issue an official relieving letter for departing employees' },
];

const COMPLETION_CATEGORIES = [
  { key: 'internship', label: 'Internship Completion', icon: GraduationCap, desc: 'For interns who completed their internship program' },
  { key: 'employment', label: 'Employment Completion', icon: Briefcase, desc: 'For employees completing their tenure' },
  { key: 'course', label: 'Course Completion', icon: BookOpen, desc: 'For completing a professional development course' },
  { key: 'training', label: 'Training Completion', icon: Wrench, desc: 'For completing a specialized training program' },
  { key: 'project', label: 'Project Completion', icon: FolderKanban, desc: 'For successfully delivering a project' },
];

const TEMPLATES = [
  { key: 'classic', label: 'Classic Formal', desc: 'Gold borders, serif typography, traditional corporate elegance', color: '#c29b76' },
  { key: 'modern', label: 'Modern Minimal', desc: 'Clean lines, sans-serif, contemporary professional look', color: '#3b82f6' },
  { key: 'executive', label: 'Executive Premium', desc: 'Dark theme with gold accents and ornamental design', color: '#1e1b4b' },
];

// ═══════════════════════════════════════════════════════════
// BODY TEXT GENERATORS
// ═══════════════════════════════════════════════════════════
function aOrAn(word) {
  if (!word) return 'a';
  const first = word.replace(/<[^>]*>/g, '').trim().charAt(0).toLowerCase();
  return 'aeiou'.includes(first) ? 'an' : 'a';
}

function generateCertBody({ type, category, recipientName, recipientDesignation, respondentName, dateFrom, dateTo, remarks }) {
  const name = recipientName || '[Recipient Name]';
  const designation = recipientDesignation || '[Designation]';
  const guide = respondentName || '[Respondent Name]';
  const fromDate = dateFrom ? formatDateDisplay(dateFrom) : '[Start Date]';
  const toDate = dateTo ? formatDateDisplay(dateTo) : '[End Date]';
  const qualities = remarks || 'hardworking, diligent, and honest in performing their duties';

  if (type === 'excellence') {
    return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong> at Cluso Infolink, has demonstrated exceptional performance, dedication, and outstanding contributions to the organization. ${name} has consistently exceeded expectations, shown remarkable initiative, and inspired excellence among peers.\n\nThe management extends its sincere appreciation for the exemplary work and unwavering commitment shown by ${name}. We recognize this achievement under the mentorship of <strong>${guide}</strong>.\n\nWe wish ${name} continued success and look forward to many more accomplishments.`;
  }

  if (type === 'relieving') {
    return `This is to certify that <strong>${name}</strong> was employed at Cluso Infolink as ${aOrAn(designation)} <strong>${designation}</strong> from <strong>${fromDate}</strong> to <strong>${toDate}</strong>. ${name} has resigned from the services of the company and is officially relieved from all duties and responsibilities with effect from the close of business hours on <strong>${toDate}</strong>.\n\nDuring their tenure with us, ${name} demonstrated professionalism, integrity, and a strong work ethic. They worked under the supervision of <strong>${guide}</strong> and were found to be ${qualities}.\n\nWe thank ${name} for their contributions and wish them the very best in all future professional endeavors.`;
  }

  if (type === 'completion') {
    if (category === 'internship') {
      return `This is to certify that <strong>${name}</strong> has successfully completed their Internship at Cluso Infolink as ${aOrAn(designation)} <strong>${designation}</strong> from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.\n\nDuring their internship, they interned under the guidance of <strong>${guide}</strong> and were found to be ${qualities}.\n\nThe management would like to thank ${name} for the contributions made to the organization and wishes them all the best in their future endeavors.`;
    }
    if (category === 'employment') {
      return `This is to certify that <strong>${name}</strong> was employed at Cluso Infolink as ${aOrAn(designation)} <strong>${designation}</strong> from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.\n\nDuring their tenure with us, ${name} demonstrated professionalism, integrity, and a strong work ethic. They worked under the supervision of <strong>${guide}</strong> and were found to be ${qualities}.\n\nWe wish ${name} continued success in their career and thank them for their valuable contributions.`;
    }
    if (category === 'course') {
      return `This is to certify that <strong>${name}</strong> has successfully completed the professional development course at Cluso Infolink from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.\n\nThe course was conducted under the mentorship of <strong>${guide}</strong>. Throughout the program, ${name} demonstrated ${qualities} and successfully met all the requirements for course completion.\n\nWe congratulate ${name} on this accomplishment and wish them success in applying their newly acquired knowledge.`;
    }
    if (category === 'training') {
      return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong>, has successfully completed the specialized training program at Cluso Infolink from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.\n\nThe training was conducted under the guidance of <strong>${guide}</strong>. During the program, ${name} exhibited ${qualities} and demonstrated strong aptitude in mastering the required skills.\n\nThe management congratulates ${name} on the successful completion of this training.`;
    }
    if (category === 'project') {
      return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong>, has successfully delivered and completed the assigned project at Cluso Infolink from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.\n\nThe project was overseen by <strong>${guide}</strong>. Throughout the project lifecycle, ${name} demonstrated ${qualities} and played a pivotal role in its successful delivery.\n\nThe management extends its appreciation for the outstanding effort and dedication shown.`;
    }
    return `This is to certify that <strong>${name}</strong> has successfully completed the assigned program at Cluso Infolink from <strong>${fromDate}</strong> to <strong>${toDate}</strong> under the guidance of <strong>${guide}</strong>.\n\nDuring the program, ${name} was found to be ${qualities}.\n\nWe wish ${name} the very best in all future endeavors.`;
  }

  if (type === 'appreciation') {
    return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong> at Cluso Infolink, is being recognized for their dedicated service, exceptional commitment, and positive contributions to the organization.\n\n${name} has worked under the guidance of <strong>${guide}</strong> and has consistently demonstrated ${qualities}. Their efforts have made a meaningful impact on the team and the organization as a whole.\n\nThe management expresses heartfelt gratitude for the outstanding service and looks forward to continued collaboration.`;
  }

  if (type === 'achievement') {
    return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong> at Cluso Infolink, has achieved a significant milestone that reflects their talent, perseverance, and dedication.\n\nThis achievement was accomplished under the mentorship of <strong>${guide}</strong>. During this period, ${name} demonstrated ${qualities} and set a commendable example for peers.\n\nThe management congratulates ${name} on this accomplishment and wishes them continued success in their professional journey.`;
  }

  return '';
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

function getCertTitle(type, category) {
  const titles = {
    excellence: 'Certificate of Excellence',
    completion: 'Certificate of Completion',
    appreciation: 'Certificate of Appreciation',
    achievement: 'Certificate of Achievement',
    relieving: 'Relieving Letter',
  };
  return titles[type] || 'Certificate';
}

// ═══════════════════════════════════════════════════════════
// CERTIFICATE HTML TEMPLATES
// ═══════════════════════════════════════════════════════════
function renderCertificateHTML({ template, type, category, recipientName, recipientDesignation, recipientId, respondentName, respondentRole, respondentDepartment, dateFrom, dateTo, remarks, respondentSignature, id, qrCode, createdAt }) {
  const title = getCertTitle(type, category);
  const body = generateCertBody({ type, category, recipientName, recipientDesignation, respondentName, dateFrom, dateTo, remarks });
  const bodyHtml = body.replace(/\n/g, '<br/>');
  const fromDate = dateFrom ? formatDateDisplay(dateFrom) : '';
  const toDate = dateTo ? formatDateDisplay(dateTo) : '';
  const issuedDate = createdAt ? formatDateDisplay(createdAt) : formatDateDisplay(new Date());

  if (type === 'relieving') {
    const formattedDate = toDate || formatDateDisplay(new Date());
    const refId = recipientId ? `CI/HR/RL/${recipientId}` : `CI/HR/RL/${Math.floor(1000 + Math.random() * 9000)}`;

    if (template === 'classic') {
      return `
        <div style="font-family: 'Georgia', 'Times New Roman', serif; width: 640px; height: 900px; margin: 0 auto; padding: 48px 56px; background: #fffdf7; border: 1px solid #d4b896; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
          <!-- Ornamental corners -->
          <div style="position: absolute; top: 12px; left: 12px; width: 16px; height: 16px; border-top: 2px solid #c29b76; border-left: 2px solid #c29b76;"></div>
          <div style="position: absolute; top: 12px; right: 12px; width: 16px; height: 16px; border-top: 2px solid #c29b76; border-right: 2px solid #c29b76;"></div>
          <div style="position: absolute; bottom: 12px; left: 12px; width: 16px; height: 16px; border-bottom: 2px solid #c29b76; border-left: 2px solid #c29b76;"></div>
          <div style="position: absolute; bottom: 12px; right: 12px; width: 16px; height: 16px; border-bottom: 2px solid #c29b76; border-right: 2px solid #c29b76;"></div>

          <!-- Certificate Number -->
          <div style="position: absolute; top: 20px; right: 56px; font-size: 8px; font-weight: 500; font-family: 'Inter', sans-serif; color: #7c5e3f; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <span style="text-transform: uppercase;">${id || ''}</span>
          </div>

          <div>
            <!-- Header Letterhead -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px;">
              <img src="${LOGO_BASE64}" alt="Cluso Infolink Logo" style="height: 38px; width: auto; object-fit: contain;" />
              <div style="text-align: right; font-size: 10px; color: #7c5e3f; line-height: 1.4; font-family: 'Georgia', serif; font-style: italic;">
                <strong>Cluso Infolink</strong><br/>
                Web: www.cluso.in | Email: indiaops@cluso.in
              </div>
            </div>
            <div style="width: 100%; height: 2px; background: linear-gradient(90deg, #c29b76, transparent); margin-bottom: 24px;"></div>

            <!-- Meta info -->
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4a3c31; margin-bottom: 28px;">
              <div><strong>Ref No:</strong> ${refId}</div>
              <div><strong>Date:</strong> ${formattedDate}</div>
            </div>

            <!-- Recipient address -->
            <div style="font-size: 13px; color: #2a1f14; line-height: 1.6; margin-bottom: 28px;">
              <strong>To,</strong><br/>
              <strong>${recipientName}</strong><br/>
              ${recipientDesignation ? `${recipientDesignation}<br/>` : ''}
              ${recipientId ? `Emp ID: ${recipientId}<br/>` : ''}
            </div>

            <!-- Subject -->
            <div style="text-align: center; margin-bottom: 28px;">
              <span style="font-size: 13px; font-weight: 700; color: #2a1f14; border-bottom: 1.5px solid #2a1f14; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject: Relieving Letter & Experience Certificate
              </span>
            </div>

            <!-- Salutation -->
            <div style="font-size: 13px; color: #2a1f14; margin-bottom: 16px;">Dear ${recipientName},</div>

            <!-- Body -->
            <div style="font-size: 13px; line-height: 1.8; color: #3d2d1e; text-align: justify; margin-bottom: 32px; text-indent: 32px;">
              ${bodyHtml}
            </div>
          </div>

          <!-- Closing Sign-off & QR -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px;">
              <div style="font-size: 13px; color: #2a1f14;">
                <div style="margin-bottom: 8px;">For <strong>Cluso Infolink</strong>,</div>
                <div style="height: 44px; display: flex; align-items: flex-end; margin-bottom: 8px;">
                  ${respondentSignature ? `
                    <img src="${respondentSignature}" alt="Signature" style="max-height: 44px; width: auto; object-fit: contain;" />
                  ` : '<div style="height: 44px;"></div>'}
                </div>
                <div style="border-top: 1px solid #d4b896; display: inline-block; padding-top: 6px; min-width: 180px;">
                  <strong style="color: #2a1f14;">${respondentName}</strong><br/>
                  <span style="font-size: 11px; color: #8b7355;">${respondentRole}</span><br/>
                  <span style="font-size: 10px; color: #b0a08e;">${respondentDepartment || 'HR Administration'}</span>
                </div>
              </div>
              ${qrCode ? `
                <div style="text-align: center; font-size: 8px; color: #8b7355; font-family: 'Georgia', serif;">
                  <img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #c29b76; padding: 2px; background: #fff; margin-bottom: 4px;" />
                  Verify Authenticity
                </div>
              ` : ''}
            </div>

            <!-- Footer border -->
            <div style="text-align: center; border-top: 1px solid #e2d2be; padding-top: 10px; font-size: 9px; color: #a3907e;">
              Cluso Infolink • Private & Confidential
            </div>
          </div>
        </div>
      `;
    }

    if (template === 'modern') {
      return `
        <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 640px; height: 900px; margin: 0 auto; padding: 48px 56px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
          <!-- Modern left accent bar -->
          <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #3b82f6, #8b5cf6);"></div>

          <!-- Certificate Number -->
          <div style="position: absolute; top: 20px; right: 56px; font-size: 8px; font-weight: 500; font-family: 'Inter', sans-serif; color: #64748b; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <strong style="color: #0f172a; text-transform: uppercase;">${id || ''}</strong>
          </div>

          <div>
            <!-- Header Letterhead -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <img src="${LOGO_BASE64}" alt="Cluso Infolink Logo" style="height: 34px; width: auto; object-fit: contain;" />
              <div style="text-align: right; font-size: 10px; color: #64748b; line-height: 1.4;">
                <span style="font-weight: 700; color: #0f172a;">Cluso Infolink</span><br/>
                Web: www.cluso.in | Email: indiaops@cluso.in
              </div>
            </div>
            <div style="width: 100%; height: 1px; background: #e2e8f0; margin-bottom: 24px;"></div>

            <!-- Meta info -->
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 24px; font-family: monospace;">
              <div><strong>REF:</strong> ${refId}</div>
              <div><strong>DATE:</strong> ${formattedDate}</div>
            </div>

            <!-- Recipient address -->
            <div style="font-size: 13px; color: #1e293b; line-height: 1.5; margin-bottom: 24px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">Recipient Details</div>
              <strong>${recipientName}</strong><br/>
              ${recipientDesignation ? `<span style="color: #475569;">${recipientDesignation}</span><br/>` : ''}
              ${recipientId ? `<span style="color: #64748b; font-size: 12px;">Emp ID: ${recipientId}</span><br/>` : ''}
            </div>

            <!-- Subject -->
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 13px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject: Relieving Letter & Experience Certificate
              </span>
            </div>

            <!-- Salutation -->
            <div style="font-size: 13px; color: #0f172a; font-weight: 600; margin-bottom: 16px;">Dear ${recipientName},</div>

            <!-- Body -->
            <div style="font-size: 13px; line-height: 1.7; color: #334155; text-align: justify; margin-bottom: 28px;">
              ${bodyHtml}
            </div>
          </div>

          <!-- Closing Sign-off & QR -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px;">
              <div style="font-size: 13px; color: #1e293b;">
                <div style="margin-bottom: 8px; color: #475569;">Sincerely,</div>
                <div style="height: 44px; display: flex; align-items: flex-end; margin-bottom: 8px;">
                  ${respondentSignature ? `
                    <img src="${respondentSignature}" alt="Signature" style="max-height: 44px; width: auto; object-fit: contain;" />
                  ` : '<div style="height: 44px;"></div>'}
                </div>
                <div style="border-top: 1px solid #e2e8f0; display: inline-block; padding-top: 6px; min-width: 180px;">
                  <strong style="color: #0f172a;">${respondentName}</strong><br/>
                  <span style="font-size: 11px; color: #64748b;">${respondentRole}</span><br/>
                  <span style="font-size: 10px; color: #94a3b8;">${respondentDepartment || 'HR Department'}</span>
                </div>
              </div>
              ${qrCode ? `
                <div style="text-align: center; font-size: 8px; color: #94a3b8; font-family: sans-serif;">
                  <img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #e2e8f0; padding: 2px; background: #fff; border-radius: 4px; margin-bottom: 4px;" />
                  Verify Authenticity
                </div>
              ` : ''}
            </div>

            <!-- Footer border -->
            <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; font-size: 9px; color: #94a3b8; font-weight: 500;">
              Cluso Infolink • Confidential & Official Document
            </div>
          </div>
        </div>
      `;
    }

    if (template === 'executive') {
      return `
        <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 640px; height: 900px; margin: 0 auto; padding: 48px 56px; background: #ffffff; border: 1px solid #cbd5e1; border-top: 4px solid #1e1b4b; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
          <!-- Top gold accent bar just below navy border -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #c9a84c;"></div>

          <!-- Certificate Number -->
          <div style="position: absolute; top: 20px; right: 56px; font-size: 8px; font-weight: 500; font-family: sans-serif; color: #c9a84c; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <strong style="color: #c9a84c; text-transform: uppercase;">${id || ''}</strong>
          </div>

          <div>
            <!-- Header Letterhead -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <!-- Logo with clean padding -->
              <div style="display: inline-block; background: #ffffff; border: 1px solid rgba(201, 168, 76, 0.25); padding: 3px 10px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <img src="${LOGO_BASE64}" alt="Cluso Infolink Logo" style="height: 28px; width: auto; display: block; object-fit: contain;" />
              </div>
              <div style="text-align: right; font-size: 10px; color: #1e1b4b; line-height: 1.4;">
                <strong style="color: #c9a84c; text-transform: uppercase; letter-spacing: 0.5px;">Cluso Infolink</strong><br/>
                <span style="color: #64748b;">HQ: Bangalore, India<br/>
                Web: www.cluso.in | Email: indiaops@cluso.in</span>
              </div>
            </div>
            <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #1e1b4b, #c9a84c, transparent); margin-bottom: 24px;"></div>

            <!-- Meta info -->
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #1e1b4b; margin-bottom: 24px;">
              <div><strong>Ref No:</strong> <span style="color: #c9a84c; font-weight: 600;">${refId}</span></div>
              <div><strong>Date:</strong> <span>${formattedDate}</span></div>
            </div>

            <!-- Recipient address -->
            <div style="font-size: 13px; color: #1e1b4b; line-height: 1.5; margin-bottom: 24px; border-left: 2px solid #c9a84c; padding-left: 14px;">
              <strong>To,</strong><br/>
              <strong style="font-size: 14px;">${recipientName}</strong><br/>
              ${recipientDesignation ? `<span style="color: #475569;">${recipientDesignation}</span><br/>` : ''}
              ${recipientId ? `<span style="color: #64748b;">Employee ID: ${recipientId}</span><br/>` : ''}
            </div>

            <!-- Subject -->
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 13px; font-weight: 700; color: #1e1b4b; border-bottom: 1.5px solid #c9a84c; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject: Relieving Letter & Experience Certificate
              </span>
            </div>

            <!-- Salutation -->
            <div style="font-size: 13px; color: #1e1b4b; margin-bottom: 16px;">Dear ${recipientName},</div>

            <!-- Body -->
            <div style="font-size: 13px; line-height: 1.7; color: #334155; text-align: justify; margin-bottom: 28px;">
              ${bodyHtml}
            </div>
          </div>

          <!-- Closing Sign-off & QR -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
              <div style="font-size: 13px; color: #1e1b4b;">
                <div style="margin-bottom: 8px;">For <strong>Cluso Infolink</strong>,</div>
                <div style="height: 46px; display: flex; align-items: flex-end; margin-bottom: 8px;">
                  ${respondentSignature ? `
                    <div style="display: inline-block; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(201, 168, 76, 0.15); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <img src="${respondentSignature}" alt="Signature" style="max-height: 38px; width: auto; display: block; object-fit: contain;" />
                    </div>
                  ` : '<div style="height: 46px;"></div>'}
                </div>
                <div style="border-top: 1px solid #c9a84c; display: inline-block; padding-top: 6px; min-width: 180px;">
                  <strong style="color: #1e1b4b;">${respondentName}</strong><br/>
                  <span style="font-size: 11px; color: #c9a84c; font-weight: 500;">${respondentRole}</span><br/>
                  <span style="font-size: 10px; color: #64748b;">${respondentDepartment || 'HR Operations'}</span>
                </div>
              </div>
              ${qrCode ? `
                <div style="text-align: center; font-size: 8px; color: #c9a84c; font-family: sans-serif;">
                  <img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid rgba(201, 168, 76, 0.3); padding: 2px; background: #fff; margin-bottom: 4px;" />
                  Verify Authenticity
                </div>
              ` : ''}
            </div>

            <!-- Footer border -->
            <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">
              Cluso Infolink Private Limited • Strictly Confidential
            </div>
          </div>
        </div>
      `;
    }
  }

  if (template === 'classic') {
    return `
      <div style="font-family: 'Georgia', 'Times New Roman', serif; width: 800px; height: 600px; margin: 0 auto; padding: 24px; background: #fffdf7; border: 3px solid #c29b76; border-radius: 4px; position: relative; box-sizing: border-box;">
        <div style="border: 1px solid #d4b896; padding: 20px 24px; position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <!-- Corner ornaments -->
          <div style="position: absolute; top: -2px; left: -2px; width: 24px; height: 24px; border-top: 3px solid #c29b76; border-left: 3px solid #c29b76;"></div>
          <div style="position: absolute; top: -2px; right: -2px; width: 24px; height: 24px; border-top: 3px solid #c29b76; border-right: 3px solid #c29b76;"></div>
          <div style="position: absolute; bottom: -2px; left: -2px; width: 24px; height: 24px; border-bottom: 3px solid #c29b76; border-left: 3px solid #c29b76;"></div>
          <div style="position: absolute; bottom: -2px; right: -2px; width: 24px; height: 24px; border-bottom: 3px solid #c29b76; border-right: 3px solid #c29b76;"></div>

          <!-- Certificate Number -->
          <div style="position: absolute; top: 12px; right: 24px; font-size: 8px; font-weight: 500; font-family: 'Inter', sans-serif; color: #7c5e3f; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <span style="text-transform: uppercase;">${id || ''}</span>
          </div>

          <!-- Header Logo (Left Aligned) -->
          <div>
            <div style="text-align: left; margin-bottom: 8px; padding-left: 6px;">
              <img src="${LOGO_BASE64}" alt="Cluso Infolink Logo" style="height: 40px; width: auto; object-fit: contain; display: block;" />
            </div>
            <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #c29b76, transparent); margin: 0 0 10px; padding-left: 6px;"></div>
          </div>

          <!-- Middle Content (Title + Body + Recipient) -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 6px 0;">
            <!-- Title -->
            <div style="text-align: center; margin-bottom: 10px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #2a1f14; margin: 0 0 2px; letter-spacing: 1px;">${title}</h1>
              ${category ? `<div style="font-size: 10px; color: #8b7355; text-transform: uppercase; letter-spacing: 2px;">${COMPLETION_CATEGORIES.find(c => c.key === category)?.label || category}</div>` : ''}
            </div>
            <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, #c29b76, transparent); margin: 0 auto 12px;"></div>

            <!-- Body -->
            <div style="font-size: 13px; line-height: 1.6; color: #3d3225; text-align: justify; margin-bottom: 16px; padding: 0 6px;">
              ${bodyHtml}
            </div>

            <!-- Recipient -->
            <div style="text-align: center; margin-bottom: 6px;">
              <div style="font-size: 18px; font-weight: 700; color: #2a1f14; border-bottom: 2px solid #c29b76; display: inline-block; padding-bottom: 2px;">${recipientName || ''}</div>
              ${recipientDesignation ? `<div style="font-size: 11px; color: #8b7355; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">${recipientDesignation}</div>` : ''}
            </div>
          </div>

          <!-- Footer Signature -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 6px; margin-bottom: 4px;">
            <div style="text-align: center;">
              ${qrCode ? `<div style="margin-bottom: 6px; display: flex; justify-content: center;"><img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #c29b76; padding: 2px; background: #fff;" /></div>` : ''}
              <div style="font-size: 10px; color: #8b7355; margin-bottom: 2px;">${issuedDate}</div>
              <div style="font-size: 9px; color: #b0a08e; text-transform: uppercase; letter-spacing: 1px;">Date of Issue</div>
            </div>
            <div style="text-align: center; position: relative;">
              ${respondentSignature ? `
                <div style="height: 34px; margin-bottom: 2px;">
                  <img src="${respondentSignature}" alt="Signature" style="height: 34px; width: auto; object-fit: contain; display: inline-block;" />
                </div>
              ` : '<div style="height: 34px;"></div>'}
              <div style="width: 160px; border-top: 1px solid #c29b76; padding-top: 4px; margin: 0 auto;">
                <div style="font-size: 12px; font-weight: 600; color: #2a1f14;">${respondentName || ''}</div>
                <div style="font-size: 9px; color: #8b7355;">${respondentRole || ''}</div>
                <div style="font-size: 8px; color: #b0a08e;">${respondentDepartment || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (template === 'modern') {
    return `
      <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 800px; height: 600px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <!-- Top accent bar -->
        <div style="height: 6px; background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899); flex-shrink: 0;"></div>

        <div style="padding: 30px 40px 24px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <!-- Header Logo & Cert ID -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
            <div>
              <img src="${LOGO_BASE64}" alt="Cluso Infolink Logo" style="height: 36px; width: auto; object-fit: contain; display: block;" />
            </div>
            <div style="font-size: 8px; font-weight: 500; font-family: sans-serif; color: #64748b; text-align: right; padding-top: 4px; opacity: 0.75;">
              Cert No: <span style="color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${id || ''}</span>
            </div>
          </div>

          <!-- Middle Content (Title + Body + Recipient Card) -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 8px 0;">
            <!-- Title -->
            <div style="margin-bottom: 8px;">
              <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 2px; letter-spacing: -0.5px; line-height: 1.1;">${title}</h1>
              ${category ? `<div style="display: inline-block; font-size: 9px; font-weight: 600; color: #3b82f6; background: #eff6ff; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">${COMPLETION_CATEGORIES.find(c => c.key === category)?.label || category}</div>` : ''}
            </div>

            <!-- Divider -->
            <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 2px; margin-bottom: 10px;"></div>

            <!-- Body -->
            <div style="font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 12px; max-width: 680px;">
              ${bodyHtml}
            </div>

            <!-- Recipient Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px;">
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Presented To</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${recipientName || ''}</div>
              ${recipientDesignation ? `<div style="font-size: 11px; color: #64748b;">${recipientDesignation}</div>` : ''}
            </div>
          </div>

          <!-- Footer Signature & QR -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-shrink: 0;">
            <div style="text-align: left;">
              ${qrCode ? `<div style="margin-bottom: 6px;"><img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #e2e8f0; padding: 2px; background: #fff; border-radius: 4px;" /></div>` : ''}
              <div style="font-size: 10px; color: #64748b; margin-bottom: 2px;">${issuedDate}</div>
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">Date of Issue</div>
            </div>
            <div style="text-align: right; min-width: 160px;">
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Authorized By</div>
              ${respondentSignature ? `
                <div style="height: 34px; margin-bottom: 2px; text-align: right;">
                  <img src="${respondentSignature}" alt="Signature" style="height: 34px; width: auto; object-fit: contain; display: inline-block;" />
                </div>
              ` : '<div style="height: 34px;"></div>'}
              <div style="border-top: 1px solid #e2e8f0; padding-top: 4px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${respondentName || ''}</div>
                <div style="font-size: 10px; color: #64748b;">${respondentRole || ''}</div>
                ${respondentDepartment ? `<div style="font-size: 9px; color: #94a3b8;">${respondentDepartment}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (template === 'executive') {
    return `
      <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 800px; height: 600px; margin: 0 auto; padding: 0; background: #0f0f1a; border-radius: 4px; overflow: hidden; position: relative; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <!-- Gold top border -->
        <div style="height: 3px; background: linear-gradient(90deg, #1a1a2e, #c9a84c, #e8c86e, #c9a84c, #1a1a2e); flex-shrink: 0;"></div>

        <!-- Certificate Number -->
        <div style="position: absolute; top: 12px; right: 24px; font-size: 8px; font-weight: 500; font-family: sans-serif; color: #c9a84c; letter-spacing: 0.5px; opacity: 0.75;">
          Cert No: <strong style="color: #e8e4dd; text-transform: uppercase;">${id || ''}</strong>
        </div>

        <div style="padding: 30px 40px 24px; position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <!-- Background ornament -->
          <div style="position: absolute; top: 16px; right: 16px; width: 90px; height: 90px; border: 1px solid rgba(201, 168, 76, 0.1); border-radius: 50%; pointer-events: none; z-index: 1;"></div>

          <!-- Header Logo with Light Background -->
          <div style="text-align: left; flex-shrink: 0; z-index: 2;">
            <div style="display: inline-block; background: #ffffff; padding: 4px 14px; border-radius: 6px; border: 1px solid rgba(201, 168, 76, 0.35); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img src="${LOGO_BASE64}" alt="Cluso Infolink Logo" style="height: 32px; width: auto; display: block; object-fit: contain;" />
            </div>
          </div>
          <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #c9a84c, transparent); margin: 10px 0; z-index: 2;"></div>

          <!-- Middle Content (Title + Body + Recipient) -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 8px 0; z-index: 2;">
            <!-- Title -->
            <div style="text-align: center; margin-bottom: 4px;">
              <h1 style="font-size: 24px; font-weight: 300; color: #e8e4dd; margin: 0; letter-spacing: 2px; text-transform: uppercase;">${title}</h1>
            </div>
            ${category ? `<div style="text-align: center; margin-bottom: 4px;"><div style="display: inline-block; font-size: 9px; font-weight: 600; color: #c9a84c; border: 1px solid rgba(201,168,76,0.3); padding: 2px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 2px;">${COMPLETION_CATEGORIES.find(c => c.key === category)?.label || category}</div></div>` : ''}
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 10px;">
              <div style="flex: 1; max-width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.4));"></div>
              <div style="width: 5px; height: 5px; background: #c9a84c; transform: rotate(45deg);"></div>
              <div style="flex: 1; max-width: 60px; height: 1px; background: linear-gradient(270deg, transparent, rgba(201,168,76,0.4));"></div>
            </div>

            <!-- Body -->
            <div style="font-size: 13px; line-height: 1.6; color: #b8b3aa; text-align: center; margin-bottom: 14px; max-width: 650px; margin-left: auto; margin-right: auto;">
              ${bodyHtml}
            </div>

            <!-- Recipient -->
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: 300; color: #e8e4dd; letter-spacing: 2px; margin-bottom: 2px;">${recipientName || ''}</div>
              <div style="width: 120px; height: 1px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 4px auto;"></div>
              ${recipientDesignation ? `<div style="font-size: 10px; color: #c9a84c; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">${recipientDesignation}</div>` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(201,168,76,0.15); padding-top: 12px; flex-shrink: 0; z-index: 2;">
            <div>
              ${qrCode ? `<div style="margin-bottom: 6px;"><img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid rgba(201,168,76,0.3); padding: 2px; background: #fff; border-radius: 2px;" /></div>` : ''}
              <div style="font-size: 10px; color: #6b665f;">${issuedDate}</div>
              <div style="font-size: 8px; color: #4a463f; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Date of Issue</div>
            </div>
            <div style="text-align: right; min-width: 160px;">
              ${respondentSignature ? `
                <div style="height: 34px; margin-bottom: 2px; text-align: right;">
                  <div style="display: inline-block; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(201, 168, 76, 0.25); box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                    <img src="${respondentSignature}" alt="Signature" style="height: 26px; width: auto; display: block; object-fit: contain;" />
                  </div>
                </div>
              ` : '<div style="height: 34px;"></div>'}
              <div style="border-top: 1px solid rgba(201,168,76,0.3); padding-top: 4px;">
                <div style="font-size: 13px; font-weight: 500; color: #e8e4dd;">${respondentName || ''}</div>
                <div style="font-size: 10px; color: #c9a84c;">${respondentRole || ''}</div>
                ${respondentDepartment ? `<div style="font-size: 9px; color: #5a564f;">${respondentDepartment}</div>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Gold bottom border -->
        <div style="height: 3px; background: linear-gradient(90deg, #1a1a2e, #c9a84c, #e8c86e, #c9a84c, #1a1a2e); flex-shrink: 0;"></div>
      </div>
    `;
  }

  return '<div>Template not found</div>';
}


// ═══════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function CertificatesPage() {
  const { user } = useTheme();
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [pastCerts, setPastCerts] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(null);

  // Form state
  const [certType, setCertType] = useState('');
  const [certCategory, setCertCategory] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedRespondent, setSelectedRespondent] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(() => formatDateForInput(new Date()));
  const [designation, setDesignation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [showDesignationSuggestions, setShowDesignationSuggestions] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Auto-generate 16-digit hex verification code
  useEffect(() => {
    if (certType && !verificationCode) {
      const code = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setVerificationCode(code);
    }
  }, [certType, verificationCode]);

  // Generate QR code data URL from verification code
  useEffect(() => {
    if (verificationCode) {
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(verificationCode, {
          margin: 1,
          width: 150,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        }).then(url => {
          setQrCodeDataUrl(url);
        }).catch(err => {
          console.error('Failed to generate QR code', err);
        });
      });
    } else {
      setQrCodeDataUrl('');
    }
  }, [verificationCode]);

  // Load data
  useEffect(() => {
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || [])).catch(() => {});
    fetch('/api/admin-candidates').then(r => r.json()).then(d => setCandidates(d.candidates || [])).catch(() => {});
    fetch('/api/admin-admins').then(r => r.json()).then(d => setAdmins(d.admins || [])).catch(() => {});
    fetch('/api/admin-certificates').then(r => r.json()).then(d => setPastCerts(d.certificates || [])).catch(() => {});
  }, []);

  // Combine employees + candidates for recipient list
  const recipientList = useMemo(() => {
    const list = [];
    employees.forEach(e => {
      list.push({ 
        id: e.id, 
        name: e.name, 
        email: e.email, 
        department: e.department, 
        designation: e.designation, 
        type: 'Employee',
        createdDate: e.joinedAt || e.createdAt || ''
      });
    });
    candidates.forEach(c => {
      if (!list.find(l => l.email === c.email)) {
        list.push({ 
          id: c.onboardedEmployeeId || '', 
          name: c.name, 
          email: c.email, 
          department: '', 
          designation: '', 
          type: 'Candidate',
          createdDate: c.createdAt || c.onboardedAt || ''
        });
      }
    });
    return list;
  }, [employees, candidates]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return recipientList;
    const s = recipientSearch.toLowerCase();
    return recipientList.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.id || '').toLowerCase().includes(s)
    );
  }, [recipientList, recipientSearch]);

  // Dynamic designation suggestions from employees, past certificates, and default standards
  const designationSuggestions = useMemo(() => {
    const defaults = [
      "Marketing and Sales Intern",
      "Sales Intern",
      "Marketing Intern",
      "AI Engineer",
      "Data Scientist",
      "Software Development Engineer (SDE)",
      "Full Stack Developer",
      "Frontend Developer",
      "Backend Developer",
      "Product Manager",
      "Business Development Associate",
      "Human Resources (HR) Generalist"
    ];
    const set = new Set(defaults);
    
    // Add designations from current employee list
    employees.forEach(e => {
      if (e.designation) {
        const trimmed = e.designation.trim();
        if (trimmed) set.add(trimmed);
      }
    });

    // Add designations from past certificates
    pastCerts.forEach(c => {
      if (c.recipientDesignation) {
        const trimmed = c.recipientDesignation.trim();
        if (trimmed) set.add(trimmed);
      }
    });

    return Array.from(set);
  }, [employees, pastCerts]);

  const filteredDesignationSuggestions = useMemo(() => {
    if (!designation) return designationSuggestions;
    const s = designation.toLowerCase();
    return designationSuggestions.filter(sug => sug.toLowerCase().includes(s));
  }, [designationSuggestions, designation]);

  // Set default remarks based on type/category
  useEffect(() => {
    if (certType && !remarks) {
      setRemarks('hardworking, diligent, and honest in performing their duties');
    }
  }, [certType]);

  // Auto-fill designation and creation date from selected recipient
  useEffect(() => {
    if (selectedRecipient) {
      if (!designation) {
        setDesignation(selectedRecipient.designation || '');
      }
      if (selectedRecipient.createdDate) {
        const formatted = formatDateForInput(selectedRecipient.createdDate);
        if (formatted) {
          setDateFrom(formatted);
        }
      }
    }
  }, [selectedRecipient]);

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 5000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  };

  const resetForm = () => {
    setStep(1);
    setCertType('');
    setCertCategory('');
    setSelectedRecipient(null);
    setSelectedRespondent(null);
    setDateFrom('');
    setDateTo(formatDateForInput(new Date()));
    setDesignation('');
    setRemarks('');
    setSelectedTemplate('classic');
    setRecipientSearch('');
    setShowDesignationSuggestions(false);
    setVerificationCode('');
    setQrCodeDataUrl('');
  };

  const totalSteps = certType === 'completion' ? 7 : 6;

  // Adjust step logic: if not completion, skip category step
  const getEffectiveStep = () => {
    if (certType !== 'completion' && step >= 2) return step + 1;
    return step;
  };
  const effectiveStep = getEffectiveStep();

  const canProceed = () => {
    if (step === 1) return !!certType;
    if (step === 2 && certType === 'completion') return !!certCategory;
    if (step === 2 && certType !== 'completion') return !!selectedRecipient;
    const effStep = effectiveStep;
    if (effStep === 3) return !!selectedRecipient;
    if (effStep === 4) return !!selectedRespondent;
    if (effStep === 5) return true;
    if (effStep === 6) return !!selectedTemplate;
    return true;
  };

  const certData = {
    type: certType,
    category: certCategory,
    recipientName: selectedRecipient?.name || '',
    recipientEmail: selectedRecipient?.email || '',
    recipientId: selectedRecipient?.id || '',
    recipientDesignation: designation,
    respondentName: selectedRespondent?.name || '',
    respondentRole: selectedRespondent?.role || '',
    respondentDepartment: selectedRespondent?.department || '',
    dateFrom,
    dateTo,
    remarks,
    template: selectedTemplate,
    respondentSignature: selectedRespondent?.signature || '',
    id: verificationCode,
    qrCode: qrCodeDataUrl,
    createdAt: new Date().toISOString(),
  };

  const certificateHtml = renderCertificateHTML(certData);

  const handleSave = async (sendEmail = false) => {
    setSending(true);
    try {
      let pdfBase64 = '';
      if (sendEmail) {
        const element = document.getElementById('certificate-pdf-target');
        if (element) {
          // Wait briefly to make sure everything is rendered
          await new Promise((resolve) => setTimeout(resolve, 200));
          const bgCol = selectedTemplate === 'executive' ? '#0f0f1a' : selectedTemplate === 'classic' ? '#fffdf7' : '#ffffff';
          const canvas = await html2canvas(element, {
            scale: 2, // high-quality print resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: bgCol
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
          pdfBase64 = pdf.output('datauristring').split(',')[1];
        }
      }

      const res = await fetch('/api/admin-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...certData,
          certificateHtml,
          pdfBase64,
          sendEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Failed to create certificate', true);
      } else {
        if (sendEmail) {
          if (data.emailSent) {
            showMsg(`Certificate created and sent to ${selectedRecipient?.email}`);
          } else {
            showMsg(`Certificate saved but email failed: ${data.emailError || 'Unknown error'}`, true);
          }
        } else {
          showMsg('Certificate saved successfully');
        }
        // Refresh history
        fetch('/api/admin-certificates').then(r => r.json()).then(d => setPastCerts(d.certificates || [])).catch(() => {});
      }
    } catch (err) {
      showMsg('An error occurred', true);
    }
    setSending(false);
  };

  const handleDownloadPastCert = async (cert) => {
    // Look up signature in loaded admins list if not stored in the cert
    const signature = cert.respondentSignature || admins.find(a => a.name === cert.respondentName)?.signature || '';
    
    // Generate QR code for this past certificate's id (16-digit hex)
    let qrCode = '';
    try {
      const QRCode = await import('qrcode');
      qrCode = await QRCode.toDataURL(cert.id, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (e) {
      console.error('Failed to generate QR code for download', e);
    }

    const certDataForRender = {
      ...cert,
      respondentSignature: signature,
      qrCode: qrCode
    };
    
    setDownloadingCert(certDataForRender);
    
    // Wait briefly for React to render the element in the DOM
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const element = document.getElementById('certificate-download-target');
      if (element) {
        const bgCol = cert.template === 'executive' ? '#0f0f1a' : cert.template === 'classic' ? '#fffdf7' : '#ffffff';
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: bgCol
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        const filename = `${cert.recipientName.replace(/\s+/g, '_')}_${cert.type === 'relieving' ? 'Relieving_Letter' : 'Certificate'}.pdf`;
        pdf.save(filename);
        showMsg('PDF downloaded successfully');
      } else {
        showMsg('Failed to find download container', true);
      }
    } catch (err) {
      console.error(err);
      showMsg('Failed to download PDF', true);
    } finally {
      setDownloadingCert(null);
    }
  };

  // Step labels
  const stepLabels = certType === 'completion'
    ? ['Type', 'Category', 'Recipient', 'Respondent', 'Details', 'Template', 'Preview']
    : ['Type', 'Recipient', 'Respondent', 'Details', 'Template', 'Preview'];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Award size={28} style={{ color: 'var(--primary)' }} /> Certificate Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>Create and share professional certificates for employees and candidates</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setShowHistory(!showHistory)}>
            <FileText size={16} /> {showHistory ? 'Create New' : `History (${pastCerts.length})`}
          </button>
          {step > 1 && !showHistory && (
            <button className="btn btn-ghost" onClick={resetForm}>
              <X size={16} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {error && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '14px 18px', borderRadius: 10, marginBottom: 16, fontSize: '0.9rem', fontWeight: 500, border: '1px solid rgba(239,68,68,0.15)' }}>{error}</motion.div>}
        {success && <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '14px 18px', borderRadius: 10, marginBottom: 16, fontSize: '0.9rem', fontWeight: 500, border: '1px solid rgba(16,185,129,0.15)' }}>{success}</motion.div>}
      </AnimatePresence>

      {/* ═══════ HISTORY VIEW ═══════ */}
      {showHistory ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-glass)' }}>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Certificate History</h3>
          </div>
          {pastCerts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Award size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No certificates created yet.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Recipient</th>
                    <th>Type</th>
                    <th>Template</th>
                    <th>Created</th>
                    <th>Shared</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastCerts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.recipientName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.recipientEmail}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{c.type}</span>
                        {c.category && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>{c.category}</span>}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{c.template}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        {c.shared ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={11} /> Sent</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}>Not sent</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={() => handleDownloadPastCert(c)}
                          disabled={downloadingCert !== null}
                        >
                          {downloadingCert?.id === c.id ? (
                            <>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', animation: 'spin 0.6s linear infinite' }} />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Download size={13} /> Download PDF
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ═══════ PROGRESS STEPS ═══════ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, padding: '0 4px' }}>
            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 'none' }}>
                  <div
                    onClick={() => { if (isCompleted) setStep(stepNum); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: isCompleted ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.78rem', fontWeight: 700, flexShrink: 0, transition: 'all 0.3s',
                      background: isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--surface)',
                      color: isActive || isCompleted ? '#fff' : 'var(--text-muted)',
                      border: isActive ? 'none' : '1px solid var(--surface-border)',
                      boxShadow: isActive ? '0 0 12px var(--primary-glow)' : 'none',
                    }}>
                      {isCompleted ? <Check size={14} /> : stepNum}
                    </div>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--text)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div style={{
                      flex: 1, height: 2, margin: '0 12px',
                      background: isCompleted ? 'var(--success)' : 'var(--surface-border)',
                      borderRadius: 1, transition: 'background 0.3s',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ═══════ STEP CONTENT ═══════ */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >

              {/* ── STEP 1: Certificate Type ── */}
              {effectiveStep === 1 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Select Certificate Type</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.88rem' }}>Choose the type of certificate you would like to create</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {CERT_TYPES.map(ct => (
                      <motion.div
                        key={ct.key}
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setCertType(ct.key); if (ct.key !== 'completion') setCertCategory(''); }}
                        className="card"
                        style={{
                          cursor: 'pointer', padding: '24px 22px', position: 'relative', overflow: 'hidden',
                          border: certType === ct.key ? `2px solid ${ct.color}` : '1px solid var(--surface-border)',
                          background: certType === ct.key ? `${ct.color}08` : 'var(--surface)',
                          transition: 'all 0.25s',
                        }}
                      >
                        {certType === ct.key && (
                          <div style={{ position: 'absolute', top: 12, right: 12 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: ct.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={13} color="#fff" />
                            </div>
                          </div>
                        )}
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                          background: `${ct.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ct.icon size={22} color={ct.color} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{ct.label}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{ct.desc}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Category (only for completion) ── */}
              {effectiveStep === 2 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Select Completion Category</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.88rem' }}>What type of completion is this certificate for?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    {COMPLETION_CATEGORIES.map(cat => (
                      <motion.div
                        key={cat.key}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCertCategory(cat.key)}
                        className="card"
                        style={{
                          cursor: 'pointer', padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
                          border: certCategory === cat.key ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                          background: certCategory === cat.key ? 'var(--sidebar-active)' : 'var(--surface)',
                          transition: 'all 0.25s',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: certCategory === cat.key ? 'var(--primary)' : 'var(--surface-glass)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: certCategory === cat.key ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.25s',
                        }}>
                          <cat.icon size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cat.label}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{cat.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Select Recipient ── */}
              {effectiveStep === 3 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Select Recipient</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.88rem' }}>Choose the employee or candidate to receive this certificate</p>

                  {/* Search */}
                  <div className="card" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', marginBottom: 20 }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                      placeholder="Search by name, email, or ID..."
                      value={recipientSearch}
                      onChange={e => setRecipientSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', flex: 1 }}
                    />
                  </div>

                  {/* Selected badge */}
                  {selectedRecipient && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 10, marginBottom: 16,
                    }}>
                      <Check size={18} color="#10b981" />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>Selected: </span>
                        <span style={{ fontWeight: 600 }}>{selectedRecipient.name}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({selectedRecipient.email})</span>
                      </div>
                      <button onClick={() => setSelectedRecipient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                    </div>
                  )}

                  {/* List */}
                  <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredRecipients.map(r => (
                      <div
                        key={r.email}
                        onClick={() => setSelectedRecipient(r)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                          background: selectedRecipient?.email === r.email ? 'var(--sidebar-active)' : 'var(--surface)',
                          border: selectedRecipient?.email === r.email ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                        }}>
                          {r.name?.charAt(0) || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{r.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {r.id && <span style={{ fontWeight: 600 }}>{r.id} • </span>}
                            {r.email}
                            {r.department && ` • ${r.department}`}
                          </div>
                        </div>
                        <span className="badge" style={{
                          background: r.type === 'Employee' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                          color: r.type === 'Employee' ? '#3b82f6' : '#8b5cf6',
                          fontSize: '0.7rem',
                        }}>{r.type}</span>
                      </div>
                    ))}
                    {filteredRecipients.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No results found.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Select Respondent ── */}
              {effectiveStep === 4 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Select Respondent / Signing Authority</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.88rem' }}>This person will appear as the authorizer and mentor on the certificate</p>

                  {selectedRespondent && (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: 10, marginBottom: 16,
                      }}>
                        <Check size={18} color="#10b981" />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>Selected: </span>
                          <span style={{ fontWeight: 600 }}>{selectedRespondent.name}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({selectedRespondent.role})</span>
                        </div>
                        <button onClick={() => setSelectedRespondent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                      </div>

                      <div className="card" style={{ padding: '20px', marginBottom: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Signature Settings for {selectedRespondent.name}</h4>
                          {selectedRespondent.signature && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Saved Signature Active</span>
                          )}
                        </div>

                        {selectedRespondent.signature ? (
                          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--surface-border)', display: 'inline-block' }}>
                            <img src={selectedRespondent.signature} alt="Current Signature" style={{ maxHeight: '60px', width: 'auto', display: 'block', objectFit: 'contain' }} />
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>No signature uploaded yet. Upload an image to append a signature to the certificates.</p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                            <Send size={14} style={{ transform: 'rotate(-45deg)' }} /> 
                            {selectedRespondent.signature ? 'Change Signature' : 'Upload Signature'}
                            <input 
                              type="file" 
                              accept="image/png,image/jpeg,image/jpg,image/webp" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                // Reset file input so the same file can be re-selected
                                e.target.value = '';
                                
                                // Validate file size (max 5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  showMsg('Signature image is too large. Please use a smaller image (max 5MB).', true);
                                  return;
                                }
                                
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const base64 = event.target?.result;
                                  if (base64) {
                                    try {
                                      const res = await fetch('/api/admin-admins/signature', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: selectedRespondent.id, signature: base64 })
                                      });
                                      const data = await res.json();
                                      if (res.ok) {
                                        showMsg('Signature uploaded and saved successfully.');
                                        setSelectedRespondent(prev => ({ ...prev, signature: base64 }));
                                        setAdmins(prev => prev.map(a => a.id === selectedRespondent.id ? { ...a, signature: base64 } : a));
                                      } else {
                                        showMsg(data.error || 'Failed to save signature.', true);
                                      }
                                    } catch (err) {
                                      showMsg('Error uploading signature. Please try again.', true);
                                    }
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              style={{ display: 'none' }} 
                            />
                          </label>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>PNG or JPG with light background recommended</p>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {admins.map(a => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedRespondent(a)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                          background: selectedRespondent?.id === a.id ? 'var(--sidebar-active)' : 'var(--surface)',
                          border: selectedRespondent?.id === a.id ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                          background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                        }}>
                          {a.name?.charAt(0) || 'A'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.name}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {a.role} • {a.department || 'Administration'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.email}</div>
                        </div>
                        {selectedRespondent?.id === a.id && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} color="#fff" />
                          </div>
                        )}
                      </div>
                    ))}
                    {admins.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No admins found. Ensure admins are configured in Admin Management.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 5: Certificate Details ── */}
              {effectiveStep === 5 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Certificate Details</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.88rem' }}>Fill in the specific details for this certificate</p>

                  <div className="card" style={{ padding: 28 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                      <div style={{ position: 'relative' }}>
                        <label className="form-label">Recipient Designation / Role</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            value={designation}
                            onChange={e => setDesignation(e.target.value)}
                            onFocus={() => setShowDesignationSuggestions(true)}
                            onBlur={() => {
                              setTimeout(() => setShowDesignationSuggestions(false), 200);
                            }}
                            placeholder="e.g., Software Intern, Sales Executive"
                            style={{ width: '100%', paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowDesignationSuggestions(!showDesignationSuggestions);
                            }}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px'
                            }}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {showDesignationSuggestions && filteredDesignationSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--surface-border)',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                zIndex: 50,
                                marginTop: '6px',
                                maxHeight: '220px',
                                overflowY: 'auto',
                                padding: '6px',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)',
                              }}
                            >
                              {filteredDesignationSuggestions.map(sug => (
                                <div
                                  key={sug}
                                  onMouseDown={() => {
                                    setDesignation(sug);
                                    setShowDesignationSuggestions(false);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.88rem',
                                    fontWeight: 500,
                                    transition: 'background 0.2s',
                                    color: designation === sug ? 'var(--primary)' : 'var(--text)',
                                    background: designation === sug ? 'var(--sidebar-active)' : 'transparent',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (designation !== sug) e.target.style.background = 'var(--bg)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (designation !== sug) e.target.style.background = 'transparent';
                                  }}
                                >
                                  {sug}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="form-label">From Date</label>
                          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">To Date</label>
                          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Qualities / Remarks</label>
                      <textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        rows={3}
                        placeholder="e.g., hardworking, diligent, and honest in performing their duties"
                        style={{ resize: 'vertical' }}
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>These qualities will appear in the certificate body text.</p>
                    </div>

                    {/* Summary */}
                    <div style={{ marginTop: 24, padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Summary</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.88rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <strong>{CERT_TYPES.find(t => t.key === certType)?.label}</strong></div>
                        {certCategory && <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <strong>{COMPLETION_CATEGORIES.find(c => c.key === certCategory)?.label}</strong></div>}
                        <div><span style={{ color: 'var(--text-muted)' }}>Recipient:</span> <strong>{selectedRecipient?.name}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Respondent:</span> <strong>{selectedRespondent?.name}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 6: Choose Template ── */}
              {effectiveStep === 6 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Choose Template</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.88rem' }}>Select a professional template for your certificate</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    {TEMPLATES.map(tpl => (
                      <motion.div
                        key={tpl.key}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTemplate(tpl.key)}
                        className="card"
                        style={{
                          cursor: 'pointer', padding: 0, overflow: 'hidden',
                          border: selectedTemplate === tpl.key ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                          transition: 'all 0.25s',
                        }}
                      >
                        {/* Mini preview strip */}
                        <div style={{
                          height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: tpl.key === 'classic' ? 'linear-gradient(135deg, #fffdf7, #f5edd8)' :
                                     tpl.key === 'modern' ? 'linear-gradient(135deg, #f8fafc, #e2e8f0)' :
                                     'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
                          borderBottom: tpl.key === 'classic' ? '3px solid #c29b76' :
                                       tpl.key === 'modern' ? '3px solid #3b82f6' : '3px solid #c9a84c',
                          position: 'relative',
                        }}>
                          <div style={{
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
                            color: tpl.key === 'executive' ? '#c9a84c' : tpl.key === 'modern' ? '#3b82f6' : '#c29b76',
                          }}>Certificate</div>
                          {selectedTemplate === tpl.key && (
                            <div style={{
                              position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%',
                              background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Check size={13} color="#fff" />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{tpl.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tpl.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Live Preview */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Live Preview</div>
                    <div style={{
                      background: selectedTemplate === 'executive' ? '#1a1a2e' : '#f1f0ec',
                      padding: 32, borderRadius: 12, border: '1px solid var(--surface-border)',
                      overflow: 'auto', maxHeight: 600,
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: certificateHtml }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 7: Preview & Share ── */}
              {effectiveStep === 7 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Preview & Share</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.88rem' }}>Review the final certificate and share it with the recipient</p>

                  <div style={{
                    background: selectedTemplate === 'executive' ? '#1a1a2e' : '#f1f0ec',
                    padding: 36, borderRadius: 14, border: '1px solid var(--surface-border)',
                    marginBottom: 28, overflow: 'auto',
                  }}>
                    <div id="certificate-pdf-target" style={{ width: certType === 'relieving' ? '640px' : '800px', margin: '0 auto' }}>
                      <div dangerouslySetInnerHTML={{ __html: certificateHtml }} />
                    </div>
                  </div>

                  {/* Info Summary */}
                  <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Certificate Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type</div>
                        <div style={{ fontWeight: 600 }}>{CERT_TYPES.find(t => t.key === certType)?.label}</div>
                      </div>
                      {certCategory && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</div>
                          <div style={{ fontWeight: 600 }}>{COMPLETION_CATEGORIES.find(c => c.key === certCategory)?.label}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recipient</div>
                        <div style={{ fontWeight: 600 }}>{selectedRecipient?.name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</div>
                        <div style={{ fontWeight: 600 }}>{selectedRecipient?.email}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Respondent</div>
                        <div style={{ fontWeight: 600 }}>{selectedRespondent?.name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Template</div>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedTemplate}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={() => handleSave(false)} disabled={sending} style={{ padding: '12px 24px' }}>
                      <FileText size={17} /> Save Only
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSave(true)}
                      disabled={sending}
                      style={{ padding: '12px 28px', fontSize: '0.92rem' }}
                    >
                      {sending ? (
                        <>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={17} /> Share via Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* ═══════ NAVIGATION BUTTONS ═══════ */}
          {effectiveStep < 7 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                style={{ opacity: step === 1 ? 0.4 : 1, gap: 8 }}
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                style={{ opacity: canProceed() ? 1 : 0.5, gap: 8 }}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Hidden container for PDF download from history */}
      {downloadingCert && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: downloadingCert.type === 'relieving' ? '640px' : '800px', overflow: 'hidden' }}>
          <div id="certificate-download-target">
            <div dangerouslySetInnerHTML={{ __html: renderCertificateHTML(downloadingCert) }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
