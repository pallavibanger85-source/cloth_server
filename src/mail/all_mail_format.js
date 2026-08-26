import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config({quiet : true})

// Create transporter with better configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        // Add these options to prevent timeout issues
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        // For Gmail specifically
        tls: {
            rejectUnauthorized: false
        }
    })
}

let transporter = createTransporter()

// Verify transporter connection with retry
export const verifyTransporter = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            transporter.verify()
            console.log('✅ Email transporter is ready')
            return true
        } catch (error) {
            console.log(`⚠️ Email verification attempt ${i + 1} failed:`, error.message)
            if (i === retries - 1) {
                console.error('❌ All email verification attempts failed')
                return false
            }
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
            // Recreate transporter
            transporter = createTransporter()
        }
    }
    return false
}

// Send verification email with timeout handling
export const sendVerificationEmail = async (email, name, otp) => {
    try {
        // Verify transporter first
        const isVerified = await verifyTransporter(1)
        if (!isVerified) {
            console.log('⚠️ Transporter not verified, attempting to send anyway...')
        }

        const mailOptions = {
            from: `"E-Commerce Team" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Verify Your Email Address",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Email Verification</h2>
                    <p style="font-size: 16px; color: #555;">Hello <strong>${name}</strong>,</p>
                    <p style="font-size: 16px; color: #555;">Thank you for registering with our E-Commerce platform. Please use the following OTP to verify your email address:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 25px 0; border-radius: 8px; color: #2c3e50;">
                        ${otp}
                    </div>
                    <p style="font-size: 14px; color: #777;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #777;">If you didn't request this verification, please ignore this email.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #999; text-align: center;">Best regards,<br>E-Commerce Team</p>
                </div>
            `
        }

        const info = await transporter.sendMail(mailOptions)
        console.log(`✅ Verification email sent to ${email}`)
        return { success: true, messageId: info.messageId }
        
    } catch (err) {
        console.error('❌ Email sending error:', err.message)
        
        // Try with alternative configuration
        try {
            console.log('🔄 Attempting to send with alternative configuration...')
            const altTransporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false
                }
            })
            
            const mailOptions = {
                from: `"E-Commerce Team" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Verify Your Email Address",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #333; text-align: center;">Email Verification</h2>
                        <p style="font-size: 16px; color: #555;">Hello <strong>${name}</strong>,</p>
                        <p style="font-size: 16px; color: #555;">Your verification OTP is: <strong>${otp}</strong></p>
                        <p style="font-size: 14px; color: #777;">This OTP is valid for 5 minutes.</p>
                    </div>
                `
            }
            
            const info = await altTransporter.sendMail(mailOptions)
            console.log(`✅ Verification email sent via alternative config to ${email}`)
            return { success: true, messageId: info.messageId }
            
        } catch (altErr) {
            console.error('❌ Alternative email sending also failed:', altErr.message)
            return { 
                success: false, 
                error: err.message,
                details: 'Please check your SMTP configuration'
            }
        }
    }
}

// Send forgot password email
export const sendForgotPasswordEmail = async (email, name, otp) => {
    try {
        const mailOptions = {
            from: `"E-Commerce Team" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Password Reset OTP",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                    <p style="font-size: 16px; color: #555;">Hello <strong>${name}</strong>,</p>
                    <p style="font-size: 16px; color: #555;">We received a request to reset your password. Please use the following OTP to proceed:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 25px 0; border-radius: 8px; color: #2c3e50;">
                        ${otp}
                    </div>
                    <p style="font-size: 14px; color: #777;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #777;">If you didn't request this, please ignore this email and secure your account.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #999; text-align: center;">Best regards,<br>E-Commerce Team</p>
                </div>
            `
        }

        const info = await transporter.sendMail(mailOptions)
        console.log(`✅ Password reset email sent to ${email}`)
        return { success: true, messageId: info.messageId }
        
    } catch (err) {
        console.error('❌ Password reset email error:', err.message)
        return { success: false, error: err.message }
    }
}

// Test email configuration
export const testEmailConfig = async () => {
    try {
        const testTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000,
        })
        
        await testTransporter.verify()
        console.log('✅ Email configuration is valid')
        return true
    } catch (error) {
        console.error('❌ Email configuration invalid:', error.message)
        return false
    }
}