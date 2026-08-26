import crypto from 'crypto'

// Generate random 6-digit OTP
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString()
}

// Get lock duration based on attempt count
export const getLockDuration = (attemptCount) => {
    // Lock durations: 1 min, 5 min, 10 min, 30 min, 1 hour
    const lockDurations = {
        0: 0,        // No lock
        1: 60000,    // 1 minute
        2: 300000,   // 5 minutes
        3: 600000,   // 10 minutes
        4: 1800000,  // 30 minutes
        5: 3600000   // 1 hour
    }
    // If more than 5 attempts, keep increasing by 1 hour
    if (attemptCount > 5) {
        return attemptCount * 3600000 // attemptCount hours in milliseconds
    }
    return lockDurations[attemptCount] || 60000
}

// Check if account is locked
export const checkAccountLock = async (user) => {
    const currentTime = Date.now()
    const lockUntil = user.verification.user.lock_until
    
    if (lockUntil && currentTime < lockUntil) {
        const remainingMinutes = Math.ceil((lockUntil - currentTime) / 60000)
        return {
            isLocked: true,
            remainingMinutes: remainingMinutes,
            message: `Account is locked. Please try again after ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}.`
        }
    }
    
    // Reset lock if lock time has expired
    if (lockUntil && currentTime >= lockUntil) {
        user.verification.user.lock_until = null
        user.verification.user.lock_count = 0
        user.verification.user.otp_attempts = 0
        await user.save()
    }
    
    return { isLocked: false }
}

// Handle failed OTP attempt
export const handleFailedOTP = async (user) => {
    const maxAttempts = 3
    user.verification.user.otp_attempts += 1
    
    const attemptCount = user.verification.user.otp_attempts
    
    if (attemptCount >= maxAttempts) {
        const lockCount = (user.verification.user.lock_count || 0) + 1
        const lockDuration = getLockDuration(lockCount)
        const lockUntil = Date.now() + lockDuration
        
        user.verification.user.lock_until = lockUntil
        user.verification.user.lock_count = lockCount
        user.verification.user.otp_attempts = 0
        
        await user.save()
        
        const minutes = Math.ceil(lockDuration / 60000)
        return {
            isLocked: true,
            remainingMinutes: minutes,
            message: `Too many failed attempts. Account locked for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
        }
    }
    
    await user.save()
    return {
        isLocked: false,
        remainingAttempts: maxAttempts - attemptCount,
        message: `Invalid OTP. ${maxAttempts - attemptCount} attempts remaining.`
    }
}

// Reset OTP attempts
export const resetOTPAttempts = async (user) => {
    user.verification.user.otp_attempts = 0
    user.verification.user.lock_until = null
    user.verification.user.lock_count = 0
    await user.save()
}

// Check if OTP is expired
export const isOTPExpired = (otpExpiry) => {
    return Date.now() > otpExpiry
}

// Get remaining OTP time in minutes
export const getRemainingOTPTime = (otpExpiry) => {
    const remaining = Math.ceil((otpExpiry - Date.now()) / 60000)
    return remaining > 0 ? remaining : 0
}