import emailjs from '@emailjs/nodejs'
import nodemailer from 'nodemailer'
import { logger } from '../utils/logger.js'

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'emailjs'
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@eduplatform.com'
    this.fromName = process.env.FROM_NAME || 'EduPlatform'
    this.initialized = false
  }

  initialize() {
    if (this.provider === 'emailjs') {
      if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PUBLIC_KEY) {
        logger.info('✅ EmailJS service initialized')
      } else {
        logger.warn('⚠️ EmailJS configuration not complete')
      }
    } else if (this.provider === 'smtp') {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
      logger.info('✅ SMTP email service initialized')
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      this.initialize()
      this.initialized = true
    }
  }

  async sendEmail(options) {
    try {
      // Check if email is disabled for development
      if (process.env.EMAIL_ENABLED === 'false') {
        logger.info('📧 Email disabled for development - logging email content:')
        logger.info(`   To: ${options.to}`)
        logger.info(`   Subject: ${options.subject}`)
        
        // Extract OTP from template data if present
        if (options.template === 'emailVerification' && options.data?.otp) {
          logger.info(`   🔑 OTP CODE: ${options.data.otp}`)
          logger.info(`   ⚡ Use this OTP to complete authentication`)
        }
        
        return { success: true, message: 'Email logged (development mode)' }
      }

      await this.ensureInitialized()
      const { to, subject, template, data, html, text, attachments = [] } = options

      let emailContent = { html, text }

      // Generate content from template if provided and no direct HTML
      if (template && data && !html) {
        emailContent = this.generateEmailContent(template, data)
      }

      const emailData = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments
      }

      if (this.provider === 'emailjs') {
        await this.sendWithEmailJS(emailData)
      } else if (this.provider === 'smtp') {
        await this.sendWithSMTP(emailData)
      } else {
        throw new Error('No email provider configured')
      }

      logger.info(`📧 Email sent successfully to ${to}`)
      return { success: true }

    } catch (error) {
      logger.error('Failed to send email:', error)
      throw error
    }
  }

  async sendWithEmailJS(emailData) {
    try {
      // Extract OTP from HTML if present for logging
      const otpMatch = emailData.html?.match(/font-size: 32px[^>]*>(\d{6})</i)
      const otp = otpMatch ? otpMatch[1] : null

      const templateParams = {
        to_email: emailData.to,
        to_name: 'User',
        from_name: emailData.from.name || this.fromName,
        subject: emailData.subject,
        message: emailData.text || this.stripHtml(emailData.html),
        otp: otp,
        html_content: emailData.html
      }

      logger.info('🔧 EmailJS config:', {
        serviceId: process.env.EMAILJS_SERVICE_ID,
        templateId: process.env.EMAILJS_TEMPLATE_ID,
        publicKey: process.env.EMAILJS_PUBLIC_KEY ? 'Set' : 'Missing'
      })

      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID || 'template_default',
        templateParams,
        {
          publicKey: process.env.EMAILJS_PUBLIC_KEY,
        }
      )

      logger.info(`✅ Email sent successfully via EmailJS to ${emailData.to}`)
      if (otp) {
        logger.info(`   🔑 OTP CODE: ${otp}`)
      }
    } catch (error) {
      logger.error('EmailJS error:', error)
      
      // In development, log the email instead of failing
      if (process.env.NODE_ENV === 'development') {
        logger.warn('📧 EmailJS failed, logging email content instead:')
        logger.info(`   To: ${emailData.to}`)
        logger.info(`   Subject: ${emailData.subject}`)
        logger.info(`   From: ${emailData.from.email}`)
        
        // Extract OTP from HTML if present
        const otpMatch = emailData.html?.match(/font-size: 32px[^>]*>(\d{6})</i)
        if (otpMatch) {
          logger.info(`   🔑 OTP CODE: ${otpMatch[1]}`)
          logger.info(`   ⚡ Use this OTP to complete authentication`)
        }
        
        logger.info('✅ Email content logged successfully (development mode)')
        return // Don't throw error, just log the content
      }
      
      throw error
    }
  }

  stripHtml(html) {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }

  async sendWithSMTP(emailData) {
    try {
      await this.transporter.sendMail({
        from: `"${emailData.from.name}" <${emailData.from.email}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments
      })
    } catch (error) {
      logger.error('SMTP error:', error)
      throw error
    }
  }

  generateEmailContent(template, data) {
    const templates = {
      emailVerification: {
        subject: 'Verify Your Email - EduPlatform',
        html: this.getEmailVerificationHTML(data),
        text: this.getEmailVerificationText(data)
      },
      passwordReset: {
        subject: 'Password Reset - EduPlatform',
        html: this.getPasswordResetHTML(data),
        text: this.getPasswordResetText(data)
      },
      paymentConfirmation: {
        subject: 'Payment Confirmation - EduPlatform',
        html: this.getPaymentConfirmationHTML(data),
        text: this.getPaymentConfirmationText(data)
      },
      courseEnrollment: {
        subject: 'Course Enrollment Confirmation - EduPlatform',
        html: this.getCourseEnrollmentHTML(data),
        text: this.getCourseEnrollmentText(data)
      },
      subscriptionConfirmation: {
        subject: 'Subscription Confirmation - EduPlatform',
        html: this.getSubscriptionConfirmationHTML(data),
        text: this.getSubscriptionConfirmationText(data)
      },
      welcome: {
        subject: 'Welcome to EduPlatform!',
        html: this.getWelcomeHTML(data),
        text: this.getWelcomeText(data)
      }
    }

    return templates[template] || { html: '', text: '' }
  }

  getEmailVerificationHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 EduPlatform</h1>
            <h2>Verify Your Email Address</h2>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>Welcome to EduPlatform! Please verify your email address to complete your registration and start your learning journey.</p>
            <p style="text-align: center;">
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with EduPlatform, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 EduPlatform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  getEmailVerificationText(data) {
    return `
      Hi ${data.name},

      Welcome to EduPlatform! Please verify your email address to complete your registration.

      Verification Link: ${data.verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account with EduPlatform, please ignore this email.

      Best regards,
      The EduPlatform Team
    `
  }

  getPasswordResetHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>We received a request to reset your password for your EduPlatform account.</p>
            <p style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
            <p>This reset link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>© 2024 EduPlatform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  getPasswordResetText(data) {
    return `
      Hi ${data.name},

      We received a request to reset your password for your EduPlatform account.

      Reset Link: ${data.resetUrl}

      This link will expire in 1 hour for security reasons.

      If you didn't request a password reset, please ignore this email.

      Best regards,
      The EduPlatform Team
    `
  }

  getPaymentConfirmationHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .amount { font-size: 24px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>Your payment has been successfully processed!</p>
            <div class="amount">
              ${data.currency} $${data.amount}
            </div>
            <p><strong>Transaction ID:</strong> ${data.paymentIntentId}</p>
            <p>Thank you for your purchase. You can now access your content in your dashboard.</p>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 EduPlatform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  getPaymentConfirmationText(data) {
    return `
      Hi ${data.name},

      Your payment has been successfully processed!

      Amount: ${data.currency} $${data.amount}
      Transaction ID: ${data.paymentIntentId}

      Thank you for your purchase. You can now access your content in your dashboard.

      Best regards,
      The EduPlatform Team
    `
  }

  getCourseEnrollmentHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Enrollment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .course-title { font-size: 20px; font-weight: bold; color: #3b82f6; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to Your Course!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>Congratulations! You've successfully enrolled in:</p>
            <div class="course-title">${data.courseTitle}</div>
            <p>You can now start learning and access all course materials, including:</p>
            <ul>
              <li>📹 Video lessons</li>
              <li>📚 Course materials and resources</li>
              <li>🧪 Quizzes and assignments</li>
              <li>💬 Discussion forums</li>
              <li>🏆 Certificate upon completion</li>
            </ul>
            <p style="text-align: center;">
              <a href="${data.courseUrl}" class="button">Start Learning Now</a>
            </p>
            <p>Happy learning!</p>
          </div>
          <div class="footer">
            <p>© 2024 EduPlatform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  getCourseEnrollmentText(data) {
    return `
      Hi ${data.name},

      Congratulations! You've successfully enrolled in: ${data.courseTitle}

      You can now start learning and access all course materials.

      Start Learning: ${data.courseUrl}

      Happy learning!

      Best regards,
      The EduPlatform Team
    `
  }

  // Bulk email sending
  async sendBulkEmails(emails) {
    try {
      const results = await Promise.allSettled(
        emails.map(email => this.sendEmail(email))
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      logger.info(`📧 Bulk email results: ${successful} successful, ${failed} failed`)

      return {
        success: true,
        total: emails.length,
        successful,
        failed,
        results
      }

    } catch (error) {
      logger.error('Bulk email sending failed:', error)
      throw error
    }
  }

  // Send notification email to admins
  async sendAdminNotification(subject, message, data = {}) {
    try {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
      
      if (adminEmails.length === 0) {
        logger.warn('No admin emails configured for notifications')
        return
      }

      const emailPromises = adminEmails.map(email => 
        this.sendEmail({
          to: email.trim(),
          subject: `[EduPlatform Admin] ${subject}`,
          html: `
            <h2>${subject}</h2>
            <p>${message}</p>
            ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
          `,
          text: `${subject}\n\n${message}\n\n${data ? JSON.stringify(data, null, 2) : ''}`
        })
      )

      await Promise.all(emailPromises)
      logger.info('📧 Admin notification sent successfully')

    } catch (error) {
      logger.error('Failed to send admin notification:', error)
    }
  }
}

// Create singleton instance
const emailService = new EmailService()

export const sendEmail = (options) => emailService.sendEmail(options)
export const sendBulkEmails = (emails) => emailService.sendBulkEmails(emails)
export const sendAdminNotification = (subject, message, data) => emailService.sendAdminNotification(subject, message, data)

export default emailService