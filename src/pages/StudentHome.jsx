import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentHome() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!code) return;
    navigate(`/quiz/${code.toUpperCase()}`);
  }

  return (
    <div className="card narrow">
      <h2>Join Quiz</h2>
      <p>Enter the quiz code shown by your instructor or scan the QR code with your phone.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Quiz Code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. ABC123"
            required
          />
        </label>
        <button className="primary" type="submit">
          Join
        </button>
      </form>
    </div>
  );
}

