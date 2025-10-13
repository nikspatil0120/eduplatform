import { DefaultAzureCredential } from '@azure/identity'
import { AzureMediaServices } from '@azure/arm-mediaservices'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger.js'

class AzureMediaServicesClient {
  constructor() {
    this.client = null
    this.subscriptionId = process.env.AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID
    this.resourceGroupName = process.env.AZURE_MEDIA_SERVICES_RESOURCE_GROUP
    this.accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME
    this.initialize()
  }

  async initialize() {
    try {
      if (!this.subscriptionId || !this.resourceGroupName || !this.accountName) {
        logger.warn('Azure Media Services credentials not provided, video processing will be limited')
        return
      }

      const credential = new DefaultAzureCredential()
      this.client = new AzureMediaServices(credential, this.subscriptionId)
      
      logger.info('✅ Azure Media Services initialized successfully')
    } catch (error) {
      logger.error('❌ Failed to initialize Azure Media Services:', error)
    }
  }

  async createAsset(assetName = null) {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      const uniqueAssetName = assetName || `asset-${uuidv4()}`
      
      const asset = await this.client.assets.createOrUpdate(
        this.resourceGroupName,
        this.accountName,
        uniqueAssetName,
        {}
      )

      logger.info(`📹 Created media asset: ${uniqueAssetName}`)
      return asset

    } catch (error) {
      logger.error('Failed to create media asset:', error)
      throw error
    }
  }

  async uploadVideoToAsset(assetName, videoBuffer, fileName) {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      // Get upload URLs for the asset
      const listContainerSas = await this.client.assets.listContainerSas(
        this.resourceGroupName,
        this.accountName,
        assetName,
        {
          permissions: 'ReadWrite',
          expiryTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      )

      const uploadUrl = listContainerSas.assetContainerSasUrls[0]
      
      // Upload video file to the asset container
      // This would typically use Azure Storage SDK to upload to the SAS URL
      // For now, we'll return the upload URL for client-side upload
      
      return {
        success: true,
        uploadUrl,
        assetName,
        fileName
      }

    } catch (error) {
      logger.error('Failed to upload video to asset:', error)
      throw error
    }
  }

  async createEncodingJob(inputAssetName, outputAssetName, transformName = 'AdaptiveStreaming') {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      const jobName = `job-${uuidv4()}`
      
      // Ensure transform exists
      await this.ensureTransform(transformName)

      // Create encoding job
      const job = await this.client.jobs.create(
        this.resourceGroupName,
        this.accountName,
        transformName,
        jobName,
        {
          input: {
            odataType: '#Microsoft.Media.JobInputAsset',
            assetName: inputAssetName
          },
          outputs: [
            {
              odataType: '#Microsoft.Media.JobOutputAsset',
              assetName: outputAssetName
            }
          ]
        }
      )

      logger.info(`🎬 Created encoding job: ${jobName}`)
      return job

    } catch (error) {
      logger.error('Failed to create encoding job:', error)
      throw error
    }
  }

  async ensureTransform(transformName) {
    try {
      // Check if transform exists
      try {
        await this.client.transforms.get(
          this.resourceGroupName,
          this.accountName,
          transformName
        )
        return // Transform already exists
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error
        }
      }

      // Create adaptive streaming transform
      const transform = await this.client.transforms.createOrUpdate(
        this.resourceGroupName,
        this.accountName,
        transformName,
        {
          outputs: [
            {
              preset: {
                odataType: '#Microsoft.Media.BuiltInStandardEncoderPreset',
                presetName: 'AdaptiveStreaming'
              }
            }
          ]
        }
      )

      logger.info(`🔧 Created transform: ${transformName}`)
      return transform

    } catch (error) {
      logger.error('Failed to ensure transform:', error)
      throw error
    }
  }

  async getJobStatus(transformName, jobName) {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      const job = await this.client.jobs.get(
        this.resourceGroupName,
        this.accountName,
        transformName,
        jobName
      )

      return {
        state: job.state,
        progress: job.outputs?.[0]?.progress || 0,
        error: job.outputs?.[0]?.error || null
      }

    } catch (error) {
      logger.error('Failed to get job status:', error)
      throw error
    }
  }

  async createStreamingLocator(assetName, streamingPolicyName = 'Predefined_ClearStreamingOnly') {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      const locatorName = `locator-${uuidv4()}`
      
      const streamingLocator = await this.client.streamingLocators.create(
        this.resourceGroupName,
        this.accountName,
        locatorName,
        {
          assetName,
          streamingPolicyName
        }
      )

      logger.info(`🔗 Created streaming locator: ${locatorName}`)
      return streamingLocator

    } catch (error) {
      logger.error('Failed to create streaming locator:', error)
      throw error
    }
  }

  async getStreamingUrls(locatorName) {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      // Get streaming endpoints
      const streamingEndpoints = await this.client.streamingEndpoints.list(
        this.resourceGroupName,
        this.accountName
      )

      const streamingEndpoint = streamingEndpoints.find(ep => ep.resourceState === 'Running')
      
      if (!streamingEndpoint) {
        throw new Error('No running streaming endpoint found')
      }

      // Get streaming paths
      const paths = await this.client.streamingLocators.listPaths(
        this.resourceGroupName,
        this.accountName,
        locatorName
      )

      const streamingUrls = {
        hls: [],
        dash: [],
        smoothStreaming: []
      }

      paths.streamingPaths.forEach(path => {
        const baseUrl = `https://${streamingEndpoint.hostName}`
        const fullUrl = `${baseUrl}${path.paths[0]}`

        switch (path.streamingProtocol) {
          case 'Hls':
            streamingUrls.hls.push(fullUrl)
            break
          case 'Dash':
            streamingUrls.dash.push(fullUrl)
            break
          case 'SmoothStreaming':
            streamingUrls.smoothStreaming.push(fullUrl)
            break
        }
      })

      return streamingUrls

    } catch (error) {
      logger.error('Failed to get streaming URLs:', error)
      throw error
    }
  }

  async generateThumbnail(inputAssetName, outputAssetName, timeOffset = 'PT10S') {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      const jobName = `thumbnail-job-${uuidv4()}`
      const transformName = 'ThumbnailTransform'

      // Ensure thumbnail transform exists
      await this.ensureThumbnailTransform(transformName)

      // Create thumbnail job
      const job = await this.client.jobs.create(
        this.resourceGroupName,
        this.accountName,
        transformName,
        jobName,
        {
          input: {
            odataType: '#Microsoft.Media.JobInputAsset',
            assetName: inputAssetName
          },
          outputs: [
            {
              odataType: '#Microsoft.Media.JobOutputAsset',
              assetName: outputAssetName
            }
          ]
        }
      )

      logger.info(`📸 Created thumbnail job: ${jobName}`)
      return job

    } catch (error) {
      logger.error('Failed to generate thumbnail:', error)
      throw error
    }
  }

  async ensureThumbnailTransform(transformName) {
    try {
      // Check if transform exists
      try {
        await this.client.transforms.get(
          this.resourceGroupName,
          this.accountName,
          transformName
        )
        return
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error
        }
      }

      // Create thumbnail transform
      const transform = await this.client.transforms.createOrUpdate(
        this.resourceGroupName,
        this.accountName,
        transformName,
        {
          outputs: [
            {
              preset: {
                odataType: '#Microsoft.Media.StandardEncoderPreset',
                codecs: [
                  {
                    odataType: '#Microsoft.Media.JpgImage',
                    start: 'PT10S',
                    step: 'PT10S',
                    range: 'PT1S',
                    layers: [
                      {
                        width: '1280',
                        height: '720',
                        quality: 90
                      }
                    ]
                  }
                ],
                formats: [
                  {
                    odataType: '#Microsoft.Media.JpgFormat',
                    filenamePattern: 'thumbnail-{Basename}-{Index}{Extension}'
                  }
                ]
              }
            }
          ]
        }
      )

      logger.info(`🖼️ Created thumbnail transform: ${transformName}`)
      return transform

    } catch (error) {
      logger.error('Failed to ensure thumbnail transform:', error)
      throw error
    }
  }

  async deleteAsset(assetName) {
    try {
      if (!this.client) {
        throw new Error('Azure Media Services not initialized')
      }

      await this.client.assets.delete(
        this.resourceGroupName,
        this.accountName,
        assetName
      )

      logger.info(`🗑️ Deleted asset: ${assetName}`)
      return { success: true }

    } catch (error) {
      logger.error('Failed to delete asset:', error)
      throw error
    }
  }

  // Complete video processing workflow
  async processVideo(videoBuffer, fileName, options = {}) {
    try {
      const {
        generateThumbnails = true,
        enableDRM = false,
        customTransform = null
      } = options

      const assetId = uuidv4()
      const inputAssetName = `input-${assetId}`
      const outputAssetName = `output-${assetId}`
      const thumbnailAssetName = `thumbnail-${assetId}`

      // Step 1: Create input asset
      await this.createAsset(inputAssetName)
      
      // Step 2: Upload video to input asset
      const uploadResult = await this.uploadVideoToAsset(inputAssetName, videoBuffer, fileName)
      
      // Step 3: Create output asset
      await this.createAsset(outputAssetName)
      
      // Step 4: Start encoding job
      const transformName = customTransform || 'AdaptiveStreaming'
      const encodingJob = await this.createEncodingJob(inputAssetName, outputAssetName, transformName)
      
      // Step 5: Generate thumbnails if requested
      let thumbnailJob = null
      if (generateThumbnails) {
        await this.createAsset(thumbnailAssetName)
        thumbnailJob = await this.generateThumbnail(inputAssetName, thumbnailAssetName)
      }

      return {
        success: true,
        assetId,
        inputAssetName,
        outputAssetName,
        thumbnailAssetName: generateThumbnails ? thumbnailAssetName : null,
        encodingJob: encodingJob.name,
        thumbnailJob: thumbnailJob?.name || null,
        uploadResult
      }

    } catch (error) {
      logger.error('Video processing workflow failed:', error)
      throw error
    }
  }

  // Check processing status and get streaming URLs when ready
  async getProcessingStatus(assetId, jobNames) {
    try {
      const { encodingJob, thumbnailJob } = jobNames
      
      // Check encoding job status
      const encodingStatus = await this.getJobStatus('AdaptiveStreaming', encodingJob)
      
      let thumbnailStatus = null
      if (thumbnailJob) {
        thumbnailStatus = await this.getJobStatus('ThumbnailTransform', thumbnailJob)
      }

      const result = {
        encoding: encodingStatus,
        thumbnail: thumbnailStatus,
        isComplete: encodingStatus.state === 'Finished',
        streamingUrls: null,
        thumbnailUrls: null
      }

      // If encoding is complete, create streaming locator and get URLs
      if (encodingStatus.state === 'Finished') {
        const outputAssetName = `output-${assetId}`
        const locator = await this.createStreamingLocator(outputAssetName)
        result.streamingUrls = await this.getStreamingUrls(locator.name)
      }

      // If thumbnail generation is complete, get thumbnail URLs
      if (thumbnailStatus?.state === 'Finished') {
        const thumbnailAssetName = `thumbnail-${assetId}`
        const thumbnailLocator = await this.createStreamingLocator(thumbnailAssetName)
        result.thumbnailUrls = await this.getStreamingUrls(thumbnailLocator.name)
      }

      return result

    } catch (error) {
      logger.error('Failed to get processing status:', error)
      throw error
    }
  }
}

// Create singleton instance
const azureMediaServices = new AzureMediaServicesClient()

export default azureMediaServices