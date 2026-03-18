import React, { useState, useEffect } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("input");
  const [conflictType, setConflictType] = useState("Team Conflict");
  const [user1ID, setUser1ID] = useState("");
  const [user2ID, setUser2ID] = useState("");
  const [user1Message, setUser1Message] = useState("");
  const [user2Message, setUser2Message] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyAnalysis, setHistoryAnalysis] = useState(null);

  const handleAnalyze = async () => {
    try {
      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictType,
          user1ID,
          user2ID,
          user1Message,
          user2Message
        })
      });

      const data = await res.json();
      setResult(data);
      setActiveTab("output");
    } catch (err) {
      console.error("Error:", err);
      alert("Analysis failed");
    }
  };

  const analyzeHistory = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/analyze-history/${user1ID}`
      );
      const data = await res.json();
      setHistoryAnalysis(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 to-indigo-100 p-10">
      <h1 className="text-3xl font-bold text-center text-violet-900 mb-8">
        AI Conflict Resolution Dashboard
      </h1>

      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">

        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b pb-4">
          <button onClick={() => setActiveTab("input")}>
            Input
          </button>

          <button onClick={() => setActiveTab("output")}>
            Output
          </button>

          <button onClick={() => setActiveTab("history")}>
            History
          </button>
        </div>

        {/* ================= INPUT TAB ================= */}
        {activeTab === "input" && (
          <div className="space-y-4">

            <select
              value={conflictType}
              onChange={(e) => setConflictType(e.target.value)}
              className="w-full p-3 rounded-lg border border-violet-300 bg-violet-50"
            >
              <option>Team Conflict</option>
              <option>Manager vs Employee</option>
              <option>Peer Conflict</option>
              <option>Client Conflict</option>
            </select>

            <input
              placeholder="User 1 ID"
              value={user1ID}
              onChange={(e) => setUser1ID(e.target.value)}
              className="w-full p-3 rounded-lg border border-violet-300 bg-violet-50"
            />

            <textarea
              placeholder="User 1 Message"
              value={user1Message}
              onChange={(e) => setUser1Message(e.target.value)}
              className="w-full p-4 rounded-lg border border-violet-300 bg-violet-50"
            />

            <input
              placeholder="User 2 ID"
              value={user2ID}
              onChange={(e) => setUser2ID(e.target.value)}
              className="w-full p-3 rounded-lg border border-violet-300 bg-violet-50"
            />

            <textarea
              placeholder="User 2 Message"
              value={user2Message}
              onChange={(e) => setUser2Message(e.target.value)}
              className="w-full p-4 rounded-lg border border-violet-300 bg-violet-50"
            />

            <button
              onClick={handleAnalyze}
              className="bg-violet-800 text-white px-6 py-3 rounded-xl hover:bg-violet-900 transition"
            >
              Analyze Conflict
            </button>
          </div>
        )}

        {/* ================= OUTPUT TAB ================= */}
        {activeTab === "output" && result && (

          <div className="space-y-6">

          <div className="p-6 bg-violet-100 rounded-xl">
          <p><b>Conflict Intensity:</b> {result.intensity}</p>
          <p><b>Probability:</b> {result.probability}%</p>
          <p><b>User1 Emotion:</b> {result.emotion1}</p>
          <p><b>User2 Emotion:</b> {result.emotion2}</p>
          </div>

          <div className="p-6 bg-violet-50 rounded-xl">

          <h3 className="font-semibold mb-2">Trigger Words</h3>

          <p><b>User1:</b> {result.triggers1.join(", ") || "None"}</p>

          <p><b>User2:</b> {result.triggers2.join(", ") || "None"}</p>

          </div>

          {result.rephrasedUsers.length > 0 && (

          <div className="p-6 bg-purple-200 rounded-xl">

          <h3 className="font-semibold mb-3">
          Resolution Strategy
          </h3>

          {result.rephrasedUsers.map((item,index)=>(
          <div key={index}>

          <p>
          Suggested rephrase for <b>{item.userID}</b>
          </p>

          <p className="italic text-violet-900">
          {item.suggestion}
          </p>

          </div>
          ))}

          </div>

          )}

          </div>

          )}

        {/* ================= HISTORY TAB ================= */}
        {activeTab === "history" && (
          <div className="space-y-4">

            <input
              type="text"
              placeholder="Enter User ID to analyze behavior"
              value={user1ID}
              onChange={(e) => setUser1ID(e.target.value)}
              className="w-full p-3 rounded-lg border border-violet-300 bg-violet-50"
            />

            <button
              onClick={analyzeHistory}
              className="bg-violet-700 text-white px-4 py-2 rounded"
            >
              Analyze History
            </button>

            {historyAnalysis && (
              <div className="p-5 bg-violet-100 rounded-xl mt-4">
                <p><b>Total Interactions:</b> {historyAnalysis.totalInteractions}</p>
                <p><b>Negative Interactions:</b> {historyAnalysis.negativeInteractions}</p>
                <p><b>Average Negativity:</b> {historyAnalysis.averageNegativity}</p>
                <p><b>Behavior Type:</b> {historyAnalysis.behavior}</p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default App;