require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Groq = require('groq-sdk');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const crypto = require('crypto');
const { sendEmail } = require('./email/config');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

mongoose.connect('mongodb://localhost:27017/resumatch')
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => { console.error('❌ MongoDB Error:', err); process.exit(1); });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf','.docx','.doc'].includes(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('PDF and DOCX only'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const bulkUpload = multer({ storage, fileFilter: upload.fileFilter, limits: upload.limits });

// SCHEMAS
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
  resetToken: String,
  resetTokenExpiry: Date
});

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  company: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  resetToken: String,
  resetTokenExpiry: Date
});

const UserResumeSchema = new mongoose.Schema({
  userId: String, jobId: String, jobTitle: String, department: String,
  fileName: String, filePath: String, uploadDate: { type: Date, default: Date.now },
  name: String, email: String, phone: String,
  matchedSkills: [String], missingSkills: [String], skills: [String],
  experience: Number, education: [String], score: Number,
  breakdown: { skillsScore: Number, experienceScore: Number, educationScore: Number },
  suggestions: [{ category: String, priority: String, message: String, impact: String, actionItems: [String], example: String }],
  status: String, viewedByAdmin: { type: Boolean, default: false }
});

const AdminResumeSchema = new mongoose.Schema({
  adminId: String, batchId: String, jobId: String, jobTitle: String, department: String,
  fileName: String, filePath: String, uploadDate: { type: Date, default: Date.now },
  name: String, email: String, phone: String,
  matchedSkills: [String], missingSkills: [String], skills: [String],
  experience: Number, education: [String], score: Number,
  breakdown: { skillsScore: Number, experienceScore: Number, educationScore: Number },
  suggestions: [{ category: String, priority: String, message: String, impact: String, actionItems: [String], example: String }],
  status: String, notes: String
});

const JobSchema = new mongoose.Schema({
  title: String, department: String, description: String,
  skills: [String], experience: Number, education: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }, createdBy: String
});

const DepartmentSchema = new mongoose.Schema({
  id: { type: String, unique: true }, name: String, icon: String
});

const User = mongoose.model('User', UserSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const UserResume = mongoose.model('UserResume', UserResumeSchema);
const AdminResume = mongoose.model('AdminResume', AdminResumeSchema);
const Job = mongoose.model('Job', JobSchema);
const Department = mongoose.model('Department', DepartmentSchema);

async function initializeEssentialData() {
  try {
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      await Department.insertMany([
        { id:'it', name:'Information Technology', icon:'💻' },
        { id:'finance', name:'Finance & Accounting', icon:'💰' },
        { id:'hr', name:'Human Resources', icon:'👥' },
        { id:'marketing', name:'Marketing & Sales', icon:'📢' },
        { id:'operations', name:'Operations', icon:'⚙️' },
        { id:'healthcare', name:'Healthcare', icon:'🏥' },
        { id:'others', name:'Others', icon:'📋' }
      ]);
      console.log('✅ Departments initialized');
    }
    console.log('✅ Separate collections: userresumes & adminresumes');
  } catch (err) { console.error('❌ Init error:', err); }
}

mongoose.connection.once('open', () => { initializeEssentialData(); });

async function extractText(filePath, ext) {
  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text || '';
    } 
    else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
    return '';
  } catch (err) { console.error('Extract error:', err.message); return ''; }
}

function parseResume(text, job) {
  const lower = text.toLowerCase();
  const email = (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [])[0] || '';
  const phone = (text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/) || [])[0] || '';
  const name = text.split('\n').find(l => l.trim().length > 2)?.trim() || 'Unknown';
  const matchedSkills = [], missingSkills = [];
  job.skills.forEach(s => lower.includes(s.toLowerCase()) ? matchedSkills.push(s) : missingSkills.push(s));
  const expMatch = text.match(/(\d+)\+?\s*(years?|yrs?)\s*(of\s*)?experience/i);
  const experience = expMatch ? parseInt(expMatch[1]) : 0;
  const education = job.education.filter(d => lower.includes(d.toLowerCase()));
  return { name, email, phone, matchedSkills, missingSkills, skills: matchedSkills, experience, education };
}

function calculateScore(parsed, job) {
  const skillsScore = job.skills.length > 0 ? Math.round((parsed.matchedSkills.length / job.skills.length) * 40) : 0;
  const experienceScore = parsed.experience >= job.experience ? 30 : Math.round((parsed.experience / Math.max(job.experience, 1)) * 30);
  const educationScore = parsed.education.length > 0 ? 30 : 0;
  return { score: skillsScore + experienceScore + educationScore, breakdown: { skillsScore, experienceScore, educationScore } };
}

function generateSuggestions(parsed, job, score) {
  const list = [];
  if (parsed.missingSkills.length > 0) {
    list.push({ category:'Skills Enhancement', priority:'High', message:`Add: ${parsed.missingSkills.slice(0,3).join(', ')}`, impact:`+${Math.round((parsed.missingSkills.length/job.skills.length)*40)} pts`, actionItems:[`Add "${parsed.missingSkills[0]}"`, 'Mention in projects'], example:`Skills: JS, React, ${parsed.missingSkills[0]}` });
  }
  if (parsed.experience < job.experience) {
    list.push({ category:'Experience', priority:'High', message:`Need ${job.experience - parsed.experience} more year(s)`, impact:`+${30 - Math.round((parsed.experience/Math.max(job.experience,1))*30)} pts`, actionItems:['Count internships', 'Add projects'], example:`Developer | 2022-Present (2 yrs)` });
  }
  if (parsed.education.length === 0) {
    list.push({ category:'Education', priority:'High', message:`Add education`, impact:'+30 pts', actionItems:['Add degree', 'Include university'], example:`BTech CS | 2019-2023` });
  }
  return list;
}

