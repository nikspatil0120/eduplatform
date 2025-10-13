import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob'
import { DefaultAzureCredential } from '@azure/identity'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { logger } from '../utils/logger.js'

class AzureStorageService {
  constructor() {
    this.blobServiceClient = null
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'eduplatform-files'
    this.initialized = false
  }

  async initialize() {
    try {
      if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
        // Use connection string
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
          process.env.AZURE_STORAGE_CONNECTION_STRING
        )
        logger.info('✅ Azure Storage Service initialized with connection string')
      } else if (process.env.AZURE_STORAGE_ACCOUNT_NAME && process.env.AZURE_STORAGE_ACCOUNT_KEY) {
        // Use account name and key
        const credential = new StorageSharedKeyCredential(
          process.env.AZURE_STORAGE_ACCOUNT_NAME,
          process.env.AZURE_STORAGE_ACCOUNT_KEY
        )
        this.blobServiceClient = new BlobServiceClient(
          `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
          credential
        )
        logger.info('✅ Azure Storage Service initialized with account key')
      } else {
        logger.warn('⚠️ Azure Storage credentials not provided, file upload will be disabled')
        return
      }

      // Test connection by ensuring container exists (but don't fail startup if it fails)
      try {
        await this.ensureContainer()
        logger.info('✅ Azure Storage container verified')
      } catch (containerError) {
        logger.warn('⚠️ Could not verify Azure Storage container:', containerError.message)
        logger.warn('File upload functionality may be limited')
      }

    } catch (error) {
      logger.error('❌ Failed to initialize Azure Storage Service:', error)
      logger.warn('File upload functionality will be disabled')
      // Don't throw error to prevent server startup failure
    }
  }

  async ensureContainer() {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
      
      // Create container if it doesn't exist
      const exists = await containerClient.exists()
      if (!exists) {
        await containerClient.create() // Private access by default
        logger.info(`📦 Created storage container: ${this.containerName}`)
      }

      return containerClient
    } catch (error) {
      logger.error('Failed to ensure container exists:', error)
      throw error
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize()
      this.initialized = true
    }
  }

  async uploadFile(file, options = {}) {
    try {
      await this.ensureInitialized()
      const {
        folder = 'general',
        fileName = null,
        contentType = file.mimetype,
        isPublic = true,
        metadata = {}
      } = options

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop()
      const uniqueFileName = fileName || `${uuidv4()}.${fileExtension}`
      const blobName = `${folder}/${uniqueFileName}`

      // Get container client
      const containerClient = await this.ensureContainer()
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      // Upload options
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType
        },
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      }

      // Upload file
      let uploadData = file.buffer

      // Optimize images
      if (contentType.startsWith('image/') && options.optimizeImage !== false) {
        uploadData = await this.optimizeImage(file.buffer, options.imageOptions)
      }

      const uploadResult = await blockBlobClient.uploadData(uploadData, uploadOptions)

      // Generate public URL
      const url = blockBlobClient.url

      return {
        success: true,
        url,
        blobName,
        fileName: uniqueFileName,
        originalName: file.originalname,
        size: uploadData.length,
        contentType,
        etag: uploadResult.etag,
        lastModified: uploadResult.lastModified,
        metadata
      }

    } catch (error) {
      logger.error('File upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }

  async uploadMultipleFiles(files, options = {}) {
    try {
      await this.ensureInitialized()
      const uploadPromises = files.map(file => this.uploadFile(file, options))
      const results = await Promise.allSettled(uploadPromises)

      const successful = []
      const failed = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value)
        } else {
          failed.push({
            file: files[index].originalname,
            error: result.reason.message
          })
        }
      })

      return {
        success: failed.length === 0,
        successful,
        failed,
        total: files.length
      }

    } catch (error) {
      logger.error('Multiple file upload error:', error)
      throw error
    }
  }

  async deleteFile(blobName) {
    try {
      await this.ensureInitialized()
      const containerClient = await this.ensureContainer()
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      const deleteResult = await blockBlobClient.deleteIfExists()

      return {
        success: deleteResult.succeeded,
        deleted: deleteResult.succeeded
      }

    } catch (error) {
      logger.error('File deletion error:', error)
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  async getFileInfo(blobName) {
    try {
      const containerClient = await this.ensureContainer()
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      const properties = await blockBlobClient.getProperties()

      return {
        success: true,
        url: blockBlobClient.url,
        size: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified,
        etag: properties.etag,
        metadata: properties.metadata
      }

    } catch (error) {
      if (error.statusCode === 404) {
        return {
          success: false,
          error: 'File not found'
        }
      }
      
      logger.error('Get file info error:', error)
      throw error
    }
  }

  async generateSasUrl(blobName, options = {}) {
    try {
      const {
        permissions = 'r', // read by default
        expiresIn = 3600, // 1 hour by default
        contentDisposition = null
      } = options

      const containerClient = await this.ensureContainer()
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      // Generate SAS token
      const sasOptions = {
        containerName: this.containerName,
        blobName,
        permissions,
        expiresOn: new Date(Date.now() + expiresIn * 1000)
      }

      if (contentDisposition) {
        sasOptions.contentDisposition = contentDisposition
      }

      const sasUrl = await blockBlobClient.generateSasUrl(sasOptions)

      return {
        success: true,
        sasUrl,
        expiresAt: sasOptions.expiresOn
      }

    } catch (error) {
      logger.error('SAS URL generation error:', error)
      throw error
    }
  }

  async optimizeImage(buffer, options = {}) {
    try {
      const {
        width = null,
        height = null,
        quality = 80,
        format = 'jpeg'
      } = options

      let sharpInstance = sharp(buffer)

      // Resize if dimensions provided
      if (width || height) {
        sharpInstance = sharpInstance.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Convert and compress
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({ quality })
          break
        case 'png':
          sharpInstance = sharpInstance.png({ quality })
          break
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality })
          break
        default:
          // Keep original format
          break
      }

      return await sharpInstance.toBuffer()

    } catch (error) {
      logger.error('Image optimization error:', error)
      // Return original buffer if optimization fails
      return buffer
    }
  }

  async listFiles(folder = '', options = {}) {
    try {
      const {
        maxResults = 100,
        prefix = folder
      } = options

      const containerClient = await this.ensureContainer()
      const files = []

      for await (const blob of containerClient.listBlobsFlat({
        prefix,
        maxPageSize: maxResults
      })) {
        files.push({
          name: blob.name,
          url: `${containerClient.url}/${blob.name}`,
          size: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          lastModified: blob.properties.lastModified,
          etag: blob.properties.etag
        })
      }

      return {
        success: true,
        files,
        count: files.length
      }

    } catch (error) {
      logger.error('List files error:', error)
      throw error
    }
  }

  async copyFile(sourceBlobName, destinationBlobName) {
    try {
      const containerClient = await this.ensureContainer()
      const sourceClient = containerClient.getBlockBlobClient(sourceBlobName)
      const destClient = containerClient.getBlockBlobClient(destinationBlobName)

      const copyResult = await destClient.syncCopyFromURL(sourceClient.url)

      return {
        success: true,
        copyId: copyResult.copyId,
        copyStatus: copyResult.copyStatus
      }

    } catch (error) {
      logger.error('File copy error:', error)
      throw error
    }
  }

  async moveFile(sourceBlobName, destinationBlobName) {
    try {
      // Copy file to new location
      const copyResult = await this.copyFile(sourceBlobName, destinationBlobName)
      
      if (copyResult.success) {
        // Delete original file
        await this.deleteFile(sourceBlobName)
      }

      return copyResult

    } catch (error) {
      logger.error('File move error:', error)
      throw error
    }
  }

  // Helper method to get file type folder
  getFileTypeFolder(mimetype) {
    if (mimetype.startsWith('image/')) return 'images'
    if (mimetype.startsWith('video/')) return 'videos'
    if (mimetype.startsWith('audio/')) return 'audio'
    if (mimetype.includes('pdf')) return 'documents'
    if (mimetype.includes('word') || mimetype.includes('document')) return 'documents'
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'documents'
    return 'files'
  }
}

// Create singleton instance
const azureStorageService = new AzureStorageService()

export default azureStorageService