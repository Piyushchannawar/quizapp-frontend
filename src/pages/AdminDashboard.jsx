import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/admin/quizzes");
        setQuizzes(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("adminToken");
          navigate("/admin/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  function logout() {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Your Quizzes</h2>
        <div className="card-actions">
          <button onClick={logout}>Logout</button>
          <Link to="/admin/quizzes/new" className="link-button primary">
            New Quiz
          </Link>
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : quizzes.length === 0 ? (
        <p>No quizzes yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Code</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <tr key={q._id}>
                <td>{q.title}</td>
                <td>{q.code}</td>
                <td>{q.status}</td>
                <td className="table-actions">
                  <Link
                    to={`/admin/quizzes/${q._id}/edit`}
                    className="link-button link-button-small"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/admin/quizzes/${q._id}/manage`}
                    className="link-button link-button-small"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