// ==================== GROQ AI ANALYSIS ====================
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeResumeWithGroq(text, job) {
  const prompt = `You are a resume analysis expert. Analyze the resume below against the job requirements and return ONLY a valid JSON object — no extra text.

JOB REQUIREMENTS:
- Title: ${job.title}
- Required Skills: ${job.skills.join(', ')}
- Minimum Experience: ${job.experience} years
- Required Education: ${job.education.join(', ')}

RESUME TEXT:
${text.slice(0, 3000)}

Return this exact JSON structure:
{
  "name": "candidate full name",
  "email": "email from resume or empty string",
  "phone": "phone from resume or empty string",
  "matchedSkills": ["skills from job requirements found in resume"],
  "missingSkills": ["skills from job requirements NOT found in resume"],
  "experience": <number of years experience as integer>,
  "education": ["education keywords from job requirements found in resume"],
  "score": <total score 0-100>,
  "breakdown": {
    "skillsScore": <0-40 based on matched skills ratio>,
    "experienceScore": <0-30 based on experience vs required>,
    "educationScore": <0 or 30 based on education match>
  },
  "suggestions": [
    {
      "category": "category name",
      "priority": "High or Medium or Low",
      "message": "specific improvement suggestion",
      "impact": "+X pts",
      "actionItems": ["action 1", "action 2"],
      "example": "example text"
    }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);

    // Ensure all required fields exist with correct types
    return {
      name: result.name || 'Unknown',
      email: result.email || '',
      phone: result.phone || '',
      matchedSkills: Array.isArray(result.matchedSkills) ? result.matchedSkills : [],
      missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills : [],
      experience: parseInt(result.experience) || 0,
      education: Array.isArray(result.education) ? result.education : [],
      skills: Array.isArray(result.matchedSkills) ? result.matchedSkills : [],
      score: Math.min(100, Math.max(0, parseInt(result.score) || 0)),
      breakdown: {
        skillsScore: parseInt(result.breakdown?.skillsScore) || 0,
        experienceScore: parseInt(result.breakdown?.experienceScore) || 0,
        educationScore: parseInt(result.breakdown?.educationScore) || 0,
      },
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    };
  } catch (err) {
    console.error('Groq analysis failed, falling back to basic analysis:', err.message);
    // Fallback to original logic if Groq fails
    const parsed = parseResume(text, job);
    const { score, breakdown } = calculateScore(parsed, job);
    const suggestions = generateSuggestions(parsed, job, score);
    return { ...parsed, score, breakdown, suggestions };
  }
}
// ===========================================================

function drawPDFHeader(doc, title, subtitle, bg = '#1a1a2e', accent = '#e94560') {
  doc.rect(0,0,595,75).fill(bg);
  doc.fontSize(22).fillColor(accent).text(title, 50, 15, {align:'center'});
  doc.fontSize(12).fillColor('#fff').text(subtitle, 50, 45, {align:'center'});
}

function generateUserPDF(resume, res) {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=analysis-${Date.now()}.pdf`
    );

    doc.pipe(res);

    /* ================= HEADER ================= */
    doc
      .rect(0, 0, 595, 80)
      .fill('#1a1a2e');

    doc
      .fillColor('#e94560')
      .fontSize(22)
      .text('ResuMatch Pro', 0, 20, { align: 'center' });

    doc
      .fillColor('#ffffff')
      .fontSize(12)
      .text('Resume Analysis Report', 0, 50, { align: 'center' });

    doc.moveDown(4);

    /* ================= CANDIDATE INFO ================= */
    sectionTitle(doc, 'Candidate Information');

    infoRow(doc, 'Name', resume.name);
    infoRow(doc, 'Email', resume.email || 'N/A');
    infoRow(doc, 'Phone', resume.phone || 'N/A');
    infoRow(doc, 'Applied Role', resume.jobTitle);
    infoRow(doc, 'Department', resume.department);
    infoRow(
      doc,
      'Upload Date',
      new Date(resume.uploadDate).toLocaleDateString()
    );

    doc.moveDown();

    /* ================= OVERALL SCORE ================= */
    sectionTitle(doc, 'Overall Score');

    doc
      .fontSize(36)
      .fillColor(
        resume.score >= 70
          ? '#10b981'
          : resume.score >= 50
          ? '#f59e0b'
          : '#ef4444'
      )
      .text(`${resume.score}/100`, { align: 'center' });

    doc
      .fontSize(14)
      .fillColor('#111827')
      .text(`Status: ${resume.status}`, { align: 'center' });

    doc.moveDown(2);

    /* ================= SCORE BREAKDOWN ================= */
    sectionTitle(doc, 'Score Breakdown');

    scoreRow(doc, 'Skills', resume.breakdown?.skillsScore || 0, 40);
    scoreRow(doc, 'Experience', resume.breakdown?.experienceScore || 0, 30);
    scoreRow(doc, 'Education', resume.breakdown?.educationScore || 0, 30);

    doc.moveDown();

    /* ================= SKILLS ================= */
    if (resume.matchedSkills?.length) {
      sectionTitle(doc, 'Skills Matched');
      resume.matchedSkills.forEach(skill => {
        doc.fontSize(11).fillColor('#065f46').text(`✔ ${skill}`);
      });
      doc.moveDown();
    }

    if (resume.missingSkills?.length) {
      sectionTitle(doc, 'Skills Missing');
      resume.missingSkills.forEach(skill => {
        doc.fontSize(11).fillColor('#991b1b').text(`✖ ${skill}`);
      });
      doc.moveDown();
    }

    /* ================= SUGGESTIONS ================= */
    if (resume.suggestions?.length) {
      sectionTitle(doc, 'Improvement Suggestions');

      resume.suggestions.forEach((s, i) => {
        doc
          .fontSize(13)
          .fillColor('#1f2937')
          .text(`${i + 1}. ${s.category} (${s.priority})`);

        doc
          .fontSize(11)
          .fillColor('#374151')
          .text(s.message);

        if (s.impact) {
          doc
            .fontSize(10)
            .fillColor('#2563eb')
            .text(`Impact: ${s.impact}`);
        }

        if (s.actionItems?.length) {
          s.actionItems.forEach(a => {
            doc.fontSize(10).fillColor('#374151').text(`• ${a}`);
          });
        }

        doc.moveDown();
      });
    }

    /* ================= ACTION PLAN ================= */
    sectionTitle(doc, 'Recommended Action Plan');

    const plan = [
      'Review suggestions carefully',
      'Add missing skills',
      'Include quantified achievements',
      'Update experience section',
      'Re-upload improved resume',
      'Aim for score above 70'
    ];

    plan.forEach((p, i) => {
      doc.fontSize(11).fillColor('#111827').text(`${i + 1}. ${p}`);
    });

    doc.end();
  } catch (err) {
    console.error('PDF Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
}

function sectionTitle(doc, title) {
  doc
    .moveDown()
    .fontSize(15)
    .fillColor('#1a1a2e')
    .text(title);
  doc
    .moveDown(0.3)
    .rect(doc.x, doc.y, 500, 1)
    .fill('#e5e7eb');
  doc.moveDown();
}

function infoRow(doc, label, value) {
  doc
    .fontSize(11)
    .fillColor('#374151')
    .text(`${label}: `, { continued: true })
    .fillColor('#111827')
    .text(value);
}

function scoreRow(doc, label, value, total) {
  doc
    .fontSize(11)
    .fillColor('#111827')
    .text(`${label}: ${value}/${total}`);
}

function generateAdminPDF(resumes, res) {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=candidates-report.pdf');
    doc.pipe(res);
    
    // Header
    doc.rect(0, 0, 595, 75).fill('#1a1a2e');
    doc.fontSize(22).fillColor('#e94560').text('ResuMatch Pro', 50, 15, { align: 'center' });
    doc.fontSize(12).fillColor('#fff').text('Candidates Report', 50, 45, { align: 'center' });
    
    // Stats
    const shortlisted = resumes.filter(r => r.status === 'Shortlisted').length;
    const review = resumes.filter(r => r.status === 'Review').length;
    const rejected = resumes.filter(r => r.status === 'Rejected').length;
    const avgScore = resumes.length ? Math.round(resumes.reduce((s, r) => s + (r.score || 0), 0) / resumes.length) : 0;
    
    let y = 95;
    doc.fontSize(11).fillColor('#1a1a2e').text(`Total Candidates: ${resumes.length}`, 50, y);
    y += 20;
    doc.fontSize(10).fillColor('#10b981').text(`✓ Shortlisted: ${shortlisted}`, 50, y);
    y += 18;
    doc.fillColor('#f59e0b').text(`⚠ Review: ${review}`, 50, y);
    y += 18;
    doc.fillColor('#ef4444').text(`✗ Rejected: ${rejected}`, 50, y);
    y += 18;
    doc.fillColor('#1a1a2e').text(`Average Score: ${avgScore}/100`, 50, y);
    y += 30;
    
    // Table header
    doc.rect(50, y, 495, 20).fill('#f0f0f0');
    y += 5;
    doc.fontSize(9).fillColor('#555');
    doc.text('#', 55, y);
    doc.text('Name', 80, y);
    doc.text('Position', 200, y);
    doc.text('Score', 350, y);
    doc.text('Status', 420, y);
    y += 20;
    
    // Candidates
    resumes.slice(0, 30).forEach((r, i) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      const statusColor = r.status === 'Shortlisted' ? '#10b981' : 
                         r.status === 'Review' ? '#f59e0b' : '#ef4444';
      
      if (i % 2 === 0) doc.rect(50, y - 2, 495, 18).fill('#fafafa');
      
      doc.fontSize(8).fillColor('#222');
      doc.text(String(i + 1), 55, y);
      doc.text((r.name || 'Unknown').substring(0, 20), 80, y);
      doc.text((r.jobTitle || 'N/A').substring(0, 18), 200, y);
      doc.text(`${r.score || 0}/100`, 350, y);
      doc.fillColor(statusColor).text(r.status || 'N/A', 420, y);
      
      y += 18;
    });
    
    // Footer
    if (resumes.length > 30) {
      doc.addPage();
      doc.fontSize(10).fillColor('#666').text(`Showing first 30 of ${resumes.length} candidates`, 50, 50);
    }
    
    doc.fontSize(8).fillColor('#aaa').text(`Generated: ${new Date().toLocaleString()}`, 50, 750, { align: 'center' });
    
    doc.end();
    
  } catch (err) {
    console.error('PDF Generation Error:', err);
    console.error('Stack:', err.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
    }
  }
}

