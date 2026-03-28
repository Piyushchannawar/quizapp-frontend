import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api.js";

export default function QuizManage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function load() {
    try {
      const res = await api.get(`/admin/quizzes/${id}`);
      setQuiz(res.data.quiz);
      setSubmissions(res.data.submissions);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load quiz");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function startQuiz() {
    try {
      await api.post(`/admin/quizzes/${id}/start`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start quiz");
    }
  }

  async function stopQuiz() {
    try {
      await api.post(`/admin/quizzes/${id}/stop`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to stop quiz");
    }
  }

  if (!quiz) {
    return (
      <div className="card">
        <p>Loading...</p>
      </div>
    );
  }

  const studentUrl = `${window.location.origin}/quiz/${quiz.code}`;

  return (
    <div className="card">
      <button onClick={() => navigate("/admin/quizzes")}>Back</button>
      <h2>Manage Quiz: {quiz.title}</h2>
      <p>
        <strong>Code:</strong> {quiz.code}
      </p>
      <p>
        <strong>Status:</strong> {quiz.status}
      </p>
      <div className="manage-actions">
        {quiz.status !== "ACTIVE" && (
          <button className="primary" onClick={startQuiz}>
            Start Quiz
          </button>
        )}
        {quiz.status === "ACTIVE" && (
          <button className="danger" onClick={stopQuiz}>
            Stop Quiz
          </button>
        )}
      </div>
      <div className="qr-section">
        <h3>Student Join via QR</h3>
        <QRCodeCanvas value={studentUrl} size={180} />
        <p>{studentUrl}</p>
      </div>
      {error && <div className="error">{error}</div>}

      <h3>Submissions</h3>
      {submissions.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Score</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s._id}>
                <td>{s.username}</td>
                <td>
                  {s.score}/{s.maxScore}
                </td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

