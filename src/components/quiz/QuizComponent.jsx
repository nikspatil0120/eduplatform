import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  RotateCcw,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'

const QuizComponent = ({ 
  quiz, 
  onComplete, 
  onProgress,
  allowRetake = true,
  timeLimit = null 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (timeLimit && timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeLimit, timeRemaining, isSubmitted])

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
    
    if (onProgress) {
      onProgress(Object.keys(answers).length + 1, quiz.questions.length)
    }
  }

  const handleSubmit = () => {
    const calculatedScore = calculateScore()
    setScore(calculatedScore)
    setIsSubmitted(true)
    setShowResults(true)
    
    if (onComplete) {
      onComplete({
        answers,
        score: calculatedScore,
        totalQuestions: quiz.questions.length,
        timeSpent: timeLimit ? timeLimit - timeRemaining : null
      })
    }
  }

  const calculateScore = () => {
    let correct = 0
    quiz.questions.forEach(question => {
      const userAnswer = answers[question.id]
      if (question.type === 'multiple-choice') {
        if (userAnswer === question.correctAnswer) correct++
      } else if (question.type === 'multiple-select') {
        const correctAnswers = question.correctAnswers || []
        const userAnswers = userAnswer || []
        if (JSON.stringify(correctAnswers.sort()) === JSON.stringify(userAnswers.sort())) {
          correct++
        }
      } else if (question.type === 'true-false') {
        if (userAnswer === question.correctAnswer) correct++
      }
    })
    return Math.round((correct / quiz.questions.length) * 100)
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
    setIsSubmitted(false)
    setScore(0)
    setTimeRemaining(timeLimit)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isAnswered = (questionId) => {
    return answers.hasOwnProperty(questionId)
  }

  const canProceed = () => {
    return isAnswered(quiz.questions[currentQuestion].id)
  }

  const isLastQuestion = currentQuestion === quiz.questions.length - 1
  const allQuestionsAnswered = quiz.questions.every(q => isAnswered(q.id))

  if (showResults) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
              score >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {score >= 70 ? <Award className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Complete!
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            Your Score: <span className="font-bold text-primary-600">{score}%</span>
          </p>
          
          <p className="text-gray-600 dark:text-gray-400">
            You answered {Object.keys(answers).length} out of {quiz.questions.length} questions
            {score >= 70 ? ' correctly. Well done!' : '. Keep practicing!'}
          </p>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4 mb-8">
          {quiz.questions.map((question, index) => {
            const userAnswer = answers[question.id]
            const isCorrect = question.type === 'multiple-choice' 
              ? userAnswer === question.correctAnswer
              : question.type === 'true-false'
              ? userAnswer === question.correctAnswer
              : JSON.stringify((question.correctAnswers || []).sort()) === JSON.stringify((userAnswer || []).sort())

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${
                  isCorrect 
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white mb-2">
                      {question.question}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your answer: <span className="font-medium">{userAnswer?.toString() || 'Not answered'}</span>
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Correct answer: <span className="font-medium text-green-600">
                          {question.correctAnswer?.toString() || question.correctAnswers?.join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {allowRetake && (
          <div className="text-center">
            <button
              onClick={resetQuiz}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake Quiz</span>
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  const question = quiz.questions[currentQuestion]

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {quiz.title}
          </h2>
          {timeLimit && (
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span className={timeRemaining < 60 ? 'text-red-600' : ''}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          />
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </p>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-8"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {question.question}
          </h3>

          {/* Multiple Choice */}
          {question.type === 'multiple-choice' && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerSelect(question.id, option)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answers[question.id] === option
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      answers[question.id] === option
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-300'
                    }`}>
                      {answers[question.id] === option && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-white">{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* True/False */}
          {question.type === 'true-false' && (
            <div className="space-y-3">
              {[true, false].map((option) => (
                <motion.button
                  key={option.toString()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerSelect(question.id, option)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answers[question.id] === option
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      answers[question.id] === option
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-300'
                    }`}>
                      {answers[question.id] === option && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-white">
                      {option ? 'True' : 'False'}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Multiple Select */}
          {question.type === 'multiple-select' && (
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const selectedAnswers = answers[question.id] || []
                const isSelected = selectedAnswers.includes(option)
                
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const newAnswers = isSelected
                        ? selectedAnswers.filter(a => a !== option)
                        : [...selectedAnswers, option]
                      handleAnswerSelect(question.id, newAnswers)
                    }}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded border-2 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-gray-900 dark:text-white">{option}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(prev => prev + 1)}
            disabled={!canProceed()}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default QuizComponent