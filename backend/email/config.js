const nodemailer = require('nodemailer');

// IMPORTANT: Replace with YOUR Gmail and App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'khanayesha9822@gmail.com',  // ← PUT YOUR EMAIL HERE
    pass: process.env.EMAIL_PASS || 'emmb qgzk wzwh dobs'    // ← PUT YOUR APP PASSWORD HERE
  }
});

// Test email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  welcome: (userName, userEmail) => ({
    from: '"ResuMatch Pro" <no-reply@resumatch.com>',
    to: userEmail,
    subject: '🎉 Welcome to ResuMatch Pro!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #e94560 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">📄 ResuMatch Pro</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1a1a2e;">Welcome, ${userName}! 👋</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for joining ResuMatch Pro! We're excited to help you land your dream job with AI-powered resume analysis.
          </p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1a1a2e; margin-top: 0;">🚀 Get Started:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Upload your resume for instant analysis</li>
              <li>Get your score out of 100</li>
              <li>Receive personalized improvement suggestions</li>
              <li>Download professional PDF reports</li>
            </ul>
          </div>
          <a href="http://localhost:3000/upload" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #c72d4a 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0;">
            Upload Your Resume Now →
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Questions? Reply to this email or visit our help center.<br>
            © 2026 ResuMatch Pro. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  resumeAnalyzed: (userName, userEmail, score, status, jobTitle) => ({
    from: '"ResuMatch Pro" <no-reply@resumatch.com>',
    to: userEmail,
    subject: `✅ Your Resume Analysis is Ready! Score: ${score}/100`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h1 style="color: #1a1a2e; margin-bottom: 10px;">📊 Resume Analysis Complete!</h1>
          <p style="color: #666; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #666; font-size: 16px;">Your resume for <strong>${jobTitle}</strong> has been analyzed!</p>
          
          <div style="background: ${score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}; color: #fff; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <h2 style="margin: 0; font-size: 48px;">${score}/100</h2>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${status}</p>
          </div>

          ${score < 70 ? `
            <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>💡 Tip:</strong> Review your suggestions to improve your score to 70+ and increase your chances!
              </p>
            </div>
          ` : `
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46;">
                <strong>🎉 Excellent!</strong> Your resume meets the requirements. Great job!
              </p>
            </div>
          `}

          <a href="http://localhost:3000/my-resumes" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #c72d4a 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            View Full Analysis →
          </a>

          <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2026 ResuMatch Pro
          </p>
        </div>
      </div>
    `
  }),

  statusChange: (userName, userEmail, jobTitle, oldStatus, newStatus) => ({
    from: '"ResuMatch Pro" <no-reply@resumatch.com>',
    to: userEmail,
    subject: `🔔 Resume Status Updated: ${newStatus}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h1 style="color: #1a1a2e;">🔔 Status Update</h1>
          <p style="color: #666; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #666; font-size: 16px;">
            The status of your application for <strong>${jobTitle}</strong> has been updated.
          </p>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #999; margin: 0 0 10px 0;">Previous Status:</p>
            <p style="color: #666; font-size: 18px; margin: 0 0 20px 0;"><strong>${oldStatus}</strong></p>
            
            <p style="color: #999; margin: 0 0 10px 0;">New Status:</p>
            <p style="color: ${newStatus === 'Shortlisted' ? '#10b981' : newStatus === 'Review' ? '#f59e0b' : '#ef4444'}; font-size: 24px; margin: 0; font-weight: bold;">
              ${newStatus}
            </p>
          </div>

          ${newStatus === 'Shortlisted' ? `
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46;">
                <strong>🎉 Congratulations!</strong> You've been shortlisted! Expect to hear from the recruiter soon.
              </p>
            </div>
          ` : ''}

          <a href="http://localhost:3000/my-resumes" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #c72d4a 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            View Application →
          </a>

          <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2026 ResuMatch Pro
          </p>
        </div>
      </div>
    `
  }),

  newApplicationAdmin: (adminEmail, candidateName, jobTitle, score, status) => ({
    from: '"ResuMatch Pro" <no-reply@resumatch.com>',
    to: adminEmail,
    subject: `🔔 New Application: ${candidateName} - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h1 style="color: #1a1a2e;">🔔 New Resume Submission</h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; margin: 5px 0;"><strong>Candidate:</strong> ${candidateName}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Score:</strong> ${score}/100</p>
            <p style="color: #666; margin: 5px 0;"><strong>Status:</strong> <span style="color: ${status === 'Shortlisted' ? '#10b981' : status === 'Review' ? '#f59e0b' : '#ef4444'}; font-weight: bold;">${status}</span></p>
          </div>

          <a href="http://localhost:3000/user-resumes" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #c72d4a 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Review Application →
          </a>

          <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2026 ResuMatch Pro
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (userEmail, resetToken) => ({
    from: '"ResuMatch Pro" <no-reply@resumatch.com>',
    to: userEmail,
    subject: '🔒 Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h1 style="color: #1a1a2e;">🔒 Password Reset</h1>
          <p style="color: #666; font-size: 16px;">
            You requested to reset your password. Click the button below to reset it.
          </p>

          <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
          </div>

          <a href="http://localhost:3000/reset-password/${resetToken}" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #c72d4a 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Reset Password →
          </a>

          <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2026 ResuMatch Pro
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (emailType, ...params) => {
  try {
    const emailConfig = emailTemplates[emailType](...params);
    const info = await transporter.sendMail(emailConfig);
    console.log('✅ Email sent:', info.messageId, 'to:', emailConfig.to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail, transporter };