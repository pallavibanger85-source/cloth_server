import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

// Verify transporter connection
export const verifyTransporter = async () => {
    try {
        await transporter.verify()
        console.log('✅ Email transporter is ready')
        return true
    } catch (error) {
        console.error('❌ Email transporter error:', error)
        return false
    }
}

// Send verification email
export const sendVerificationEmail = async (email, name, otp) => {
    try {
        const info = await transporter.sendMail({
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
                    <p style="font-size: 14px; color: #777;">This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #777;">If you didn't request this verification, please ignore this email.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #999; text-align: center;">Best regards,<br>E-Commerce Team</p>
                </div>
            `
        })
        return { success: true, messageId: info.messageId }
    } catch (err) {
        console.error('Email sending error:', err)
        return { success: false, error: err.message }
    }
}

// Send forgot password email
export const sendForgotPasswordEmail = async (email, name, otp) => {
    try {
        const info = await transporter.sendMail({
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
                    <p style="font-size: 14px; color: #777;">This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #777;">If you didn't request this, please ignore this email and secure your account.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #999; text-align: center;">Best regards,<br>E-Commerce Team</p>
                </div>
            `
        })
        return { success: true, messageId: info.messageId }
    } catch (err) {
        console.error('Email sending error:', err)
        return { success: false, error: err.message }
    }
}

// Send welcome email after verification
export const sendWelcomeEmail = async (email, name) => {
    try {
        const info = await transporter.sendMail({
            from: `"E-Commerce Team" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Welcome to Our E-Commerce Platform!",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Welcome Aboard! 🎉</h2>
                    <p style="font-size: 16px; color: #555;">Hello <strong>${name}</strong>,</p>
                    <p style="font-size: 16px; color: #555;">Your email has been successfully verified. Welcome to our E-Commerce platform!</p>
                    <p style="font-size: 16px; color: #555;">You can now:</p>
                    <ul style="font-size: 16px; color: #555; padding-left: 20px;">
                        <li>Browse our products</li>
                        <li>Add items to your cart</li>
                        <li>Place orders</li>
                        <li>Track your orders</li>
                    </ul>
                    <p style="font-size: 16px; color: #555;">We're excited to have you on board!</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #999; text-align: center;">Happy Shopping!<br>E-Commerce Team</p>
                </div>
            `
        })
        return { success: true, messageId: info.messageId }
    } catch (err) {
        console.error('Welcome email sending error:', err)
        return { success: false, error: err.message }
    }
}

// Send order confirmation email
export const sendOrderConfirmationEmail = async (email, name, orderId, items, total) => {
    try {
        let itemsHtml = ''
        items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `
        })

        const info = await transporter.sendMail({
            from: `"E-Commerce Team" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order Confirmation #${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
                    <p style="font-size: 16px; color: #555;">Hello <strong>${name}</strong>,</p>
                    <p style="font-size: 16px; color: #555;">Thank you for your order! Here are the details:</p>
                    <p style="font-size: 14px; color: #777;"><strong>Order ID:</strong> #${orderId}</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f4f4f4;">
                                <th style="padding: 10px; text-align: left;">Product</th>
                                <th style="padding: 10px; text-align: center;">Quantity</th>
                                <th style="padding: 10px; text-align: right;">Price</th>
                                <th style="padding: 10px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total Amount:</td>
                                <td style="padding: 10px; text-align: right; font-weight: bold; color: #2c3e50;">$${total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #999; text-align: center;">Thank you for shopping with us!<br>E-Commerce Team</p>
                </div>
            `
        })
        return { success: true, messageId: info.messageId }
    } catch (err) {
        console.error('Order confirmation email error:', err)
        return { success: false, error: err.message }
    }
}