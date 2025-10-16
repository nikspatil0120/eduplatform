import emailjs from '@emailjs/browser'

class EmailService {
  constructor() {
    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    this.templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    this.initialized = false
  }

  initialize() {
    if (this.serviceId && this.templateId && this.publicKey) {
      emailjs.init(this.publicKey)
      this.initialized = true
      console.log('✅ EmailJS initialized successfully')
      return true
    } else {
      console.warn('⚠️ EmailJS configuration incomplete')
      return false
    }
  }

  async sendOTPEmail(email, otp, name = 'User') {
    try {
      if (!this.initialized && !this.initialize()) {
        throw new Error('EmailJS not configured')
      }

      const templateParams = {
        to_email: email,
        to_name: name,
        from_name: 'EduPlatform',
        reply_to: email,
        subject: `Your EduPlatform OTP: ${otp}`,
        otp: otp,
        message: `Your OTP for EduPlatform is: ${otp}. This code will expire in 10 minutes.`,
        // Common EmailJS template variables
        user_email: email,
        user_name: name,
        otp_code: otp
      }

      console.log('📧 Sending email via EmailJS...', { email, otp })
      console.log('📧 Template params:', templateParams)
      console.log('📧 Service config:', { 
        serviceId: this.serviceId, 
        templateId: this.templateId,
        publicKey: this.publicKey ? 'Set' : 'Missing'
      })

      // Try alternative EmailJS format
      const result = await emailjs.send(
        this.serviceId,
        this.templateId,
        {
          ...templateParams,
          // Ensure recipient is set
          to: email,
          email: email,
          recipient: email
        },
        {
          publicKey: this.publicKey
        }
      )

      console.log('✅ Email sent successfully via EmailJS:', result)
      return { success: true, result }

    } catch (error) {
      console.error('❌ EmailJS error:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new EmailService()