// AUTH
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role, company } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
    if (role === 'admin' && !company) return res.status(400).json({ error: 'Company required' });
    const userExists = await User.findOne({ email });
    const adminExists = await Admin.findOne({ email });
    if (userExists || adminExists) return res.status(400).json({ error: 'Email exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    if (role === 'admin') {
      const newAdmin = await Admin.create({ name, email, password: hashedPassword, company });
      sendEmail('welcome', name, email);
      return res.json({ success: true, user: { id: newAdmin._id, email: newAdmin.email, name: newAdmin.name, role: 'admin', company: newAdmin.company } });
    } else {
      const newUser = await User.create({ name, email, password: hashedPassword });
      sendEmail('welcome', name, email);
      return res.json({ success: true, user: { id: newUser._id, email: newUser.email, name: newUser.name, role: 'user', company: '' } });
    }
  } catch (err) { console.error('Signup error:', err); res.status(500).json({ error: 'Signup failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    let user = role === 'admin' ? await Admin.findOne({ email }) : await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role, company: user.company || '' } });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Login failed' }); }
});

// PROFILE ROUTES
app.put('/api/profile/user/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email }, { new: true });
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: 'user' } });
  } catch (err) {
    console.error('Profile Update Error (User):', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

app.put('/api/profile/admin/:id', async (req, res) => {
  try {
    const { name, email, company } = req.body;
    const admin = await Admin.findByIdAndUpdate(req.params.id, { name, email, company }, { new: true });
    res.json({ success: true, user: { id: admin._id, email: admin.email, name: admin.name, role: 'admin', company: admin.company } });
  } catch (err) {
    console.error('Profile Update Error (Admin):', err);
    res.status(500).json({ error: 'Failed to update admin profile' });
  }
});

app.put('/api/profile/user/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to update user password' }); }
});

app.put('/api/profile/admin/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.params.id);
    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to update admin password' }); }
});

// USER ROUTES
app.post('/api/user/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const { jobId, userId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const text = await extractText(req.file.path, path.extname(req.file.originalname).toLowerCase());
    if (!text || text.trim().length < 50) return res.status(400).json({ error: 'Could not read resume' });
    const { score, breakdown, suggestions, ...parsed } = await analyzeResumeWithGroq(text, job);
    const status = score >= 70 ? 'Shortlisted' : score >= 50 ? 'Review' : 'Rejected';
    const resume = await UserResume.create({ userId, jobId: job._id, jobTitle: job.title, department: job.department, fileName: req.file.originalname, filePath: req.file.path, ...parsed, score, breakdown, suggestions, status, viewedByAdmin: false });
    const user = await User.findById(userId);
    if (user) sendEmail('resumeAnalyzed', user.name, user.email, score, status, job.title);
    if (score >= 70) {
      const admins = await Admin.find({});
      admins.forEach(admin => sendEmail('newApplicationAdmin', admin.email, parsed.name, job.title, score, status));
    }
    res.json({ success: true, message: 'Resume analyzed!', resume });
  } catch (e) { console.error('Upload error:', e); res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/user/resumes/:userId', async (req, res) => {
  try {
    const resumes = await UserResume.find({ userId: req.params.userId }).sort({ uploadDate: -1 });
    res.json(resumes);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/user/resume/:id', async (req, res) => {
  try {
    const resume = await UserResume.findByIdAndDelete(req.params.id);
    if (!resume) return res.status(404).json({ error: 'Not found' });
    if (resume.filePath && fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }
    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete resume' }); }
});

app.get('/api/user/resume/:id/download', async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') return res.status(400).json({ error: 'Invalid ID' });
    let resume = await UserResume.findById(req.params.id);
    if (!resume) resume = await AdminResume.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: 'Not found' });
    generateUserPDF(resume, res);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ADMIN ROUTES
