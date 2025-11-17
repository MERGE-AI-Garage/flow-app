import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

function Layout(): React.ReactElement {
  const location = useLocation()
  const { currentUser, allUsers, setCurrentUser, loading } = useUser()

  const isActive = (path: string): boolean => location.pathname === path

  const handleUserChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const userId = parseInt(event.target.value)
    const user = allUsers.find(u => u.id === userId)
    if (user) {
      setCurrentUser(user)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side: App title */}
            <h1 className="text-3xl font-bold text-gray-900">Flow</h1>

            {/* Center: Navigation links */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1">
              <Link
                to="/"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                My Tasks
              </Link>
              <Link
                to="/flow-designer"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/flow-designer')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Flow Designer
              </Link>
            </div>

            {/* Right side: User dropdown */}
            <div className="flex items-center gap-4">
              {loading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : (
                <select
                  className="select select-bordered select-sm max-w-xs bg-white text-gray-900 border-2 border-gray-300 px-4 pr-10"
                  value={currentUser?.id || ''}
                  onChange={handleUserChange}
                  disabled={allUsers.length === 0}
                >
                  {allUsers.length === 0 ? (
                    <option value="">No users available</option>
                  ) : (
                    allUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
