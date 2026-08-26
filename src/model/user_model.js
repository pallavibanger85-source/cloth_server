import mongoose from 'mongoose'
import {ValidName, ValidEmail, ValidPassword, ValidGender} from '../validation/validation.js'
const userSchema = mongoose.Schema({
    profile_img: { type: Object, default: null },
    first_name: { type: String, required: true,validate : [ValidName, "Name is invalid"] },
    last_name: { type: String, required: true ,validate : [ValidName, "Name is invalid"]},
    gender: { type: String, required: true, enum: ['male', 'female', 'other'], validate : [ValidGender,"gender is invalid"] },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    email: { type: String, required: true, unique: true, lowercase: true , validate : [ValidEmail, "email is invalid"]},
    password: { type: String, required: true, validate : [ValidPassword, "password is invalid"] },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
    address_list: { type: Array, default: [] },
    is_address_list: { type: Boolean, default: false },
    verification: {
        user: {
            is_verified: { type: Boolean, default: false },
            otp: { type: String, default: null },
            otp_expiry: { type: Number, default: null },
            otp_attempts: { type: Number, default: 0 },
            lock_until: { type: Number, default: null },
            lock_count: { type: Number, default: 0 },
        },
        admin: {
            is_verified: { type: Boolean, default: false },
            otp: { type: String, default: null },
            otp_expiry: { type: Number, default: null },
        }
    },
    order_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'order' }],
    cart_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'order' }]
}, {
    timestamps: true
})

export const user_model = mongoose.model('user', userSchema)