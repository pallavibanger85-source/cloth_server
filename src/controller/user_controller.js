import { user_model } from '../model/user_model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { generateOTP, checkAccountLock, handleFailedOTP, resetOTPAttempts } from '../services/otpService.js'
import { sendVerificationEmail, sendForgotPasswordEmail } from '../services/emailService.js'
import dotenv from 'dotenv'
import { allError } from '../middleware/errorhandling.js'

dotenv.config({quiet : true})

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'
const OTP_EXPIRY = 5 * 60 * 1000 // 5 minutes in milliseconds

// Helper function to generate JWT
export const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_SECRET, 
        { expiresIn: '24h' }
    )
}

// Create Account
export const createAccount = async (req, res) => {
    try {
        const { first_name, last_name, gender, email, password } = req.body

        // Validate required fields
        if (!first_name || !last_name || !gender || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' })
        }

        // Check if user already exists
        const existingUser = await user_model.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate OTP
        const otp = generateOTP()
        const otpExpiry = Date.now() + OTP_EXPIRY

        // Create user
        const user = new user_model({
            first_name,
            last_name,
            gender,
            email,
            password: hashedPassword,
            role: 'user',
            verification: {
                user: {
                    is_verified: false,
                    otp: otp,
                    otp_expiry: otpExpiry,
                    otp_attempts: 0,
                    lock_until: null,
                    lock_count: 0
                }
            }
        })

        await user.save()

        // Send OTP email
        const emailResult = await sendVerificationEmail(email, first_name, otp)

        if (!emailResult.success) {
            return res.status(500).json({ error: 'Failed to send OTP email' })
        }

        res.status(201).json({
            message: 'Account created successfully. Please verify your email.',
            userId: user._id,
            email: user.email
        })

    } catch (error) {allError (error,res)}
}

// Verify OTP
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' })
        }

        const user = await user_model.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Check if already verified
        if (user.verification.user.is_verified) {
            return res.status(400).json({ error: 'Email already verified' })
        }

        // Check account lock
        const lockStatus = await checkAccountLock(user)
        if (lockStatus.isLocked) {
            return res.status(423).json({ error: lockStatus.message })
        }

        // Check OTP expiry
        if (Date.now() > user.verification.user.otp_expiry) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' })
        }

        // Verify OTP
        if (user.verification.user.otp != otp) {
            const result = await handleFailedOTP(user)
            return res.status(400).json({ error: result.message })
        }

        // OTP is correct - verify user
        user.verification.user.is_verified = true
        user.verification.user.otp = null
        user.verification.user.otp_expiry = null
        await resetOTPAttempts(user)
        await user.save()

        // Generate token
        const token = generateToken(user)

        res.status(200).json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        })

    } 
        catch (error) {allError (error,res)}

}

// Resend OTP
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: 'Email is required' })
        }

        const user = await user_model.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Check if already verified
        if (user.verification.user.is_verified) {
            return res.status(400).json({ error: 'Email already verified' })
        }

        // Check account lock
        const lockStatus = await checkAccountLock(user)
        if (lockStatus.isLocked) {
            return res.status(423).json({ error: lockStatus.message })
        }

        // Generate new OTP
        const otp = generateOTP()
        const otpExpiry = Date.now() + OTP_EXPIRY

        user.verification.user.otp = otp
        user.verification.user.otp_expiry = otpExpiry
        await resetOTPAttempts(user)
        await user.save()

        // Send new OTP email
        const emailResult = await sendVerificationEmail(email, user.first_name, otp)

        if (!emailResult.success) {
            return res.status(500).json({ error: 'Failed to send OTP email' })
        }

        res.status(200).json({
            message: 'New OTP sent successfully',
            email: user.email
        })

    } catch (error) {allError (error,res)}
}

// Login User
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        const user = await user_model.findOne({ email })
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Check if user is verified
        if (!user.verification.user.is_verified) {
            return res.status(401).json({ error: 'Please verify your email first' })
        }

        // Check if user is active
        if (!user.is_active || user.is_deleted) {
            return res.status(401).json({ error: 'Account is not active' })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Generate token
        const token = generateToken(user)

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                profile_img: user.profile_img
            }
        })

    } catch (error) {allError (error,res)}
}

// Update Profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId
        const { first_name, last_name, gender, profile_img, address_list } = req.body

        const user = await user_model.findById(userId)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Update fields
        if (first_name) user.first_name = first_name
        if (last_name) user.last_name = last_name
        if (gender) user.gender = gender
        if (profile_img) user.profile_img = profile_img
        if (address_list) {
            user.address_list = address_list
            user.is_address_list = address_list.length > 0
        }

        await user.save()

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                gender: user.gender,
                profile_img: user.profile_img,
                address_list: user.address_list
            }
        })

    }catch (error) {allError (error,res)}
}

// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: 'Email is required' })
        }

        const user = await user_model.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Check if user is active
        if (!user.is_active || user.is_deleted) {
            return res.status(401).json({ error: 'Account is not active' })
        }

        // Check account lock
        const lockStatus = await checkAccountLock(user)
        if (lockStatus.isLocked) {
            return res.status(423).json({ error: lockStatus.message })
        }

        // Generate OTP
        const otp = generateOTP()
        const otpExpiry = Date.now() + OTP_EXPIRY

        user.verification.user.otp = otp
        user.verification.user.otp_expiry = otpExpiry
        await resetOTPAttempts(user)
        await user.save()

        // Send password reset email
        const emailResult = await sendForgotPasswordEmail(email, user.first_name, otp)

        if (!emailResult.success) {
            return res.status(500).json({ error: 'Failed to send OTP email' })
        }

        res.status(200).json({
            message: 'Password reset OTP sent successfully',
            email: user.email
        })

    } catch (error) {allError (error,res)}
}

// Reset Password (After OTP Verification)
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, new_password } = req.body

        if (!email || !otp || !new_password) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' })
        }

        const user = await user_model.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Check account lock
        const lockStatus = await checkAccountLock(user)
        if (lockStatus.isLocked) {
            return res.status(423).json({ error: lockStatus.message })
        }

        // Check OTP expiry
        if (Date.now() > user.verification.user.otp_expiry) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' })
        }

        // Verify OTP
        if (user.verification.user.otp !== otp) {
            const result = await handleFailedOTP(user)
            return res.status(400).json({ error: result.message })
        }

        // Reset password
        const hashedPassword = await bcrypt.hash(new_password, 10)
        user.password = hashedPassword
        user.verification.user.otp = null
        user.verification.user.otp_expiry = null
        await resetOTPAttempts(user)
        await user.save()

        res.status(200).json({
            message: 'Password reset successfully'
        })

    } catch (error) {allError (error,res)}
}

// Get User Profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId

        const user = await user_model.findById(userId)
            .select('-password -verification.user.otp -verification.user.otp_expiry')
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        res.status(200).json({
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                gender: user.gender,
                role: user.role,
                profile_img: user.profile_img,
                address_list: user.address_list,
                is_active: user.is_active,
                is_verified: user.verification.user.is_verified,
                created_at: user.createdAt
            }
        })

    } catch (error) {allError (error,res)}
}