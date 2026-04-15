import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api.js";

export default function StudentQuiz() {
  const { code } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [username, setUsername] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");

  const submitLockRef = useRef(false);
  const usernameTrimmed = useMemo(() => username.trim(), [username]);
  const rollNumberTrimmed = useMemo(() => rollNumber.trim(), [rollNumber]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/quizzes/${code}`);
        setQuiz(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  useEffect(() => {
    const shouldApplyQuizMode = hasStarted && quiz?.status === "ACTIVE" && !result;
    document.body.classList.toggle("quiz-mode", shouldApplyQuizMode);
    return () => document.body.classList.remove("quiz-mode");
  }, [hasStarted, quiz?.status, result]);

  function selectSingleAnswer(qId, idx) {
    setAnswers((prev) => ({ ...prev, [qId]: [idx] }));
  }

  function toggleMultiAnswer(qId, idx) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[qId]) ? prev[qId] : [];
      const next = current.includes(idx)
        ? current.filter((value) => value !== idx)
        : [...current, idx];
      return { ...prev, [qId]: next };
    });
  }

  async function submitAnswers({ reason, isAutoSubmit }) {
    if (!quiz) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError("");
    setInfo("");
    const payloadAnswers = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedIndexes: Array.isArray(answers[q.id]) ? answers[q.id] : []
    }));
    try {
      const res = await api.post(`/quizzes/${code}/submissions`, {
        username: usernameTrimmed,
        rollNumber: rollNumberTrimmed,
        answers: payloadAnswers,
        meta: {
          wasAutoSubmitted: !!isAutoSubmit,
          reason: reason || (isAutoSubmit ? "AUTO_SUBMIT" : "MANUAL_SUBMIT")
        }
      });
      setResult({ score: res.data.score, maxScore: res.data.maxScore });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
      submitLockRef.current = false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await submitAnswers({ reason: "MANUAL_SUBMIT", isAutoSubmit: false });
  }

  async function requestFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) return true;

    // Safari/iOS sometimes only supports webkit-prefixed fullscreen APIs.
    const maybeRequest =
      el.requestFullscreen ||
      // eslint-disable-next-line no-undef
      el.webkitRequestFullscreen ||
      // eslint-disable-next-line no-undef
      document.documentElement.webkitRequestFullscreen ||
      null;

    if (!maybeRequest) return false;
    try {
      await maybeRequest.call(el);
      return true;
    } catch {
      return false;
    }
  }

  async function startQuiz() {
    setError("");
    setInfo("");
    if (!quiz) return;
    if (quiz.status !== "ACTIVE") {
      setError("This quiz is not accepting submissions.");
      return;
    }
    if (!usernameTrimmed) {
      setError("Please enter your name to start.");
      return;
    }
    if (!rollNumberTrimmed) {
      setError("Please enter your roll number to start.");
      return;
    }

    const ok = await requestFullscreen();
    // Allow quiz to start even if fullscreen isn't available on the current device/browser.
    // We still enforce visibility/tab/blur rules.
    setFullscreenEnabled(ok);
    setHasStarted(true);
  }

  useEffect(() => {
    const shouldEnforce =
      hasStarted && quiz?.status === "ACTIVE" && !result && !(quiz?.isReadOnly || !quiz?.isActive);
    if (!shouldEnforce) return;

    const handleViolation = async (reason) => {
      if (submitLockRef.current) return;
      setInfo("Violation detected. Auto submitting your quiz...");
      await submitAnswers({ reason, isAutoSubmit: true });
    };

    const onFullscreenChange = () => {
      if (!fullscreenEnabled) return;
      if (!document.fullscreenElement) {
        handleViolation("VIOLATION_EXIT_FULLSCREEN");
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("VIOLATION_TAB_HIDDEN");
      }
    };

    const onWindowBlur = () => {
      handleViolation("VIOLATION_WINDOW_BLUR");
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [hasStarted, quiz?.status, quiz?.isReadOnly, quiz?.isActive, result, fullscreenEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="card">
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="card">
        <p>{error || "Quiz not found"}</p>
      </div>
    );
  }

  const readOnly = quiz.isReadOnly || !quiz.isActive || !!result;

  return (
    <div className="card">
      <h2>{quiz.title}</h2>
      {quiz.description && <p>{quiz.description}</p>}
      <p>
        Status: <strong>{quiz.status}</strong>
      </p>
      {quiz.status !== "ACTIVE" && (
        <div className="info">
          This quiz is not accepting submissions. You can only view the questions.
        </div>
      )}

      {!readOnly && !hasStarted && (
        <div className="info">
          We try to open the quiz in fullscreen. If fullscreen isn't available on your phone/browser,
          the quiz will still work, but switching apps/tabs may auto-submit.
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        {!readOnly && !hasStarted && (
          <label>
            Roll Number
            <input
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
              disabled={readOnly}
            />
          </label>
        )}

        {!readOnly && !hasStarted && (
          <label>
            Your Name
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={readOnly}
            />
          </label>
        )}

        {!readOnly && !hasStarted && (
          <button type="button" className="primary" onClick={startQuiz}>
            Start Quiz (Fullscreen)
          </button>
        )}

        {!readOnly && hasStarted && (
          <div className="info">
            Student: <strong>{usernameTrimmed}</strong> ({rollNumberTrimmed})
          </div>
        )}

        {(readOnly || hasStarted) &&
          quiz.questions.map((q, idx) => (
            <div key={q.id} className="question-block">
              <h3>
                Q{idx + 1}. {q.text}
              </h3>
              <p className="question-helper">
                {q.allowsMultiple
                  ? "Multiple Choice: select one or more options."
                  : "Single Choice: select exactly one option."}
              </p>
              <div className="options-grid">
                {q.options.map((opt, optIdx) => (
                  <label key={optIdx} className="option-row">
                    <input
                      type={q.allowsMultiple ? "checkbox" : "radio"}
                      name={`q-${q.id}`}
                      checked={
                        Array.isArray(answers[q.id]) && answers[q.id].includes(optIdx)
                      }
                      onChange={() =>
                        q.allowsMultiple
                          ? toggleMultiAnswer(q.id, optIdx)
                          : selectSingleAnswer(q.id, optIdx)
                      }
                      disabled={readOnly || !hasStarted}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        {!readOnly && hasStarted && (
          <button type="submit" className="primary">
            Submit Answers
          </button>
        )}
      </form>
      {result && (
        <div className="info">
          You scored {result.score} out of {result.maxScore}.
        </div>
      )}
    </div>
  );
}

