import express from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import {
    createAccount,
    verifyOTP,
    resendOTP,
    loginUser,
    updateProfile,
    forgotPassword,
    resetPassword,
    getProfile
} from '../controller/user_controller.js'
import { user_model } from '../model/user_model.js'

const router = express.Router()

// Public routes
router.post('/register', createAccount)
router.post('/verify-otp', verifyOTP)
router.post('/resend-otp', resendOTP)
router.post('/login', loginUser)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Protected routes
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)

// Admin routes
router.get('/admin/users', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const users = await user_model.find({ role: 'user' })
            .select('-password -verification.user.otp -verification.user.otp_expiry')
        res.status(200).json({ users })
    } catch (error) {
        console.error('Get users error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router