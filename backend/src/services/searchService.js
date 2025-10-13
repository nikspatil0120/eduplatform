import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import { logger } from '../utils/logger.js'

class SearchService {
  constructor() {
    this.endpoint = process.env.AZURE_SEARCH_ENDPOINT
    this.apiKey = process.env.AZURE_SEARCH_API_KEY
    this.indexName = process.env.AZURE_SEARCH_INDEX_NAME || 'eduplatform-index'
    
    if (this.endpoint && this.apiKey) {
      this.searchClient = new SearchClient(
        this.endpoint,
        this.indexName,
        new AzureKeyCredential(this.apiKey)
      )
    } else {
      logger.warn('Azure Cognitive Search not configured, using fallback search')
    }
  }

  // Index a document (course, discussion, etc.)
  async indexDocument(document) {
    if (!this.searchClient) {
      return this.fallbackIndex(document)
    }

    try {
      const searchDocument = this.prepareDocumentForIndexing(document)
      await this.searchClient.uploadDocuments([searchDocument])
      logger.info(`Document indexed: ${document.id}`)
    } catch (error) {
      logger.error('Failed to index document:', error)
      throw error
    }
  }

  // Index multiple documents
  async indexDocuments(documents) {
    if (!this.searchClient) {
      return this.fallbackIndexMultiple(documents)
    }

    try {
      const searchDocuments = documents.map(doc => this.prepareDocumentForIndexing(doc))
      await this.searchClient.uploadDocuments(searchDocuments)
      logger.info(`${documents.length} documents indexed`)
    } catch (error) {
      logger.error('Failed to index documents:', error)
      throw error
    }
  }

  // Search across all content
  async search(query, options = {}) {
    if (!this.searchClient) {
      return this.fallbackSearch(query, options)
    }

    try {
      const searchOptions = {
        searchFields: options.searchFields || ['title', 'description', 'content', 'tags'],
        select: options.select || ['id', 'title', 'description', 'type', 'url', 'thumbnail'],
        filter: options.filter,
        orderBy: options.orderBy,
        top: options.limit || 20,
        skip: options.skip || 0,
        includeTotalCount: true,
        highlightFields: options.highlight ? ['title', 'description', 'content'] : undefined,
        facets: options.facets ? ['type', 'category', 'level', 'tags'] : undefined
      }

      const results = await this.searchClient.search(query, searchOptions)
      
      const searchResults = {
        results: [],
        totalCount: results.count,
        facets: results.facets
      }

      for await (const result of results.results) {
        searchResults.results.push({
          ...result.document,
          score: result.score,
          highlights: result.highlights
        })
      }

      return searchResults
    } catch (error) {
      logger.error('Search failed:', error)
      throw error
    }
  }

  // Search courses specifically
  async searchCourses(query, options = {}) {
    const searchOptions = {
      ...options,
      filter: options.filter ? `type eq 'course' and (${options.filter})` : "type eq 'course'"
    }
    
    return this.search(query, searchOptions)
  }

  // Search discussions
  async searchDiscussions(query, courseId = null, options = {}) {
    let filter = "type eq 'discussion'"
    if (courseId) {
      filter += ` and courseId eq '${courseId}'`
    }
    if (options.filter) {
      filter += ` and (${options.filter})`
    }

    const searchOptions = {
      ...options,
      filter
    }
    
    return this.search(query, searchOptions)
  }

  // Search assignments
  async searchAssignments(query, courseId = null, options = {}) {
    let filter = "type eq 'assignment'"
    if (courseId) {
      filter += ` and courseId eq '${courseId}'`
    }
    if (options.filter) {
      filter += ` and (${options.filter})`
    }

    const searchOptions = {
      ...options,
      filter
    }
    
    return this.search(query, searchOptions)
  }

  // Get search suggestions
  async suggest(query, options = {}) {
    if (!this.searchClient) {
      return this.fallbackSuggest(query, options)
    }

    try {
      const suggesterName = 'sg' // Default suggester name
      const results = await this.searchClient.suggest(query, suggesterName, {
        select: options.select || ['title', 'type'],
        searchFields: options.searchFields || ['title', 'description'],
        top: options.limit || 5
      })

      return results.results.map(result => ({
        text: result.text,
        document: result.document
      }))
    } catch (error) {
      logger.error('Suggest failed:', error)
      return []
    }
  }

  // Auto-complete search
  async autocomplete(query, options = {}) {
    if (!this.searchClient) {
      return this.fallbackAutocomplete(query, options)
    }

    try {
      const suggesterName = 'sg'
      const results = await this.searchClient.autocomplete(query, suggesterName, {
        autocompleteMode: 'twoTerms',
        top: options.limit || 5
      })

      return results.results.map(result => result.text)
    } catch (error) {
      logger.error('Autocomplete failed:', error)
      return []
    }
  }

