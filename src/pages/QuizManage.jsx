import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api.js";

function compareRollNumbers(a = "", b = "") {
  const left = String(a || "").trim();
  const right = String(b || "").trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function csvCell(value) {
  const safeValue = value == null ? "" : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

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

  async function downloadResults() {
    const downloadBlob = (blob, filename) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    };

    const exportFromLoadedSubmissions = () => {
      const sorted = [...submissions].sort((a, b) =>
        compareRollNumbers(a.rollNumber || a.rollNo, b.rollNumber || b.rollNo)
      );
      const header = ["Roll No", "Username", "Score", "Max Score", "Submitted At"];
      const rows = sorted.map((s) => [
        s.rollNumber || s.rollNo || "",
        s.username || "",
        s.score ?? "",
        s.maxScore ?? "",
        s.createdAt ? new Date(s.createdAt).toISOString() : ""
      ]);
      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => csvCell(cell)).join(","))
        .join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `${quiz.code}-results.csv`);
    };

    try {
      setError("");
      const response = await api.get(`/admin/quizzes/${id}/submissions/export`, {
        responseType: "blob"
      });
      downloadBlob(new Blob([response.data]), `${quiz.code}-results.csv`);
    } catch (err) {
      // Fallback for older backends that don't expose /submissions/export yet.
      if (submissions.length > 0) {
        exportFromLoadedSubmissions();
        setError("Backend export endpoint unavailable. Downloaded from currently loaded data.");
        return;
      }
      setError(err.response?.data?.message || "Failed to download results");
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
  const sortedSubmissions = [...submissions].sort((a, b) =>
    compareRollNumbers(a.rollNumber || a.rollNo, b.rollNumber || b.rollNo)
  );

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

      <div className="manage-actions">
        <h3>Submissions</h3>
        {quiz.status === "STOPPED" && submissions.length > 0 && (
          <button type="button" onClick={downloadResults}>
            Download Results (Excel)
          </button>
        )}
      </div>
      {submissions.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Username</th>
              <th>Score</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubmissions.map((s) => (
              <tr key={s._id}>
                <td>{s.rollNumber || s.rollNo || "-"}</td>
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