app.get('/api/admin/user-resumes', async (req, res) => {
  try {
    let query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.jobId) query.jobId = req.query.jobId;
    if (req.query.status) query.status = req.query.status;
    const resumes = await UserResume.find(query).sort({ score: -1 });
    res.json(resumes);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/admin-resumes', async (req, res) => {
  try {
    let query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.jobId) query.jobId = req.query.jobId;
    if (req.query.status) query.status = req.query.status;
    const resumes = await AdminResume.find(query).sort({ score: -1 });
    res.json(resumes);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const userResumes = await UserResume.find({});
    const adminResumes = await AdminResume.find({});
    const all = [...userResumes, ...adminResumes];
    const departments = await Department.find();
    const byDept = {};
    for (const d of departments) {
      const ur = await UserResume.find({ department: d.id });
      const ar = await AdminResume.find({ department: d.id });
      byDept[d.id] = { name: d.name, total: ur.length + ar.length, shortlisted: [...ur, ...ar].filter(r => r.status === 'Shortlisted').length };
    }
    res.json({ total: all.length, userSubmitted: userResumes.length, bulkUploaded: adminResumes.length, shortlisted: all.filter(r => r.status === 'Shortlisted').length, review: all.filter(r => r.status === 'Review').length, rejected: all.filter(r => r.status === 'Rejected').length, newApplications: userResumes.filter(r => !r.viewedByAdmin).length, averageScore: all.length ? Math.round(all.reduce((s, r) => s + r.score, 0) / all.length) : 0, byDepartment: byDept });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/stats-detailed', async (req, res) => {
  try {
    const userResumes = await UserResume.find({});
    const adminResumes = await AdminResume.find({});
    res.json({ total: userResumes.length + adminResumes.length, userUploaded: { total: userResumes.length, shortlisted: userResumes.filter(r => r.status === 'Shortlisted').length, review: userResumes.filter(r => r.status === 'Review').length, rejected: userResumes.filter(r => r.status === 'Rejected').length, avgScore: userResumes.length ? Math.round(userResumes.reduce((s, r) => s + r.score, 0) / userResumes.length) : 0 }, adminUploaded: { total: adminResumes.length, shortlisted: adminResumes.filter(r => r.status === 'Shortlisted').length, review: adminResumes.filter(r => r.status === 'Review').length, rejected: adminResumes.filter(r => r.status === 'Rejected').length, avgScore: adminResumes.length ? Math.round(adminResumes.reduce((s, r) => s + r.score, 0) / adminResumes.length) : 0 } });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/bulk-upload', bulkUpload.array('resumes', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files' });
    const { jobId, adminId } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const batchId = uuidv4();
    const results = { total: req.files.length, successful: 0, failed: 0, resumes: [] };
    for (const file of req.files) {
      try {
        const text = await extractText(file.path, path.extname(file.originalname).toLowerCase());
        if (!text || text.trim().length < 50) { results.failed++; results.resumes.push({ fileName: file.originalname, status: 'failed', error: 'No text' }); continue; }
        const { score, breakdown, suggestions, ...parsed } = await analyzeResumeWithGroq(text, job);
        const status = score >= 70 ? 'Shortlisted' : score >= 50 ? 'Review' : 'Rejected';
        await AdminResume.create({ adminId, batchId, jobId: job._id, jobTitle: job.title, department: job.department, fileName: file.originalname, filePath: file.path, ...parsed, score, breakdown, suggestions, status });
        results.successful++;
        results.resumes.push({ fileName: file.originalname, status: 'success', score, resumeStatus: status, name: parsed.name });
      } catch (err) { results.failed++; results.resumes.push({ fileName: file.originalname, status: 'failed', error: err.message }); }
    }
    res.json({
  success: true,
  message: `Processed ${results.total}`,
  batchId,          // ✅ SEND batchId
  results
});
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/bulk-report/pdf', async (req, res) => {
  try {
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID required' });
    }

    // 🔹 TEMP TEST PDF (to confirm download works)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bulk-report-${batchId}.pdf"`
    );

    res.send(Buffer.from(`
      %PDF-1.4
      1 0 obj <<>> endobj
      2 0 obj << /Type /Catalog /Pages 3 0 R >> endobj
      3 0 obj << /Type /Pages /Kids [4 0 R] /Count 1 >> endobj
      4 0 obj << /Type /Page /Parent 3 0 R /MediaBox [0 0 300 200]
      /Contents 5 0 R /Resources <<>> >> endobj
      5 0 obj << /Length 44 >> stream
      BT /F1 12 Tf 50 150 Td (Bulk Report Working!) Tj ET
      endstream endobj
      xref
      0 6
      0000000000 65535 f
      trailer << /Root 2 0 R /Size 6 >>
      startxref
      450
      %%EOF
    `));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.put('/api/admin/user-resume/:id/status', async (req, res) => {
  try {
    const oldResume = await UserResume.findById(req.params.id);
    const resume = await UserResume.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    const user = await User.findById(resume.userId);
    if (user && oldResume && oldResume.status !== req.body.status) {
      sendEmail('statusChange', user.name, user.email, resume.jobTitle, oldResume.status, req.body.status);
    }
    res.json({ success: true, resume });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/admin/admin-resume/:id/status', async (req, res) => {
  try {
    const resume = await AdminResume.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, resume });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/admin/user-resume/:id/view', async (req, res) => {
  try { await UserResume.findByIdAndUpdate(req.params.id, { viewedByAdmin: true }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/user-resume/:id', async (req, res) => {
  try { const r = await UserResume.findById(req.params.id); if (!r) return res.status(404).json({ error: 'Not found' }); if (fs.existsSync(r.filePath)) fs.unlinkSync(r.filePath); await UserResume.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/admin-resume/:id', async (req, res) => {
  try { const r = await AdminResume.findById(req.params.id); if (!r) return res.status(404).json({ error: 'Not found' }); if (fs.existsSync(r.filePath)) fs.unlinkSync(r.filePath); await AdminResume.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/export-user-excel', async (req, res) => {
  try {
    let query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.jobId) query.jobId = req.query.jobId;
    if (req.query.status) query.status = req.query.status;
    const resumes = await UserResume.find(query).sort({ score: -1 });
    const data = resumes.map((r, i) => ({ 'Rank': i+1, 'Name': r.name, 'Email': r.email, 'Position': r.jobTitle, 'Score': r.score, 'Status': r.status }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/export-admin-excel', async (req, res) => {
  try {
    let query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.jobId) query.jobId = req.query.jobId;
    if (req.query.status) query.status = req.query.status;
    const resumes = await AdminResume.find(query).sort({ score: -1 });
    const data = resumes.map((r, i) => ({ 'Rank': i+1, 'Batch': r.batchId, 'Name': r.name, 'Position': r.jobTitle, 'Score': r.score, 'Status': r.status }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bulk-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// PDF DOWNLOAD ROUTES (ADD THESE)
app.get('/api/admin/download-user-report', async (req, res) => {
  try { 
    let query = {}; 
    if (req.query.department) query.department = req.query.department; 
    if (req.query.jobId) query.jobId = req.query.jobId; 
    if (req.query.status) query.status = req.query.status; 
    const resumes = await UserResume.find(query).sort({ score: -1 }); 
    generateAdminPDF(resumes, res); 
  } catch (err) { 
    console.error('Download user report error:', err); 
    res.status(500).json({ error: 'Failed' }); 
  }
});

app.get('/api/admin/download-admin-report', async (req, res) => {
  try { 
    let query = {}; 
    if (req.query.department) query.department = req.query.department; 
    if (req.query.jobId) query.jobId = req.query.jobId; 
    if (req.query.status) query.status = req.query.status; 
    const resumes = await AdminResume.find(query).sort({ score: -1 }); 
    generateAdminPDF(resumes, res); 
  } catch (err) { 
    console.error('Download admin report error:', err); 
    res.status(500).json({ error: 'Failed' }); 
  }
});

// CHATBOT - Enhanced with Admin Support
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message, userRole } = req.body;
    const lower = message.toLowerCase();
    let response = '';
    
    const isAdmin = userRole === 'admin';

    // ============ ADMIN RESPONSES ============
    if (isAdmin) {
      
      // Candidate review & filtering
      if (lower.includes('review') || lower.includes('candidate') || lower.includes('application')) {
        response = "**Reviewing Candidates:**\n\n📊 **Quick Filters:**\n• Go to Applications page\n• Filter by Status: Shortlisted (70+), Review (50-69), Rejected (<50)\n• Filter by Department or Job\n\n✅ **Best Practices:**\n• Focus on 70+ scores first\n• Check matched vs missing skills\n• Review suggestions given to candidates\n• Change status to track progress\n\n💡 **Tip:** Use bulk actions to process multiple candidates at once!";
      }
      
      // Scoring system explanation
      else if (lower.includes('score') || lower.includes('scoring')) {
        response = "**How Scoring Works:**\n\n📊 **Score Breakdown (100 points):**\n• Skills Match: 40 points\n• Experience: 30 points\n• Education: 30 points\n\n🎯 **Status Thresholds:**\n• 70-100: Shortlisted ✅ (Ready to interview)\n• 50-69: Review ⚠️ (Needs evaluation)\n• 0-49: Rejected ❌ (Missing requirements)\n\n💡 **Pro Tip:** Candidates with 65-69 scores may be worth reviewing if they have strong soft skills or potential!";
      }
      
      // Bulk upload
      else if (lower.includes('bulk') || lower.includes('upload multiple')) {
        response = "**Bulk Upload Guide:**\n\n📤 **Steps:**\n1. Go to 'Upload Bulk' page\n2. Select Department & Job\n3. Choose up to 50 PDF/DOCX files\n4. Click 'Upload & Analyze'\n\n✅ **What Happens:**\n• All resumes analyzed instantly\n• Automatic scoring & ranking\n• Batch ID assigned for tracking\n\n💡 **Best For:** Job fairs, campus drives, email submissions\n\n⚡ **Speed:** ~5-10 seconds per resume";
      }
      
      // Reports & downloads
      else if (lower.includes('report') || lower.includes('download') || lower.includes('export')) {
        response = "**Available Reports:**\n\n📄 **PDF Reports:**\n• Candidate Rankings\n• Score Breakdowns\n• Department-wise Stats\n➤ Click 'Download PDF Report' on any page\n\n📊 **Excel Exports:**\n• Full candidate data\n• Skills matched/missing\n• Contact information\n➤ Click 'Export to Excel'\n\n💡 **Use Excel for:** Sharing with team, further analysis, tracking over time";
      }
      
      // Email notifications
      else if (lower.includes('email') || lower.includes('notification')) {
        response = "**Email Notifications:**\n\n📧 **You Receive:**\n• New application alerts (70+ scores)\n• Status: Candidate name, job, score\n\n📧 **Candidates Receive:**\n• Resume analyzed confirmation\n• Status change notifications\n• Score & suggestions\n\n✅ **Automatic:** All emails sent instantly when actions occur\n\n💡 **Tip:** Check your spam folder if not receiving emails!";
      }
      
      // Jobs management
      else if (lower.includes('job') || lower.includes('position') || lower.includes('create job')) {
        response = "**Managing Jobs:**\n\n➕ **Create New Job:**\n1. Go to 'Jobs' page\n2. Click 'Add New Job'\n3. Enter: Title, Department, Skills, Experience, Education\n4. Save\n\n✏️ **Edit/Delete:**\n• Click on any job to edit\n• Delete if no longer hiring\n\n💡 **Tip:** Be specific with required skills - exact matches get higher scores!";
      }
      
      // Dashboard & stats
      else if (lower.includes('dashboard') || lower.includes('stats') || lower.includes('analytics')) {
        response = "**Dashboard Overview:**\n\n📊 **Key Metrics:**\n• Total Applications\n• Shortlisted/Review/Rejected counts\n• Average Score\n• New (Unviewed) Applications\n\n📈 **Department Stats:**\n• Applications per department\n• Shortlisted per department\n\n🔍 **Recent Activity:**\n• Last 5 applications\n• Real-time updates\n\n💡 **Refresh:** Dashboard auto-updates on page load";
      }
      
      // Greeting
      else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        response = "👋 **Hello Admin!**\n\nI can help you with:\n\n📋 **Candidate Management:**\n• Reviewing applications\n• Understanding scores\n• Filtering candidates\n\n📤 **Bulk Operations:**\n• Mass resume upload\n• Batch processing\n\n📊 **Reports & Analytics:**\n• Downloading reports\n• Viewing statistics\n\n💼 **Jobs & Settings:**\n• Creating positions\n• Managing requirements\n\n**What do you need help with?**";
      }
      
      // Default admin response
      else {
        response = "I can help you with:\n\n• 📋 Reviewing candidates\n• 📊 Understanding scoring\n• 📤 Bulk uploads\n• 📄 Generating reports\n• 💼 Managing jobs\n• 📧 Email notifications\n\n**Ask me anything about hiring!**";
      }
    }
    
    // ============ USER RESPONSES ============
    else {
      
      // Resume improvement tips
      if (lower.includes('improve') || lower.includes('tips') || lower.includes('better')) {
        response = "**Resume Improvement Tips:**\n\n✅ **Content:**\n1. Quantify achievements (\"Increased sales by 25%\")\n2. Use action verbs (Developed, Led, Achieved)\n3. Match job description keywords\n4. Include specific skills\n5. Add measurable results\n\n📝 **Format:**\n• Keep it 1-2 pages\n• Use bullet points\n• Clear section headers\n• Professional font\n• Save as PDF\n\n💡 **Pro Tip:** Tailor your resume for each job!";
      }
      
      // Score improvement
      else if (lower.includes('score') || lower.includes('low') || lower.includes('points')) {
        response = "**Boost Your Score:**\n\n📊 **Skills (40 points):**\n• List ALL required skills from job description\n• Include proficiency levels\n• Add relevant tools/technologies\n\n💼 **Experience (30 points):**\n• Clearly state: \"X years of experience in...\"\n• Count internships & projects\n• Use format: \"Position | Company | 2020-2023 (3 years)\"\n\n🎓 **Education (30 points):**\n• Include degree name\n• Add university/college\n• Mention CGPA if >7.0\n\n🎯 **Target:** 70+ for shortlisting!";
      }
      
      // Job search
      else if (lower.includes('job') || lower.includes('position') || lower.includes('apply') || lower.includes('opening')) {
        response = "**Finding & Applying for Jobs:**\n\n🔍 **Browse Positions:**\n• Go to 'Upload Resume' page\n• Select Department:\n  💻 IT & Technology\n  💰 Finance & Accounting\n  👥 Human Resources\n  📢 Marketing & Sales\n  ⚙️ Operations\n  🏥 Healthcare\n\n📝 **How to Apply:**\n1. Choose your department\n2. Select a job that matches your skills\n3. Upload your resume (PDF/DOCX)\n4. Get instant analysis!\n\n✅ **After Upload:**\n• View your score & status\n• Get improvement suggestions\n• Download detailed PDF report";
      }
      
      // Platform usage
      else if (lower.includes('how') || lower.includes('work') || lower.includes('use') || lower.includes('start')) {
        response = "**How ResuMatch Works:**\n\n1️⃣ **Upload Resume**\n• Select department & job\n• Upload PDF or DOCX (max 5MB)\n\n2️⃣ **AI Analysis** (~10 seconds)\n• Extracts your information\n• Matches skills with requirements\n• Calculates experience fit\n\n3️⃣ **Get Results**\n• Score out of 100\n• Detailed breakdown\n• Status: Shortlisted/Review/Rejected\n\n4️⃣ **Improve**\n• Personalized suggestions\n• Action items with examples\n• Expected score impact\n\n5️⃣ **Download**\n• Professional PDF report\n• Share with recruiters\n\n🚀 **Ready?** Go to 'Upload Resume'!";
      }
      
      // Skills help
      else if (lower.includes('skill') || lower.includes('missing') || lower.includes('add skill')) {
        response = "**How to Add Skills:**\n\n📝 **Create Skills Section:**\n```\nSKILLS\nTechnical: JavaScript, Python, React, Node.js, MongoDB\nTools: Git, Docker, VS Code, AWS\nSoft Skills: Leadership, Communication, Problem Solving\n```\n\n💡 **Tips:**\n• List skills from job description\n• Include proficiency levels\n• Back up with project examples\n• Be honest - only list real skills!\n\n🎯 **Match Job Keywords:** Use EXACT skill names from job posting for higher scores!";
      }
      
      // Status check
      else if (lower.includes('status') || lower.includes('result') || lower.includes('check')) {
        response = "**Check Your Status:**\n\n📊 **Go to 'My Resumes':**\n• View all applications\n• See current status\n• Check scores\n\n🎨 **Status Colors:**\n• 🟢 Shortlisted (70+) - Great job!\n• 🟡 Review (50-69) - Close, improve further\n• 🔴 Rejected (<50) - Needs work\n\n📄 **Download Report:**\n• Click PDF button on any resume\n• Get detailed analysis\n• See improvement suggestions\n\n📧 **Email Notifications:**\nYou'll receive emails when:\n• Resume is analyzed\n• Status changes\n• Admin reviews your application";
      }
      
      // Templates
      else if (lower.includes('template') || lower.includes('example') || lower.includes('format')) {
        response = "**Resume Templates:**\n\n📄 **Access Templates:**\n• Go to 'Templates' page\n• Download sample resumes\n• Available formats: Software Dev, Marketing, etc.\n\n✏️ **How to Use:**\n1. Download template\n2. Replace with your info\n3. Keep the structure\n4. Upload to test score\n\n💡 **Tip:** Templates are pre-formatted to score well!";
      }
      
      // Greeting
      else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('help')) {
        response = "👋 **Hi! Welcome to ResuMatch!**\n\nI can help you:\n\n📝 **Resume Help:**\n• Improvement tips\n• Formatting advice\n• Common mistakes\n\n📊 **Scoring:**\n• How scores work\n• Boost your points\n• Reach 70+ threshold\n\n💼 **Job Search:**\n• Find positions\n• Apply effectively\n• Track applications\n\n❓ **Platform:**\n• How to use ResuMatch\n• Check your status\n• Download reports\n\n**What would you like to know?**";
      }
      
      // Thank you
      else if (lower.includes('thank') || lower.includes('thanks')) {
        response = "You're welcome! 😊\n\nGood luck with your job search! Remember:\n• Aim for 70+ score\n• Keep improving your resume\n• Apply to multiple positions\n\nI'm here if you need more help! 🚀";
      }
      
      // Default user response
      else {
        response = "I can help you with:\n\n📝 **Resume Tips** - \"How can I improve my resume?\"\n📊 **Score Help** - \"How to improve my score?\"\n💼 **Find Jobs** - \"What jobs are available?\"\n❓ **Platform Help** - \"How does this work?\"\n🎯 **Skills** - \"How to add skills?\"\n\n**Just ask me anything!** 😊";
      }
    }
    
    res.json({ response });
  } catch (err) { 
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Chatbot temporarily unavailable' }); 
  }
});

// RESUME TEMPLATES
const resumeTemplates = [
  { 
    id: 'software-developer', 
    title: 'Software Developer', 
    department: 'it',
    icon: '💻',
    description: 'Perfect for developers, programmers, and tech professionals',
    preview: 'Includes: Skills, Projects, Experience, Education sections',
    content: `JOHN DOE
Software Developer | Full Stack Engineer
Email: john.doe@email.com | Phone: +91-9876543210
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe
Location: Mumbai, Maharashtra, India

PROFESSIONAL SUMMARY
Results-driven Software Developer with 3+ years of experience in full-stack web development. Proven track record of delivering high-quality applications using modern technologies. Strong problem-solving skills and passion for clean, efficient code.

TECHNICAL SKILLS
Languages: JavaScript, Python, Java, TypeScript, HTML5, CSS3
Frontend: React.js, Vue.js, Next.js, Redux, Tailwind CSS, Bootstrap
Backend: Node.js, Express.js, Django, REST APIs, GraphQL
Database: MongoDB, PostgreSQL, MySQL, Redis
Tools & Others: Git, Docker, AWS, CI/CD, Jest, Webpack, Agile/Scrum

PROFESSIONAL EXPERIENCE

Senior Software Developer | Tech Solutions Pvt Ltd | Mumbai, India
June 2022 - Present (2 years of experience)
- Developed and maintained 15+ web applications serving 50,000+ active users
- Optimized database queries reducing page load time by 40%
- Led a team of 3 junior developers in agile environment
- Implemented CI/CD pipeline reducing deployment time by 60%
- Built RESTful APIs handling 100,000+ requests daily
- Technologies: React, Node.js, MongoDB, AWS, Docker

Junior Software Developer | StartUp Innovate | Pune, India
July 2020 - May 2022 (2 years of experience)
- Developed responsive web applications using React and Node.js
- Collaborated with design team to implement pixel-perfect UI/UX
- Reduced bug reports by 35% through comprehensive testing
- Participated in code reviews and mentored 2 interns
- Technologies: JavaScript, Express.js, PostgreSQL, Git

PROJECTS

E-Commerce Platform | Personal Project
- Built full-stack e-commerce application with 10,000+ daily visitors
- Features: User authentication, payment gateway, admin dashboard
- Tech Stack: React, Node.js, MongoDB, Stripe, AWS S3
- GitHub: github.com/johndoe/ecommerce-platform

Task Management Application | Hackathon Winner
- Created collaborative task management tool in 48-hour hackathon
- Won 1st place among 50+ teams
- Features: Real-time collaboration, notifications, file attachments
- Tech Stack: Vue.js, Socket.io, Express, MongoDB

EDUCATION

Bachelor of Technology in Computer Science
Mumbai University | Mumbai, India
2016 - 2020 | CGPA: 8.5/10

Relevant Coursework: Data Structures, Algorithms, Database Management, 
Web Development, Software Engineering, Operating Systems

CERTIFICATIONS
- AWS Certified Developer - Associate | Amazon Web Services | 2023
- MongoDB Certified Developer | MongoDB University | 2022
- Full Stack Web Development | Udemy | 2021

ACHIEVEMENTS
- Won 1st place in National Level Hackathon (2023)
- Published 3 technical articles with 10,000+ reads
- Open source contributor with 500+ GitHub stars
- Speaker at Mumbai Tech Meetup (2022)

LANGUAGES
- English: Fluent (Professional)
- Hindi: Native
- Marathi: Native` 
  },
  
  { 
    id: 'marketing-manager', 
    title: 'Marketing Manager', 
    department: 'marketing',
    icon: '📢',
    description: 'Ideal for marketing professionals, digital marketers, and brand managers',
    preview: 'Includes: Campaign Experience, Analytics, Strategy, Results',
    content: `PRIYA SHARMA
Marketing Manager | Digital Marketing Specialist
Email: priya.sharma@email.com | Phone: +91-9876543210
LinkedIn: linkedin.com/in/priyasharma | Portfolio: priyasharma.com
Location: Bangalore, Karnataka, India

PROFESSIONAL SUMMARY
Strategic Marketing Manager with 5+ years of experience driving brand growth and customer engagement. Expertise in digital marketing, campaign management, and data-driven decision making. Proven track record of delivering 250% ROI and managing budgets up to ₹1.5 Crore.

CORE COMPETENCIES
- Digital Marketing Strategy
- Social Media Marketing (Facebook, Instagram, LinkedIn, Twitter)
- SEO & SEM (Google Ads, Facebook Ads)
- Content Marketing & Copywriting
- Email Marketing (Mailchimp, HubSpot)
- Marketing Analytics (Google Analytics, Facebook Insights)
- Brand Development & Management
- Campaign Planning & Execution
- Team Leadership & Collaboration
- Budget Management
- Market Research & Analysis

PROFESSIONAL EXPERIENCE

Marketing Manager | GrowthHub Solutions Pvt Ltd | Bangalore, India
January 2021 - Present (4 years of experience)
- Managed marketing budget of ₹1.5 Crore delivering 250% ROI
- Increased website traffic by 300% through comprehensive SEO strategy
- Led team of 8 marketing specialists across digital and content divisions
- Launched 25+ successful campaigns generating 5,000+ qualified leads
- Grew social media following from 10K to 150K across all platforms
- Implemented marketing automation reducing lead response time by 60%
- Collaborated with sales team achieving 180% of annual revenue target
- Key Results: ₹5 Crore revenue generated, 40% increase in brand awareness

Senior Digital Marketing Specialist | BrandWorks Agency | Mumbai, India
June 2018 - December 2020 (2.5 years of experience)
- Executed email marketing campaigns achieving 35% open rate and 8% CTR
- Managed PPC campaigns with 4:1 return on ad spend (ROAS)
- Created content strategy increasing engagement by 180%
- Conducted A/B testing improving conversion rates by 25%
- Managed 5 client accounts with combined budget of ₹50 Lakhs
- Technologies: Google Ads, Facebook Business Manager, SEMrush, Hootsuite

EDUCATION

Master of Business Administration (Marketing)
Indian Institute of Management Bangalore (IIM-B)
2016 - 2018 | CGPA: 8.8/10

Bachelor of Commerce
Mumbai University | Mumbai, India
2013 - 2016 | First Class with Distinction (82%)

CERTIFICATIONS
- Google Ads Certification (Search, Display, Video) | Google | 2023
- HubSpot Content Marketing Certification | HubSpot Academy | 2023
- Facebook Blueprint Certified: Buying Professional | Meta | 2022
- Digital Marketing Specialization | Coursera | 2021
- Google Analytics Individual Qualification (GAIQ) | Google | 2020

KEY CAMPAIGNS & ACHIEVEMENTS

Festival Season Campaign (Diwali 2023)
- Strategy: Multi-channel campaign across social media, email, and paid ads
- Budget: ₹25 Lakhs | Results: ₹1.2 Crore revenue, 380% ROI
- Achievement: Highest performing campaign in company history

Product Launch Campaign
- Successfully launched 3 new products with integrated marketing approach
- Generated 2,000+ pre-orders worth ₹40 Lakhs before official launch
- Secured media coverage in 5 top-tier publications

Brand Awareness Initiative
- Increased brand recall by 65% through consistent storytelling
- Grew organic social media reach by 400% in 6 months
- Won "Best Brand Campaign" award at Mumbai Marketing Summit 2023

TOOLS & TECHNOLOGIES
- Analytics: Google Analytics, Facebook Insights, Hotjar, SEMrush
- Automation: HubSpot, Mailchimp, Zapier, ActiveCampaign
- Design: Canva, Adobe Photoshop, Figma
- Social Media: Hootsuite, Buffer, Sprout Social
- SEO: Ahrefs, Moz, Google Search Console
- Project Management: Trello, Asana, Monday.com

AWARDS & RECOGNITION
- "Marketing Campaign of the Year" - Indian Marketing Awards 2023
- Featured in "Top 30 Under 30 Marketers in India" - Marketing Insider 2022
- "Best Digital Marketing Strategy" - Bangalore Business Awards 2021

PROFESSIONAL MEMBERSHIPS
- Member, American Marketing Association (AMA)
- Member, Digital Marketing Institute India

LANGUAGES
- English: Fluent (Business Professional)
- Hindi: Fluent
- Kannada: Conversational` 
  },
  
  { 
    id: 'business-analyst', 
    title: 'Business Analyst', 
    department: 'finance',
    icon: '💼',
    description: 'Great for analysts, consultants, and business professionals',
    preview: 'Includes: Analysis Skills, Tools, Projects, Impact Metrics',
    content: `RAHUL PATEL
Business Analyst | Data Analytics Professional
Email: rahul.patel@email.com | Phone: +91-9876543210
LinkedIn: linkedin.com/in/rahulpatel | Location: Delhi, India

PROFESSIONAL SUMMARY
Detail-oriented Business Analyst with 4+ years of experience in requirements gathering, process improvement, and data analysis. Expertise in translating business needs into technical solutions. Strong analytical and communication skills with proven ability to drive organizational efficiency and profitability.

CORE COMPETENCIES
- Business Requirements Analysis
- Process Mapping & Optimization
- Data Analysis & Visualization
- Stakeholder Management
- Gap Analysis & Solution Design
- User Story & Use Case Development
- Financial Modeling & Forecasting
- Project Management
- Agile/Scrum Methodologies
- SQL & Database Management
- Business Intelligence (BI)
- Risk Analysis & Mitigation

TECHNICAL SKILLS
Analysis Tools: Excel (Advanced), Tableau, Power BI, Google Data Studio
Programming: SQL, Python (Pandas, NumPy), R (Basic)
Project Management: JIRA, Confluence, Microsoft Project, Trello
Documentation: Microsoft Office Suite, Visio, Draw.io, Lucidchart
Methodologies: Agile, Scrum, Waterfall, Lean Six Sigma
Business Tools: Salesforce, SAP, NetSuite, QuickBooks

PROFESSIONAL EXPERIENCE

Senior Business Analyst | TechCorp Solutions | Gurugram, India
March 2021 - Present (3 years of experience)
- Led requirements gathering for 10+ enterprise software projects worth ₹5 Crore+
- Conducted stakeholder interviews with C-level executives to define business needs
- Created detailed business requirement documents (BRD) and functional specifications
- Reduced operational costs by 20% through process optimization initiatives
- Developed data models and dashboards in Tableau used by 100+ stakeholders
- Facilitated UAT sessions and ensured 95%+ requirement satisfaction
- Managed cross-functional teams of 15+ members across 3 departments
- Key Achievement: Delivered ERP implementation project 2 months ahead of schedule

Business Analyst | Consulting Partners Ltd | Mumbai, India
July 2019 - February 2021 (2 years of experience)
- Analyzed business processes for 15+ clients across BFSI and retail sectors
- Performed data analysis on datasets with 500,000+ records using SQL and Python
- Created weekly executive dashboards tracking KPIs and business metrics
- Identified revenue opportunities worth ₹2 Crore through data-driven insights
- Documented 200+ user stories and acceptance criteria for development teams
- Conducted cost-benefit analysis for 5 major system implementations
- Trained 30+ end users on new systems and processes

KEY PROJECTS & ACHIEVEMENTS

CRM System Implementation | TechCorp Solutions
Role: Lead Business Analyst
- Gathered requirements from 50+ stakeholders across sales and marketing
- Designed solution architecture integrating Salesforce with existing systems
- Result: 35% increase in sales productivity, ₹80 Lakh cost savings annually
- Tools: Salesforce, SQL, Tableau, JIRA

Supply Chain Optimization | Manufacturing Client
Role: Business Analyst
- Mapped 15 core business processes identifying 23 improvement opportunities
- Developed predictive models for inventory management
- Result: 28% reduction in inventory costs, improved delivery time by 40%
- Tools: Python, Excel, Power BI, Process Mapping

Financial Reporting Dashboard | Consulting Partners
Role: Data Analyst
- Automated 12 manual financial reports saving 100+ hours monthly
- Created interactive Power BI dashboard for C-suite executives
- Result: Real-time visibility into financial metrics, faster decision-making
- Tools: Power BI, SQL, DAX, Excel

EDUCATION

Master of Business Administration (Finance & Analytics)
Indian Institute of Management Lucknow (IIM-L)
2017 - 2019 | CGPA: 8.6/10

Bachelor of Technology in Computer Science
Delhi Technological University (DTU)
2013 - 2017 | CGPA: 8.2/10

CERTIFICATIONS
- Certified Business Analysis Professional (CBAP) | IIBA | 2023
- Project Management Professional (PMP) | PMI | 2022
- Tableau Desktop Specialist | Tableau | 2022
- Microsoft Power BI Data Analyst | Microsoft | 2021
- SQL for Data Analysis | Udacity | 2020
- Agile Certified Practitioner (PMI-ACP) | PMI | 2020

ANALYSIS & TOOLS PROFICIENCY
Excel: Advanced (VBA Macros, Pivot Tables, Power Query, Complex Formulas)
SQL: Proficient (Complex Queries, Joins, Subqueries, Stored Procedures)
Tableau: Advanced (Dashboards, Calculated Fields, LOD Expressions)
Power BI: Advanced (DAX, Power Query, Custom Visuals, Data Modeling)
Python: Intermediate (Pandas, NumPy, Data Visualization, Automation)
JIRA: Expert (Workflow Configuration, Dashboards, Agile Boards)

PROFESSIONAL ACHIEVEMENTS
- Improved business processes resulting in ₹1.5 Crore annual savings
- Successfully delivered 20+ projects with 100% on-time delivery rate
- Recognized as "Employee of the Year" for outstanding contributions (2022)
- Mentored 8 junior analysts in requirements gathering and data analysis
- Presented business intelligence insights to board of directors (5+ sessions)

LANGUAGES
- English: Fluent (Business Professional)
- Hindi: Native
- Gujarati: Native

PROFESSIONAL INTERESTS
- Business Process Improvement
- Data-Driven Decision Making
- Digital Transformation
- Emerging Technologies in Business Analytics` 
  }
];

app.get('/api/templates', (req, res) => { 
  res.json(resumeTemplates); 
});

app.get('/api/templates/:id/download', (req, res) => { 
  const template = resumeTemplates.find(t => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${template.id}-resume-template.txt`);
  res.send(template.content);
});

// ==================== SUPER ADMIN ROUTES ====================

app.get('/api/superadmin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await Admin.countDocuments();
    const totalUserResumes = await UserResume.countDocuments();
    const totalAdminResumes = await AdminResume.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const recentAdmins = await Admin.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    res.json({ totalUsers, totalAdmins, totalUserResumes, totalAdminResumes, totalResumes: totalUserResumes + totalAdminResumes, totalJobs, totalDepartments, recentUsers, recentAdmins });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

app.get('/api/superadmin/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

app.put('/api/superadmin/users/:id/block', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: req.body.isBlocked }, { new: true });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: 'Failed to update user' }); }
});

app.delete('/api/superadmin/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await UserResume.deleteMany({ userId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete user' }); }
});

app.get('/api/superadmin/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}, '-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch admins' }); }
});

app.post('/api/superadmin/admins', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Admin already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({ name, email, password: hashedPassword, company });
    res.json({ success: true, admin: { ...newAdmin.toObject(), password: undefined } });
  } catch (err) { res.status(500).json({ error: 'Failed to create admin' }); }
});

app.delete('/api/superadmin/admins/:id', async (req, res) => {
  try {
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete admin' }); }
});

app.post('/api/superadmin/departments', async (req, res) => {
  try {
    const { id, name, icon } = req.body;
    const exists = await Department.findOne({ id });
    if (exists) return res.status(400).json({ error: 'Department ID already exists' });
    const dept = await Department.create({ id, name, icon });
    res.json({ success: true, department: dept });
  } catch (err) { res.status(500).json({ error: 'Failed to create department' }); }
});

app.put('/api/superadmin/departments/:id', async (req, res) => {
  try {
    const { name, icon } = req.body;
    const dept = await Department.findOneAndUpdate({ id: req.params.id }, { name, icon }, { new: true });
    res.json({ success: true, department: dept });
  } catch (err) { res.status(500).json({ error: 'Failed to update department' }); }
});

app.delete('/api/superadmin/departments/:id', async (req, res) => {
  try {
    await Department.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete department' }); }
});

app.get('/api/superadmin/logs', async (req, res) => {
  try {
    const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(20);
    const recentAdmins = await Admin.find({}).sort({ createdAt: -1 }).limit(20);
    const recentResumes = await UserResume.find({}).sort({ uploadDate: -1 }).limit(20);
    const logs = [
      ...recentUsers.map(u => ({ type: 'user_signup', user: u.name, email: u.email, timestamp: u.createdAt })),
      ...recentAdmins.map(a => ({ type: 'admin_signup', user: a.name, email: a.email, timestamp: a.createdAt })),
      ...recentResumes.map(r => ({ type: 'resume_upload', user: r.name, job: r.jobTitle, timestamp: r.uploadDate }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch logs' }); }
});

// SHARED
app.get('/api/departments', async (req, res) => { try { res.json(await Department.find()); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/jobs', async (req, res) => { try { let q = { isActive: true }; if (req.query.department) q.department = req.query.department; res.json(await Job.find(q)); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/jobs/:id', async (req, res) => { try { const j = await Job.findById(req.params.id); if (!j) return res.status(404).json({ error: 'Not found' }); res.json(j); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/admin/jobs', async (req, res) => { try { let q = {}; if (req.query.department) q.department = req.query.department; res.json(await Job.find(q)); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.post('/api/admin/jobs', async (req, res) => { try { const { title, department, description, skills, experience, education, adminId } = req.body; if (!title || !department || !skills || !experience) return res.status(400).json({ error: 'Missing fields' }); const job = await Job.create({ title, department, description: description || '', skills: Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim().toLowerCase()), experience: parseInt(experience), education: Array.isArray(education) ? education : (education || '').split(',').map(e => e.trim().toLowerCase()), isActive: true, createdBy: adminId }); res.json({ success: true, job }); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.put('/api/admin/jobs/:id', async (req, res) => { try { const { title, department, description, skills, experience, education } = req.body; const updateData = { title, department, description: description || '', skills: Array.isArray(skills) ? skills : (skills || '').split(',').map(s => s.trim().toLowerCase()), experience: parseInt(experience || 0), education: Array.isArray(education) ? education : (education || '').split(',').map(e => e.trim().toLowerCase()) }; const job = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true }); res.json({ success: true, job }); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.delete('/api/admin/jobs/:id', async (req, res) => { try { await Job.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/templates', (req, res) => { res.json([{ id:'sw', title:'Software Dev', content:'JOHN DOE\nDeveloper\njohn@email.com' }]); });
app.get('/api/templates/:id/download', (req, res) => { res.setHeader('Content-Type','text/plain'); res.setHeader('Content-Disposition',`attachment; filename=template.txt`); res.send('Sample Template'); });

app.listen(PORT, () => {
  console.log('\n🚀 ResuMatch Pro Running');
  console.log(`URL: http://localhost:${PORT}`);
  console.log('✅ All routes active\n');
});
