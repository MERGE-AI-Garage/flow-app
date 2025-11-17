import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MyTasks from './pages/MyTasks'
import FlowDesigner from './pages/FlowDesigner'
import NewTask from './pages/NewTask'
import ActiveFlow from './pages/ActiveFlow'
import { UserProvider } from './contexts/UserContext'

function App(): React.ReactElement {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MyTasks />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="flow-designer" element={<FlowDesigner />} />
          <Route path="new-task" element={<NewTask />} />
          <Route path="flows/:id" element={<ActiveFlow />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UserProvider>
  )
}

export default App
