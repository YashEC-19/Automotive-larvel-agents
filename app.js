const { useState, useRef } = React;

const cache = {};

function App() {
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("report");
  const [history, setHistory] = useState([]);

  const formatTimeout = useRef(null);

  // 🔥 STREAM CALL
  const streamCall = async (model, prompt, onChunk) => {
    const res = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: model.includes("70b") ? 2000 : 800,
        temperature: 0.7
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const json = line.replace("data: ", "");
        if (json === "[DONE]") return full;

        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;

          if (content) {
            full += content;
            onChunk(full);
          }
        } catch {}
      }
    }

    return full;
  };

  // 🧠 AGENTS
  const researchAgent = (q) =>
    `Extract detailed specs, variants, engine/motor, mileage, real models for "${q}" in India.`;

  const marketAgent = (q) =>
    `Provide pricing segments, competitors, and trends in India for "${q}".`;

  const featureAgent = (q) =>
    `List key features, pros, cons, and usability for "${q}" in Indian conditions.`;

  const writerAgent = (q, r, m, f) => `
Create a structured automotive report for "${q}".

Executive Summary
Market Overview
Key Features
Pricing and Segments
Pros
Cons
Verdict

DATA:
${r}
${m}
${f}

Rules:
- Detailed but clean
- No markdown
- No **
`;

  // 🚀 RUN
  const run = async () => {
    if (!query.trim()) return;

    if (cache[query]) {
      setOutput(cache[query]);
      setActiveTab("report");
      return;
    }

    setLoading(true);
    setOutput("<p>⚡ Agents working...</p>");
    setActiveTab("report");

    let research = "";
    let market = "";
    let features = "";

    await Promise.all([
      streamCall("llama-3.1-8b-instant", researchAgent(query), (t) => {
        research = t;
        updateUI("🔍 Research done");
      }),
      streamCall("llama-3.1-8b-instant", marketAgent(query), (t) => {
        market = t;
        updateUI("📊 Market done");
      }),
      streamCall("llama-3.1-8b-instant", featureAgent(query), (t) => {
        features = t;
        updateUI("⚙️ Features done");
      })
    ]);

    let finalText = "";

    setOutput("<p>🧠 Generating final report...</p>");

    await streamCall(
      "llama-3.3-70b-versatile",
      writerAgent(query, research, market, features),
      (t) => {
        finalText = t;
        updateFormatted(t);
      }
    );

    const finalFormatted = format(finalText);

    cache[query] = finalFormatted;

    // ✅ SAVE HISTORY
    setHistory(prev => [
      { query, result: finalFormatted },
      ...prev
    ]);

    setOutput(finalFormatted);
    setLoading(false);
  };

  const updateUI = (msg) => {
    setOutput(`<p>${msg}</p>`);
  };

  const updateFormatted = (text) => {
    if (!formatTimeout.current) {
      formatTimeout.current = setTimeout(() => {
        setOutput(format(text));
        formatTimeout.current = null;
      }, 200);
    }
  };

  // 🎨 FORMATTER
  const format = (text) => {
    const titles = [
      "Executive Summary",
      "Market Overview",
      "Key Features",
      "Pricing and Segments",
      "Pros",
      "Cons",
      "Verdict"
    ];

    const getColor = (title) => {
      const t = title.toLowerCase();
      if (t.includes("summary")) return "blue";
      if (t.includes("market")) return "pink";
      if (t.includes("feature")) return "orange";
      if (t.includes("pros")) return "green";
      if (t.includes("cons")) return "red";
      return "default";
    };

    let html = "";
    let currentTitle = "";
    let currentContent = "";

    const lines = text.replace(/\*\*/g, "").split("\n");

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const isTitle = titles.some(
        t => trimmed.toLowerCase() === t.toLowerCase()
      );

      if (isTitle) {
        if (currentTitle && currentContent) {
          html += `
            <div class="report-card ${getColor(currentTitle)}">
              <div class="report-title">${currentTitle}</div>
              <div class="report-content">${currentContent}</div>
            </div>
          `;
        }
        currentTitle = trimmed;
        currentContent = "";
      } else {
        currentContent += trimmed + "<br/><br/>";
      }
    });

    if (currentTitle && currentContent) {
      html += `
        <div class="report-card ${getColor(currentTitle)}">
          <div class="report-title">${currentTitle}</div>
          <div class="report-content">${currentContent}</div>
        </div>
      `;
    }

    return html || "<p>Generating...</p>";
  };

  return (
    <div className="layout">

      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>⚡ Auto AI</h2>

        <div 
          className={`menu-item ${activeTab === "report" ? "active" : ""}`}
          onClick={() => setActiveTab("report")}
        >
          📄 Report
        </div>

        <div 
          className={`menu-item ${activeTab === "agents" ? "active" : ""}`}
          onClick={() => setActiveTab("agents")}
        >
          🤖 Agents
        </div>

        <div 
          className={`menu-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          🕓 History
        </div>
      </div>

      {/* MAIN */}
      <div className="main-content">
        <h1>Hybrid Multi-Model Automotive AI</h1>

        <div className="input-container">
          <input
            placeholder="Ask anything automotive..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) run();
            }}
          />
          <button onClick={run}>
            {loading ? "Thinking..." : "Generate"}
          </button>
        </div>

        <div className="output-container">

          {/* REPORT */}
          {activeTab === "report" && (
            <div dangerouslySetInnerHTML={{
              __html: output || "<p>Results will appear here...</p>"
            }} />
          )}

          {/* AGENTS */}
          {activeTab === "agents" && (
            <div className="panel">
              <h3>Active Models</h3>
              <div className="agent-status">
                <div>⚡ Research → llama-3.1-8b-instant</div>
                <div>📊 Market → llama-3.1-8b-instant</div>
                <div>⚙️ Feature → llama-3.1-8b-instant</div>
                <div>🧠 Writer → llama-3.3-70b-versatile</div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {activeTab === "history" && (
            <div className="panel">
              <h3>Query History</h3>

              {history.length === 0 && <p>No history yet</p>}

              {history.map((item, i) => (
                <div 
                  key={i} 
                  className="history-item"
                  onClick={() => {
                    setQuery(item.query);
                    setOutput(item.result);
                    setActiveTab("report");
                  }}
                >
                  {item.query}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);