import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import router from './routes/routes.js'

dotenv.config({quiet:true})

const app = express()
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}, }))

app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({
    extended: true,
    limit: '10kb'
}))

const limiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' }
})

app.use(limiter)
app.use('/api', router)
const PORT = process.env.PORT || 8080

mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log('mongodb connected'))
.catch((error)=>console.log('mongodb not connected'))
app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`) })