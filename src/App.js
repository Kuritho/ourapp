import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Profile from './pages/Profile/Profile';
import Monthsary from './pages/Monthsary/Monthsary';
import MonthsaryDetail from './pages/Monthsary/MonthsaryDetail';
import Gallery from './pages/Gallery/Gallery';
import Videos from './pages/Videos/Videos';
import Games from './pages/Games/Games';
import Rewards from './pages/Rewards/Rewards';
import Admin from './pages/Admin/Admin';
import CalendarPage from './pages/Calendar/CalendarPage';
import Gcash from './pages/Gcash/Gcash';  // Add Gcash import

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Styles
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <div className="app">
            <Routes>
              {/* Auth Routes - No Navbar */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected Routes - With Navbar */}
              <Route element={<MainLayout />}>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/monthsary" element={
                  <ProtectedRoute>
                    <Monthsary />
                  </ProtectedRoute>
                } />
                <Route path="/monthsary/:id" element={
                  <ProtectedRoute>
                    <MonthsaryDetail />
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                } />
                <Route path="/gallery" element={
                  <ProtectedRoute>
                    <Gallery />
                  </ProtectedRoute>
                } />
                <Route path="/videos" element={
                  <ProtectedRoute>
                    <Videos />
                  </ProtectedRoute>
                } />
                <Route path="/games" element={
                  <ProtectedRoute>
                    <Games />
                  </ProtectedRoute>
                } />
                <Route path="/gcash" element={
                  <ProtectedRoute>
                    <Gcash />
                  </ProtectedRoute>
                } />
                <Route path="/rewards" element={
                  <ProtectedRoute>
                    <Rewards />
                  </ProtectedRoute>
                } />
                <Route path="/admin/*" element={
                  <ProtectedRoute adminOnly={true}>
                    <Admin />
                  </ProtectedRoute>
                } />
              </Route>

              {/* 404 - Redirect to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast Notifications */}
            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;