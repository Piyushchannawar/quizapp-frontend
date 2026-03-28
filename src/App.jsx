import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminSignup from "./pages/AdminSignup.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import QuizEditor from "./pages/QuizEditor.jsx";
import QuizManage from "./pages/QuizManage.jsx";
import StudentHome from "./pages/StudentHome.jsx";
import StudentQuiz from "./pages/StudentQuiz.jsx";

function getToken() {
  return localStorage.getItem("adminToken");
}

const AdminRoute = ({ children }) => {
  const token = getToken();
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo">
          Quiz Platform
        </Link>
        <nav>
          <Link to="/">Student</Link>
          <Link to="/admin/login">Admin</Link>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/quiz/:code" element={<StudentQuiz />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route
            path="/admin/quizzes"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/quizzes/new"
            element={
              <AdminRoute>
                <QuizEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/quizzes/:id/edit"
            element={
              <AdminRoute>
                <QuizEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/quizzes/:id/manage"
            element={
              <AdminRoute>
                <QuizManage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