  // Delete document from index
  async deleteDocument(documentId) {
    if (!this.searchClient) {
      return this.fallbackDelete(documentId)
    }

    try {
      await this.searchClient.deleteDocuments([{ id: documentId }])
      logger.info(`Document deleted from index: ${documentId}`)
    } catch (error) {
      logger.error('Failed to delete document from index:', error)
      throw error
    }
  }

  // Prepare document for indexing
  prepareDocumentForIndexing(document) {
    const searchDocument = {
      id: document.id || document._id.toString(),
      title: document.title,
      description: document.description,
      content: document.content || document.instructions || '',
      type: document.type || this.getDocumentType(document),
      category: document.category,
      level: document.level,
      tags: Array.isArray(document.tags) ? document.tags : [],
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      isPublished: document.isPublished !== false,
      url: this.generateDocumentUrl(document),
      thumbnail: document.thumbnail,
      authorId: document.instructorId || document.createdBy,
      courseId: document.courseId
    }

    // Add type-specific fields
    if (document.type === 'course' || this.getDocumentType(document) === 'course') {
      searchDocument.price = document.price
      searchDocument.duration = document.duration
      searchDocument.enrollmentCount = document.enrolledStudents?.length || 0
      searchDocument.rating = document.averageRating
    }

    return searchDocument
  }

  // Determine document type
  getDocumentType(document) {
    if (document.enrolledStudents !== undefined) return 'course'
    if (document.assignmentId !== undefined) return 'submission'
    if (document.discussionId !== undefined) return 'reply'
    if (document.dueDate !== undefined) return 'assignment'
    if (document.replyCount !== undefined) return 'discussion'
    if (document.certificateNumber !== undefined) return 'certificate'
    return 'unknown'
  }

  // Generate URL for document
  generateDocumentUrl(document) {
    const type = document.type || this.getDocumentType(document)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    
    switch (type) {
      case 'course':
        return `${baseUrl}/courses/${document._id}`
      case 'assignment':
        return `${baseUrl}/assignments/${document._id}`
      case 'discussion':
        return `${baseUrl}/discussions/${document._id}`
      case 'certificate':
        return `${baseUrl}/certificates/${document._id}`
      default:
        return baseUrl
    }
  }

  // Fallback search methods (when Azure Search is not available)
  async fallbackSearch(query, options = {}) {
    // Import models dynamically to avoid circular dependencies
    const Course = (await import('../models/Course.js')).default
    const Discussion = (await import('../models/Discussion.js')).default
    const Assignment = (await import('../models/Assignment.js')).default

    const searchRegex = new RegExp(query, 'i')
    const results = []

    try {
      // Search courses
      const courses = await Course.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } }
        ],
        isPublished: true
      }).limit(10)

      courses.forEach(course => {
        results.push({
          id: course._id,
          title: course.title,
          description: course.description,
          type: 'course',
          url: `/courses/${course._id}`,
          thumbnail: course.thumbnail,
          score: 1.0
        })
      })

      // Search discussions
      const discussions = await Discussion.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      }).limit(10)

      discussions.forEach(discussion => {
        results.push({
          id: discussion._id,
          title: discussion.title,
          description: discussion.description,
          type: 'discussion',
          url: `/discussions/${discussion._id}`,
          score: 0.8
        })
      })

      return {
        results: results.slice(0, options.limit || 20),
        totalCount: results.length
      }
    } catch (error) {
      logger.error('Fallback search failed:', error)
      return { results: [], totalCount: 0 }
    }
  }

  async fallbackSuggest(query, options = {}) {
    const Course = (await import('../models/Course.js')).default
    const searchRegex = new RegExp(query, 'i')
    
    try {
      const courses = await Course.find({
        title: searchRegex,
        isPublished: true
      }).select('title').limit(options.limit || 5)

      return courses.map(course => ({
        text: course.title,
        document: { id: course._id, title: course.title, type: 'course' }
      }))
    } catch (error) {
      logger.error('Fallback suggest failed:', error)
      return []
    }
  }

  async fallbackAutocomplete(query, options = {}) {
    return this.fallbackSuggest(query, options).then(results => 
      results.map(result => result.text)
    )
  }

  fallbackIndex(document) {
    // In fallback mode, we don't actually index anything
    logger.info(`Fallback index: ${document.id || document._id}`)
  }

  fallbackIndexMultiple(documents) {
    logger.info(`Fallback index: ${documents.length} documents`)
  }

  fallbackDelete(documentId) {
    logger.info(`Fallback delete: ${documentId}`)
  }
}

export default new SearchService()