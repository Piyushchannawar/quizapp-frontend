import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api.js";

export default function QuizEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([
    { text: "", options: ["", "", "", ""], correctIndexes: [0] }
  ]);
  const [status, setStatus] = useState("DRAFT");
  const [error, setError] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdit) return;
    async function load() {
      try {
        const res = await api.get(`/admin/quizzes/${id}`);
        const quiz = res.data.quiz;
        setTitle(quiz.title);
        setDescription(quiz.description || "");
        setStatus(quiz.status);
        setQuestions(
          quiz.questions.map((q) => ({
            id: q._id,
            text: q.text,
            options: q.options.map((o) => o.text),
            correctIndexes: q.options
              .map((o, idx) => (o.isCorrect ? idx : null))
              .filter((v) => v !== null)
          }))
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load quiz");
      }
    }
    load();
  }, [id, isEdit]);

  function updateQuestion(idx, field, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  }

  function updateOption(qIdx, oIdx, value) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((opt, j) => (j === oIdx ? value : opt)) }
          : q
      )
    );
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { text: "", options: ["", "", "", ""], correctIndexes: [0] }
    ]);
  }

  function toggleCorrect(qIdx, oIdx) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const current = Array.isArray(q.correctIndexes) ? q.correctIndexes : [];
        const exists = current.includes(oIdx);
        let next = exists ? current.filter((idx) => idx !== oIdx) : [...current, oIdx];
        if (next.length === 0) next = [oIdx];
        return { ...q, correctIndexes: next };
      })
    );
  }

  function mapGeneratedToEditorQuestions(generatedQuestions) {
    return generatedQuestions.map((q) => {
      const correctIndexes = q.options
        .map((o, idx) => (o.isCorrect ? idx : null))
        .filter((v) => v !== null);
      const safeCorrect =
        correctIndexes.length > 0 ? correctIndexes : [0];
      return {
        text: q.text,
        options: q.options.map((o) => o.text),
        correctIndexes: safeCorrect
      };
    });
  }

  async function handleGenerateFromAi() {
    setAiError("");
    setError("");
    const hasFilledQuestions = questions.some(
      (q) =>
        (q.text && q.text.trim()) ||
        q.options.some((o) => o && String(o).trim())
    );
    if (
      hasFilledQuestions &&
      !window.confirm(
        "Replace all current questions with the AI-generated set? Title and description are only overwritten if they are empty."
      )
    ) {
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post("/admin/quizzes/generate", {
        content: aiContent,
        numQuestions: aiQuestionCount,
        title: title.trim() || undefined
      });
      const data = res.data;
      if (!data.questions?.length) {
        setAiError("No questions returned. Try again.");
        return;
      }
      if (!title.trim() && data.title) {
        setTitle(data.title);
      }
      if (!description.trim() && data.description) {
        setDescription(data.description);
      }
      setQuestions(mapGeneratedToEditorQuestions(data.questions));
    } catch (err) {
      setAiError(err.response?.data?.message || "Failed to generate quiz");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const payloadQuestions = questions.map((q) => {
      const correctIndexes = Array.isArray(q.correctIndexes) && q.correctIndexes.length
        ? q.correctIndexes
        : [0];
      return {
        _id: q.id,
        text: q.text,
        options: q.options.map((text, idx) => ({
          text,
          isCorrect: correctIndexes.includes(idx)
        }))
      };
    });
    const body = { title, description, questions: payloadQuestions };
    try {
      if (isEdit) {
        await api.put(`/admin/quizzes/${id}`, body);
      } else {
        await api.post("/admin/quizzes", body);
      }
      navigate("/admin/quizzes");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save quiz");
    }
  }

  const readOnly = status !== "DRAFT";

  return (
    <div className="card">
      <h2>{isEdit ? "Edit Quiz" : "New Quiz"}</h2>
      {readOnly && (
        <div className="info">
          This quiz is {status}. Questions cannot be edited anymore.
        </div>
      )}
      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={readOnly}
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
          />
        </label>
        {!readOnly && (
          <div className="ai-panel">
            <h3 className="ai-panel-title">Generate with Gemini</h3>
            <p className="ai-panel-hint">
              Paste notes, a lesson, or reading material. Choose how many
              multiple-choice questions to create, then review and edit before
              saving.
            </p>
            <label>
              Source content
              <textarea
                className="ai-content-input"
                value={aiContent}
                onChange={(e) => setAiContent(e.target.value)}
                placeholder="Paste the material you want the quiz to be based on…"
                rows={6}
              />
            </label>
            <label className="ai-count-row">
              Number of questions
              <input
                type="number"
                min={1}
                max={50}
                value={aiQuestionCount}
                onChange={(e) =>
                  setAiQuestionCount(
                    Math.min(50, Math.max(1, Number(e.target.value) || 1))
                  )
                }
              />
            </label>
            <button
              type="button"
              className="primary"
              onClick={handleGenerateFromAi}
              disabled={aiLoading || !aiContent.trim()}
            >
              {aiLoading ? "Generating…" : "Generate questions"}
            </button>
            {aiError && <div className="error">{aiError}</div>}
          </div>
        )}
        <h3>Questions</h3>
        {questions.map((q, idx) => (
          <div key={idx} className="question-block">
            <label>
              Question {idx + 1}
              <input
                value={q.text}
                onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                required
                disabled={readOnly}
              />
            </label>
            <div className="question-meta-row">
              <span className="question-helper">
                Tick all correct options. You can select one or multiple correct answers.
              </span>
            </div>
            <div className="options-grid">
              {q.options.map((opt, oIdx) => (
                <label key={oIdx} className="option-row">
                  <span className="option-tag">Option {oIdx + 1}</span>
                  <input
                    className="option-text-input"
                    value={opt}
                    onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                    required
                    disabled={readOnly}
                  />
                  <div className="option-correct">
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(q.correctIndexes) &&
                        q.correctIndexes.includes(oIdx)
                      }
                      onChange={() => toggleCorrect(idx, oIdx)}
                      disabled={readOnly}
                    />
                    <span>Correct</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
        {!readOnly && (
          <button type="button" onClick={addQuestion}>
            Add Question
          </button>
        )}
        {error && <div className="error">{error}</div>}
        {!readOnly && (
          <button type="submit" className="primary">
            Save
          </button>
        )}
      </form>
    </div>
  );
}

