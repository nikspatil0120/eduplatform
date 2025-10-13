import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Plus, 
  FileText, 
  Folder, 
  Star, 
  Share2, 
  Download, 
  Trash2,
  Edit3,
  Save,
  Cloud,
  CloudOff,
  Filter,
  Calendar,
  Tag,
  BookOpen
} from 'lucide-react'

const NoteTaking = () => {
  const [selectedNote, setSelectedNote] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [isEditing, setIsEditing] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [syncStatus, setSyncStatus] = useState('synced') // synced, syncing, offline

  const folders = [
    { id: 'all', name: 'All Notes', count: 24, icon: FileText },
    { id: 'react', name: 'React Development', count: 8, icon: BookOpen },
    { id: 'design', name: 'UI/UX Design', count: 6, icon: Folder },
    { id: 'data-science', name: 'Data Science', count: 5, icon: Folder },
    { id: 'favorites', name: 'Favorites', count: 3, icon: Star },
    { id: 'shared', name: 'Shared with me', count: 2, icon: Share2 }
  ]

  const notes = [
    {
      id: 1,
      title: 'React Hooks Best Practices',
      content: 'useState and useEffect are the most commonly used hooks in React. Here are some best practices:\n\n1. Always use hooks at the top level\n2. Use custom hooks for reusable logic\n3. Optimize with useMemo and useCallback when needed\n\nExample:\n```jsx\nconst [count, setCount] = useState(0);\n\nuseEffect(() => {\n  document.title = `Count: ${count}`;\n}, [count]);\n```',
      course: 'React Development Masterclass',
      folder: 'react',
      tags: ['hooks', 'best-practices', 'react'],
      lastModified: '2 hours ago',
      created: '2024-01-15',
      favorite: true,
      shared: false,
      wordCount: 156
    },
    {
      id: 2,
      title: 'Design System Components',
      content: 'A design system is a collection of reusable components and guidelines that help maintain consistency across products.\n\nKey components:\n- Typography scale\n- Color palette\n- Spacing system\n- Component library\n- Icon set\n\nBenefits:\n- Consistency across products\n- Faster development\n- Better collaboration\n- Easier maintenance',
      course: 'UI/UX Design Fundamentals',
      folder: 'design',
      tags: ['design-system', 'components', 'ui'],
      lastModified: '1 day ago',
      created: '2024-01-14',
      favorite: false,
      shared: true,
      wordCount: 89
    },
    {
      id: 3,
      title: 'Data Visualization with Python',
      content: 'Matplotlib and Seaborn are powerful libraries for data visualization in Python.\n\nMatplotlib basics:\n```python\nimport matplotlib.pyplot as plt\n\nplt.figure(figsize=(10, 6))\nplt.plot(x, y)\nplt.title("Sample Plot")\nplt.show()\n```\n\nSeaborn for statistical plots:\n```python\nimport seaborn as sns\n\nsns.scatterplot(data=df, x="x", y="y", hue="category")\n```',
      course: 'Data Science with Python',
      folder: 'data-science',
      tags: ['python', 'visualization', 'matplotlib', 'seaborn'],
      lastModified: '3 days ago',
      created: '2024-01-12',
      favorite: true,
      shared: false,
      wordCount: 124
    },
    {
      id: 4,
      title: 'JavaScript ES6+ Features',
      content: 'Modern JavaScript features that every developer should know:\n\n1. Arrow Functions\n2. Destructuring\n3. Template Literals\n4. Async/Await\n5. Modules\n6. Classes\n\nArrow Functions:\n```javascript\nconst add = (a, b) => a + b;\n```\n\nDestructuring:\n```javascript\nconst { name, age } = person;\nconst [first, second] = array;\n```',
      course: 'JavaScript Fundamentals',
      folder: 'react',
      tags: ['javascript', 'es6', 'modern-js'],
      lastModified: '1 week ago',
      created: '2024-01-08',
      favorite: false,
      shared: false,
      wordCount: 98
    }
  ]

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFolder = selectedFolder === 'all' || 
                         note.folder === selectedFolder ||
                         (selectedFolder === 'favorites' && note.favorite) ||
                         (selectedFolder === 'shared' && note.shared)
    
    return matchesSearch && matchesFolder
  })

  const handleNewNote = () => {
    setSelectedNote(null)
    setNoteTitle('')
    setNoteContent('')
    setIsEditing(true)
  }

  const handleSaveNote = () => {
    // Simulate saving note
    setSyncStatus('syncing')
    setTimeout(() => {
      setSyncStatus('synced')
      setIsEditing(false)
    }, 1000)
  }

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Cloud className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'offline':
        return <CloudOff className="h-4 w-4 text-red-500" />
      default:
        return <Cloud className="h-4 w-4 text-green-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Notes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Organize and sync your learning notes across all devices
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              {getSyncIcon()}
              <span className="capitalize">{syncStatus}</span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewNote}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-1"
          >
            {/* Search */}
            <div className="card p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Folders */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                Folders
              </h3>
              <div className="space-y-1">
                {folders.map((folder) => (
                  <motion.button
                    key={folder.id}
                    whileHover={{ x: 5 }}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      selectedFolder === folder.id
                        ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <folder.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{folder.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {folder.count}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Notes List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notes ({filteredNotes.length})
                </h3>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Filter className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {filteredNotes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        setSelectedNote(note)
                        setNoteTitle(note.title)
                        setNoteContent(note.content)
                        setIsEditing(false)
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedNote?.id === note.id
                          ? 'bg-primary-100 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                          {note.title}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2">
                          {note.favorite && (
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          )}
                          {note.shared && (
                            <Share2 className="h-3 w-3 text-blue-400" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {note.course}
                      </p>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-2">
                        {note.content.substring(0, 100)}...
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                        <span>{note.lastModified}</span>
                        <span>{note.wordCount} words</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{note.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Note Editor */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="card p-6 h-full">
              {selectedNote || isEditing ? (
                <div className="h-full flex flex-col">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Note title..."
                          className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none w-full"
                        />
                      ) : (
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedNote?.title}
                        </h2>
                      )}
                      {selectedNote && !isEditing && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {selectedNote.course} • {selectedNote.lastModified}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveNote}
                            className="btn-primary flex items-center space-x-2 text-sm px-4 py-2"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditing(false)}
                            className="btn-secondary text-sm px-4 py-2"
                          >
                            Cancel
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            <Share2 className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Editor Content */}
                  <div className="flex-1">
                    {isEditing ? (
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Start writing your notes..."
                        className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <div className="h-full overflow-y-auto">
                        <div className="prose dark:prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed">
                            {selectedNote?.content}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {selectedNote && !isEditing && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-wrap gap-2">
                          {selectedNote.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-600 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Select a note to view
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Choose a note from the list or create a new one to get started
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNewNote}
                      className="btn-primary flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Note</span>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default NoteTaking