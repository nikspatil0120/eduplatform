import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDatabase } from './src/config/database.js'
import User from './src/models/User.js'

const createAdminUsers = async () => {
  try {
    console.log('🔌 Connecting to database...')
    await connectDatabase()
    
    const adminUsers = [
      {
        name: 'Super Admin',
        email: 'superadmin@kiro.edu',
        password: 'admin123',
        role: 'admin',
        bio: 'Platform super administrator with full access to all features.'
      },
      {
        name: 'Moderator',
        email: 'moderator@kiro.edu', 
        password: 'mod123',
        role: 'admin', // Using admin role for now, can be changed to 'moderator' if that role exists
        bio: 'Platform moderator with access to content moderation features.'
      }
    ]
    
    for (const userData of adminUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email })
      
      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists!`)
        console.log(`👤 Role: ${existingUser.role}`)
        continue
      }
      
      // Create user
      console.log(`👤 Creating user: ${userData.email}...`)
      
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: userData.password, // Let the pre-save hook handle hashing
        role: userData.role,
        isEmailVerified: true,
        isActive: true,
        profile: {
          bio: userData.bio,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          phone: '+1-555-0100',
          dateOfBirth: new Date('1980-01-01'),
          location: 'Admin Office'
        },
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          theme: 'light',
          language: 'en'
        }
      })
      
      await user.save()
      console.log(`✅ User ${userData.email} created successfully!`)
    }
    
    console.log('')
    console.log('🎉 Admin users setup complete!')
    console.log('')
    console.log('📋 Login Credentials:')
    console.log('┌─────────────────────────────────────────┐')
    console.log('│ SUPER ADMIN                             │')
    console.log('│ Email: superadmin@kiro.edu              │')
    console.log('│ Password: admin123                      │')
    console.log('├─────────────────────────────────────────┤')
    console.log('│ MODERATOR                               │')
    console.log('│ Email: moderator@kiro.edu               │')
    console.log('│ Password: mod123                        │')
    console.log('└─────────────────────────────────────────┘')
    console.log('')
    console.log('🚀 Access the admin portal at: http://localhost:3000/admin')
    
  } catch (error) {
    console.error('❌ Error creating admin users:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

createAdminUsers()