// Utility functions for managing user sessions and data isolation

export const clearUserSpecificData = async () => {
  try {
    // Clear course data
    const { clearUserData } = await import('../store/index.js').then(m => m.useCourseStore.getState())
    clearUserData()
    
    // Clear any other user-specific data stores here
    // For example, if you have chat data, notes, etc.
    
    console.log('User-specific data cleared')
  } catch (error) {
    console.error('Error clearing user data:', error)
  }
}

export const clearUserDataIfDifferentUser = async (newUserData) => {
  try {
    console.log('🔄 Always syncing user data from database for user:', newUserData.email)
    
    // Always clear local data first to ensure clean state
    await clearUserSpecificData()
    
    // Then sync fresh data from database
    await syncUserDataFromDatabase()
    
    console.log('✅ User data synced from database')
  } catch (error) {
    console.error('Error syncing user data:', error)
    // If there's an error, clear data to be safe
    await clearUserSpecificData()
  }
}

export const syncUserDataFromDatabase = async () => {
  try {
    // Import the course store and sync progress
    const { useCourseStore } = await import('../store/index.js')
    const { syncProgressFromDatabase } = useCourseStore.getState()
    
    await syncProgressFromDatabase()
    
    console.log('✅ User data synced from database')
  } catch (error) {
    console.error('Failed to sync user data from database:', error)
  }
}

export const switchUser = async (newUserData) => {
  // Clear previous user's data only if different user
  await clearUserDataIfDifferentUser(newUserData)
  
  // Set new user data
  localStorage.setItem('userData', JSON.stringify(newUserData))
  
  console.log('Switched to user:', newUserData.name || newUserData.email)
}