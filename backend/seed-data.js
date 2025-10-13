import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDatabase } from './src/config/database.js'
import User from './src/models/User.js'
import Course from './src/models/Course.js'
import Assignment from './src/models/Assignment.js'
import Discussion from './src/models/Discussion.js'
import LearningPath from './src/models/LearningPath.js'
import Certificate from './src/models/Certificate.js'
import Notification from './src/models/Notification.js'
import { logger } from './src/utils/logger.js'

const seedData = async () => {
  try {
    await connectDatabase()
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await User.deleteMany({})
    await Course.deleteMany({})
    await Assignment.deleteMany({})
    await Discussion.deleteMany({})
    await LearningPath.deleteMany({})
    await Certificate.deleteMany({})
    await Notification.deleteMany({})

    // Create users
    console.log('👥 Creating users...')
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const users = await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@eduplatform.com',
        password: hashedPassword,
        role: 'admin',
        isEmailVerified: true,
        profile: {
          bio: 'Platform administrator with full access to all features.',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          phone: '+1-555-0101',
          dateOfBirth: new Date('1985-01-15'),
          location: 'San Francisco, CA'
        }
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@eduplatform.com',
        password: hashedPassword,
        role: 'instructor',
        isEmailVerified: true,
        profile: {
          bio: 'Computer Science professor with 10+ years of experience in web development and machine learning.',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
          phone: '+1-555-0102',
          dateOfBirth: new Date('1980-03-22'),
          location: 'Boston, MA',
          expertise: ['JavaScript', 'Python', 'Machine Learning', 'Web Development'],
          education: 'PhD in Computer Science, MIT'
        }
      },
      {
        name: 'Prof. Michael Chen',
        email: 'michael.chen@eduplatform.com',
        password: hashedPassword,
        role: 'instructor',
        isEmailVerified: true,
        profile: {
          bio: 'Data Science expert and researcher specializing in AI and analytics.',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          phone: '+1-555-0103',
          dateOfBirth: new Date('1978-07-10'),
          location: 'Seattle, WA',
          expertise: ['Data Science', 'Python', 'R', 'Statistics', 'AI'],
          education: 'PhD in Statistics, Stanford University'
        }
      },
      {
        name: 'Alice Smith',
        email: 'alice.smith@student.com',
        password: hashedPassword,
        role: 'student',
        isEmailVerified: true,
        profile: {
          bio: 'Aspiring web developer passionate about creating amazing user experiences.',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
          phone: '+1-555-0201',
          dateOfBirth: new Date('1995-05-18'),
          location: 'New York, NY'
        }
      },
      {
        name: 'Bob Wilson',
        email: 'bob.wilson@student.com',
        password: hashedPassword,
        role: 'student',
        isEmailVerified: true,
        profile: {
          bio: 'Computer science student interested in machine learning and data analysis.',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
          phone: '+1-555-0202',
          dateOfBirth: new Date('1997-11-03'),
          location: 'Austin, TX'
        }
      },
      {
        name: 'Emma Davis',
        email: 'emma.davis@student.com',
        password: hashedPassword,
        role: 'student',
        isEmailVerified: true,
        profile: {
          bio: 'Marketing professional looking to expand skills in digital marketing and analytics.',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
          phone: '+1-555-0203',
          dateOfBirth: new Date('1992-09-14'),
          location: 'Los Angeles, CA'
        }
      }
    ])

    const [admin, instructor1, instructor2, student1, student2, student3] = users

    // Create courses
    console.log('📚 Creating courses...')
    const courses = await Course.insertMany([
      {
        title: 'Complete JavaScript Mastery',
        description: 'Master JavaScript from basics to advanced concepts including ES6+, async programming, and modern frameworks.',
        instructor: instructor1._id,
        category: 'programming',
        level: 'beginner',
        pricing: {
          type: 'free',
          price: 0
        },
        duration: 40,
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400'
        },
        tags: ['JavaScript', 'Web Development', 'Programming', 'ES6'],
        isPublished: true,
        syllabus: [
          {
            title: 'JavaScript Fundamentals',
            description: 'Variables, data types, functions, and control structures',
            duration: 8,
            order: 1
          },
          {
            title: 'DOM Manipulation',
            description: 'Working with the Document Object Model',
            duration: 6,
            order: 2
          },
          {
            title: 'Asynchronous JavaScript',
            description: 'Promises, async/await, and API calls',
            duration: 8,
            order: 3
          },
          {
            title: 'Modern JavaScript (ES6+)',
            description: 'Arrow functions, destructuring, modules, and more',
            duration: 10,
            order: 4
          },
          {
            title: 'JavaScript Projects',
            description: 'Build real-world applications',
            duration: 8,
            order: 5
          }
        ],
        requirements: ['Basic computer skills', 'Text editor installed'],
        learningOutcomes: [
          'Build interactive web applications',
          'Understand modern JavaScript concepts',
          'Work with APIs and asynchronous code',
          'Create responsive user interfaces'
        ]
      },
      {
        title: 'Python for Data Science',
        description: 'Learn Python programming specifically for data analysis, visualization, and machine learning.',
        instructor: instructor2._id,
        category: 'data-science',
        level: 'intermediate',
        pricing: {
          type: 'free',
          price: 0
        },
        duration: 50,
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400'
        },
        tags: ['Python', 'Data Science', 'Machine Learning', 'Analytics'],
        isPublished: true,
        syllabus: [
          {
            title: 'Python Basics for Data Science',
            description: 'Python fundamentals and data structures',
            duration: 10,
            order: 1
          },
          {
            title: 'NumPy and Pandas',
            description: 'Data manipulation and analysis libraries',
            duration: 12,
            order: 2
          },
          {
            title: 'Data Visualization',
            description: 'Matplotlib, Seaborn, and Plotly',
            duration: 8,
            order: 3
          },
          {
            title: 'Statistical Analysis',
            description: 'Descriptive and inferential statistics',
            duration: 10,
            order: 4
          },
          {
            title: 'Machine Learning Basics',
            description: 'Scikit-learn and basic ML algorithms',
            duration: 10,
            order: 5
          }
        ],
        requirements: ['Basic programming knowledge', 'High school mathematics'],
        learningOutcomes: [
          'Analyze and visualize data effectively',
          'Build predictive models',
          'Use Python data science libraries',
          'Perform statistical analysis'
        ]
      },
      {
        title: 'React.js Complete Guide',
        description: 'Build modern web applications with React.js, including hooks, context, and state management.',
        instructor: instructor1._id,
        category: 'programming',
        level: 'intermediate',
        pricing: {
          type: 'free',
          price: 0
        },
        duration: 45,
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400'
        },
        tags: ['React', 'JavaScript', 'Web Development', 'Frontend'],
        isPublished: true,
        syllabus: [
          {
            title: 'React Fundamentals',
            description: 'Components, JSX, and props',
            duration: 10,
            order: 1
          },
          {
            title: 'State and Event Handling',
            description: 'Managing component state and user interactions',
            duration: 8,
            order: 2
          },
          {
            title: 'React Hooks',
            description: 'useState, useEffect, and custom hooks',
            duration: 10,
            order: 3
          },
          {
            title: 'Context and State Management',
            description: 'Global state management with Context API',
            duration: 8,
            order: 4
          },
          {
            title: 'React Router and Deployment',
            description: 'Navigation and deploying React apps',
            duration: 9,
            order: 5
          }
        ],
        requirements: ['JavaScript knowledge', 'HTML/CSS basics'],
        learningOutcomes: [
          'Build complex React applications',
          'Manage application state effectively',
          'Implement routing and navigation',
          'Deploy React applications'
        ]
      },
      {
        title: 'Digital Marketing Fundamentals',
        description: 'Comprehensive guide to digital marketing including SEO, social media, and analytics.',
        instructor: instructor1._id,
        category: 'marketing',
        level: 'beginner',
        pricing: {
          type: 'free',
          price: 0
        },
        duration: 30,
        media: {
          thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
        },
        tags: ['Digital Marketing', 'SEO', 'Social Media', 'Analytics'],
        isPublished: true,
        syllabus: [
          {
            title: 'Digital Marketing Overview',
            description: 'Introduction to digital marketing channels',
            duration: 6,
            order: 1
          },
          {
            title: 'Search Engine Optimization',
            description: 'SEO strategies and best practices',
            duration: 8,
            order: 2
          },
          {
            title: 'Social Media Marketing',
            description: 'Platform-specific marketing strategies',
            duration: 8,
            order: 3
          },
          {
            title: 'Content Marketing',
            description: 'Creating and distributing valuable content',
            duration: 4,
            order: 4
          },
          {
            title: 'Analytics and Measurement',
            description: 'Tracking and analyzing marketing performance',
            duration: 4,
            order: 5
          }
        ],
        requirements: ['Basic computer skills', 'Interest in marketing'],
        learningOutcomes: [
          'Develop digital marketing strategies',
          'Optimize websites for search engines',
          'Create effective social media campaigns',
          'Measure marketing performance'
        ]
      }
    ])

    // Enroll students in courses
    console.log('📝 Enrolling students in courses...')
    await Course.findByIdAndUpdate(courses[0]._id, {
      $push: {
        enrolledStudents: {
          $each: [
            { studentId: student1._id, enrolledAt: new Date(), progress: 25 },
            { studentId: student2._id, enrolledAt: new Date(), progress: 60 },
            { studentId: student3._id, enrolledAt: new Date(), progress: 10 }
          ]
        }
      }
    })

    await Course.findByIdAndUpdate(courses[1]._id, {
      $push: {
        enrolledStudents: {
          $each: [
            { studentId: student2._id, enrolledAt: new Date(), progress: 40 },
            { studentId: student3._id, enrolledAt: new Date(), progress: 15 }
          ]
        }
      }
    })

    await Course.findByIdAndUpdate(courses[2]._id, {
      $push: {
        enrolledStudents: {
          $each: [
            { studentId: student1._id, enrolledAt: new Date(), progress: 80 }
          ]
        }
      }
    })

    // Create assignments
    console.log('📋 Creating assignments...')
    const assignments = await Assignment.insertMany([
      {
        title: 'JavaScript Calculator Project',
        description: 'Build a functional calculator using vanilla JavaScript with proper error handling and user interface.',
        courseId: courses[0]._id,
        instructorId: instructor1._id,
        type: 'project',
        instructions: 'Create a calculator that can perform basic arithmetic operations. Include proper styling and error handling for invalid inputs.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxPoints: 100,
        isPublished: true,
        allowLateSubmission: true,
        latePenalty: 10,
        submissionFormat: {
          allowedFileTypes: ['html', 'css', 'js', 'zip'],
          maxFiles: 5,
          maxFileSize: 10 * 1024 * 1024 // 10MB
        },
        rubric: [
          {
            criteria: 'Functionality',
            description: 'Calculator performs all required operations correctly',
            maxPoints: 40
          },
          {
            criteria: 'Code Quality',
            description: 'Clean, well-commented, and organized code',
            maxPoints: 30
          },
          {
            criteria: 'User Interface',
            description: 'Attractive and user-friendly design',
            maxPoints: 20
          },
          {
            criteria: 'Error Handling',
            description: 'Proper handling of edge cases and invalid inputs',
            maxPoints: 10
          }
        ]
      },
      {
        title: 'Data Analysis Report',
        description: 'Analyze a provided dataset and create a comprehensive report with visualizations.',
        courseId: courses[1]._id,
        instructorId: instructor2._id,
        type: 'file_upload',
        instructions: 'Use the provided sales dataset to perform exploratory data analysis. Include at least 5 different visualizations and provide insights about the data trends.',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        maxPoints: 150,
        isPublished: true,
        allowLateSubmission: false,
        submissionFormat: {
          allowedFileTypes: ['pdf', 'ipynb', 'py'],
          maxFiles: 3,
          maxFileSize: 20 * 1024 * 1024 // 20MB
        },
        rubric: [
          {
            criteria: 'Data Exploration',
            description: 'Thorough exploration of the dataset',
            maxPoints: 40
          },
          {
            criteria: 'Visualizations',
            description: 'Quality and variety of data visualizations',
            maxPoints: 50
          },
          {
            criteria: 'Insights and Analysis',
            description: 'Meaningful insights derived from the data',
            maxPoints: 40
          },
          {
            criteria: 'Report Quality',
            description: 'Clear writing and professional presentation',
            maxPoints: 20
          }
        ]
      },
      {
        title: 'React Todo Application',
        description: 'Build a complete todo application using React with CRUD operations and local storage.',
        courseId: courses[2]._id,
        instructorId: instructor1._id,
        type: 'project',
        instructions: 'Create a todo app that allows users to add, edit, delete, and mark tasks as complete. Implement local storage to persist data between sessions.',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        maxPoints: 120,
        isPublished: true,
        allowLateSubmission: true,
        latePenalty: 5,
        submissionFormat: {
          allowedFileTypes: ['js', 'jsx', 'css', 'json', 'zip'],
          maxFiles: 10,
          maxFileSize: 15 * 1024 * 1024 // 15MB
        }
      }
    ])

    // Create discussions
    console.log('💬 Creating discussions...')
    const discussions = await Discussion.insertMany([
      {
        title: 'Best Practices for JavaScript Code Organization',
        description: 'What are your favorite techniques for keeping JavaScript code clean and maintainable?',
        courseId: courses[0]._id,
        createdBy: student1._id,
        type: 'question',
        category: 'general',
        tags: ['javascript', 'best-practices', 'code-organization'],
        isAnonymous: false,
        visibility: 'public'
      },
      {
        title: 'Debugging Async/Await Issues',
        description: 'I\'m having trouble with async/await in my project. The promises seem to resolve but the data isn\'t updating in the UI. Any suggestions?',
        courseId: courses[0]._id,
        createdBy: student2._id,
        type: 'question',
        category: 'technical_help',
        tags: ['javascript', 'async-await', 'debugging'],
        isAnonymous: false,
        visibility: 'public'
      },
      {
        title: 'Recommended Python Libraries for Data Visualization',
        description: 'Beyond matplotlib and seaborn, what other Python libraries do you recommend for creating interactive visualizations?',
        courseId: courses[1]._id,
        createdBy: student3._id,
        type: 'question',
        category: 'general',
        tags: ['python', 'data-visualization', 'libraries'],
        isAnonymous: false,
        visibility: 'public'
      },
      {
        title: 'Course Announcement: New Resources Added',
        description: 'I\'ve added new practice datasets and example notebooks to the course materials. Check them out in the resources section!',
        courseId: courses[1]._id,
        createdBy: instructor2._id,
        type: 'announcement',
        category: 'general',
        tags: ['announcement', 'resources'],
        isAnonymous: false,
        visibility: 'public',
        isPinned: true
      },
      {
        title: 'React Hooks vs Class Components',
        description: 'What are the main advantages of using React hooks over class components? When would you still choose class components?',
        courseId: courses[2]._id,
        createdBy: student1._id,
        type: 'question',
        category: 'general',
        tags: ['react', 'hooks', 'components'],
        isAnonymous: false,
        visibility: 'public'
      }
    ])

    // Create learning paths
    console.log('🛤️  Creating learning paths...')
    const learningPaths = await LearningPath.insertMany([
      {
        title: 'Full Stack Web Developer',
        description: 'Complete path to become a full stack web developer, covering both frontend and backend technologies.',
        category: 'programming',
        difficulty: 'intermediate',
        courses: [
          { courseId: courses[0]._id, order: 1, isRequired: true },
          { courseId: courses[2]._id, order: 2, isRequired: true }
        ],
        createdBy: instructor1._id,
        estimatedDuration: 85,
        prerequisites: ['Basic HTML/CSS knowledge', 'Computer literacy'],
        learningObjectives: [
          'Build complete web applications',
          'Master frontend and backend development',
          'Deploy applications to production',
          'Work with databases and APIs'
        ],
        tags: ['web-development', 'javascript', 'react', 'full-stack'],
        isPublished: true
      },
      {
        title: 'Data Science Specialist',
        description: 'Comprehensive path for aspiring data scientists, from Python basics to advanced machine learning.',
        category: 'data_science',
        difficulty: 'intermediate',
        courses: [
          { courseId: courses[1]._id, order: 1, isRequired: true }
        ],
        createdBy: instructor2._id,
        estimatedDuration: 50,
        prerequisites: ['Basic mathematics', 'Statistical concepts'],
        learningObjectives: [
          'Analyze complex datasets',
          'Build predictive models',
          'Create data visualizations',
          'Apply statistical methods'
        ],
        tags: ['data-science', 'python', 'machine-learning', 'analytics'],
        isPublished: true
      },
      {
        title: 'Digital Marketing Professional',
        description: 'Complete digital marketing curriculum covering all major channels and strategies.',
        category: 'marketing',
        difficulty: 'beginner',
        courses: [
          { courseId: courses[3]._id, order: 1, isRequired: true }
        ],
        createdBy: instructor1._id,
        estimatedDuration: 30,
        prerequisites: ['Basic computer skills', 'Interest in marketing'],
        learningObjectives: [
          'Develop comprehensive marketing strategies',
          'Master digital marketing channels',
          'Analyze marketing performance',
          'Create engaging content'
        ],
        tags: ['digital-marketing', 'seo', 'social-media', 'analytics'],
        isPublished: true
      }
    ])

    // Enroll students in learning paths
    console.log('🎯 Enrolling students in learning paths...')
    await LearningPath.findByIdAndUpdate(learningPaths[0]._id, {
      $push: {
        enrollments: {
          $each: [
            { 
              userId: student1._id, 
              enrolledAt: new Date(),
              completedCourses: [{ courseId: courses[0]._id, completedAt: new Date() }]
            },
            { 
              userId: student2._id, 
              enrolledAt: new Date(),
              completedCourses: []
            }
          ]
        }
      }
    })

    await LearningPath.findByIdAndUpdate(learningPaths[1]._id, {
      $push: {
        enrollments: {
          userId: student2._id,
          enrolledAt: new Date(),
          completedCourses: []
        }
      }
    })

    // Create certificates
    console.log('🏆 Creating certificates...')
    const certificates = await Certificate.insertMany([
      {
        userId: student1._id,
        type: 'course_completion',
        courseId: courses[0]._id,
        title: 'JavaScript Mastery Certificate',
        description: 'Successfully completed the Complete JavaScript Mastery course with excellent performance.',
        issuedBy: instructor1._id,
        certificateNumber: 'CERT-JS-001-2024',
        issuedAt: new Date(),
        status: 'issued'
      },
      {
        userId: student1._id,
        type: 'learning_path_completion',
        learningPathId: learningPaths[0]._id,
        title: 'Full Stack Web Developer Certificate',
        description: 'Successfully completed the Full Stack Web Developer learning path.',
        issuedBy: admin._id,
        certificateNumber: 'CERT-FS-001-2024',
        issuedAt: new Date(),
        status: 'issued'
      }
    ])

    // Create notifications
    console.log('🔔 Creating notifications...')
    await Notification.insertMany([
      {
        userId: student1._id,
        type: 'assignment',
        title: 'New Assignment Available',
        message: 'A new assignment "JavaScript Calculator Project" has been posted in Complete JavaScript Mastery.',
        priority: 'medium',
        actionUrl: `/assignments/${assignments[0]._id}`,
        metadata: {
          courseId: courses[0]._id,
          assignmentId: assignments[0]._id
        }
      },
      {
        userId: student2._id,
        type: 'assignment',
        title: 'Assignment Due Soon',
        message: 'Your assignment "Data Analysis Report" is due in 3 days.',
        priority: 'high',
        actionUrl: `/assignments/${assignments[1]._id}`,
        metadata: {
          courseId: courses[1]._id,
          assignmentId: assignments[1]._id
        }
      },
      {
        userId: student1._id,
        type: 'certificate',
        title: 'Certificate Issued',
        message: 'Congratulations! Your JavaScript Mastery certificate has been issued.',
        priority: 'high',
        actionUrl: `/certificates/${certificates[0]._id}`,
        metadata: {
          certificateId: certificates[0]._id
        },
        status: 'read'
      },
      {
        userId: student3._id,
        type: 'course',
        title: 'Welcome to Digital Marketing Fundamentals',
        message: 'Welcome to the course! Start with the first module to begin your learning journey.',
        priority: 'medium',
        actionUrl: `/courses/${courses[3]._id}`,
        metadata: {
          courseId: courses[3]._id
        }
      }
    ])

    console.log('✅ Seed data created successfully!')
    console.log('\n📊 Summary:')
    console.log(`👥 Users: ${users.length}`)
    console.log(`📚 Courses: ${courses.length}`)
    console.log(`📋 Assignments: ${assignments.length}`)
    console.log(`💬 Discussions: ${discussions.length}`)
    console.log(`🛤️  Learning Paths: ${learningPaths.length}`)
    console.log(`🏆 Certificates: ${certificates.length}`)
    console.log('\n🔑 Login Credentials:')
    console.log('Admin: admin@eduplatform.com / password123')
    console.log('Instructor 1: sarah.johnson@eduplatform.com / password123')
    console.log('Instructor 2: michael.chen@eduplatform.com / password123')
    console.log('Student 1: alice.smith@student.com / password123')
    console.log('Student 2: bob.wilson@student.com / password123')
    console.log('Student 3: emma.davis@student.com / password123')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

// Run the seed function
seedData()