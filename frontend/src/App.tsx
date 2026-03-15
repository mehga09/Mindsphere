import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Survey from './pages/Survey';
import Home from './pages/Home';
import SessionRunner from './pages/SessionRunner';
import Analytics from './pages/Analytics';
import AdminDashboard from './pages/AdminDashboard';
import Schedule from './pages/Schedule';
import TodoTasks from './pages/TodoTasks';
import DailyPlanner from './pages/DailyPlanner';
import { initSync } from './utils/syncManager';
import { registerServiceWorker } from './utils/notifications';

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

function App() {
  useEffect(() => {
    initSync();
    registerServiceWorker();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/survey" element={
            <PrivateRoute><Survey /></PrivateRoute>
          } />
          <Route path="/session/:contentId" element={
            <PrivateRoute><SessionRunner /></PrivateRoute>
          } />
          <Route path="/analytics" element={
            <PrivateRoute><Analytics /></PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute><AdminDashboard /></PrivateRoute>
          } />
          <Route path="/schedule" element={
            <PrivateRoute><Schedule /></PrivateRoute>
          } />
          <Route path="/plan/:planId/tasks" element={<TodoTasks />} />
          <Route path="/daily-planner" element={<DailyPlanner />} />
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
