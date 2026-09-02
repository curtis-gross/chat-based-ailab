import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  Trash2, 
  Save, 
  RefreshCw, 
  Cpu, 
  Database, 
  Wrench, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  Sparkles,
  Smartphone,
  Mail,
  Image as ImageIcon,
  Cloud,
  Download,
  Terminal,
  FileText,
  Sliders,
  Settings,
  Share2,
  Shield
} from "lucide-react";
import { useCompanyContext } from "../context/CompanyContext";


interface ChatMessage {
  sender: "user" | "agent";
  text: string;
  time?: string;
}

interface CampaignState {
  campaignGoal: string;
  currentStatus: "Idle" | "Running" | "Completed" | "Error";
  activeAgent: string;
  chatHistory: ChatMessage[];
  logs: string[];
  artifacts: {
    brief?: {
      name: string;
      objective: string;
      divisionId: string;
      audienceSegment: string;
      projectedBudget: number;
      tier: string;
      expectedStartDate?: string;
      timelineDays?: number;
      primaryChannel?: string;
    } | null;
    feasibility?: string | null;
    prioritization?: string | null;
    research?: string | null;
    creative?: {
      theme: string;
      headline: string;
      subHeadline: string;
      visualDirection: string;
      explainableCTRScore: number;
      assets: { type: string; title: string; body: string; dimensions: string; imgText: string; imgUrl?: string }[];
    } | null;
    compliance?: {
      passed: boolean;
      checklist: { id: string; rule: string; status: "Pass" | "Warning" | "Critical Danger"; details: string }[];
      report: string;
    } | null;
    integration?: {
      payload: any;
      dispatchLog: string;
    } | null;
    judge?: string | null;
    summary?: string | null;
  };
}

export default function PlaygroundConsole() {
  const { name: companyName } = useCompanyContext();
  const [state, setState] = useState<CampaignState>({
    campaignGoal: "",
    currentStatus: "Idle",
    activeAgent: "None",
    chatHistory: [],
    logs: [],
    artifacts: {
      brief: null,
      feasibility: null,
      prioritization: null,
      research: null,
      creative: null,
      compliance: null,
      integration: null,
      judge: null,
      summary: null
    }
  });

  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"flow" | "logs" | "artifacts" | "snapshots" | "grounding">("flow");
  const [activeArtifactSubTab, setActiveArtifactSubTab] = useState<"summary" | "brief" | "feasibility" | "prioritization" | "research" | "creative" | "compliance" | "outbound" | "judge">("summary");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false);
  const [snapshotStatusMsg, setSnapshotStatusMsg] = useState("");
  const [c360Data, setC360Data] = useState<any[]>([]);
  const [m360Data, setM360Data] = useState<any[]>([]);
  const [isGroundingLoading, setIsGroundingLoading] = useState(false);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const renderHTMLAsJSX = (html: string | null | undefined): React.ReactNode => {
    if (!html) return null;

    try {
      const parser = new DOMParser();
      // Clean string from any trailing markdown wrap symbols if any
      const cleanedHtml = html.replace(/^```html\s*/i, "").replace(/```$/, "").trim();
      const doc = parser.parseFromString(cleanedHtml, "text/html");

      const nodeToJSX = (node: Node, key: string): React.ReactNode => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.nodeValue;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return null;
        }

        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Recursively convert children nodes
        const children = Array.from(element.childNodes).map((child, i) =>
          nodeToJSX(child, `${key}-${i}`)
        );

        switch (tagName) {
          case "h1":
            return <h1 key={key} className="text-slate-800 text-sm font-extrabold font-sans tracking-tight mt-6 mb-2.5 block">{children}</h1>;
          case "h2":
            return <h2 key={key} className="text-slate-450 font-mono text-[9px] uppercase tracking-wider mt-5 mb-2 block border-b border-slate-200 pb-1.5">{children}</h2>;
          case "h3":
            return <h3 key={key} className="text-slate-800 text-xs font-bold font-sans mt-3.5 mb-1.5 block">{children}</h3>;
          case "h4":
            return <h4 key={key} className="text-slate-800 text-[11px] font-bold font-sans mt-2.5 mb-1 block">{children}</h4>;
          case "p":
            return <p key={key} className="text-slate-700 text-xs leading-relaxed font-sans mb-3">{children}</p>;
          case "ul":
            return <ul key={key} className="list-disc pl-5 mb-3 space-y-1.5 text-slate-700 font-sans text-xs">{children}</ul>;
          case "li":
            return <li key={key} className="leading-relaxed">{children}</li>;
          case "strong":
          case "b":
            return <strong key={key} className="font-bold text-slate-900">{children}</strong>;
          case "em":
          case "i":
            return <em key={key} className="italic text-slate-700">{children}</em>;
          case "table":
            return (
              <div key={key} className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-xs font-sans text-left">{children}</table>
              </div>
            );
          case "thead":
            return <thead key={key} className="bg-slate-100 font-semibold text-slate-750">{children}</thead>;
          case "tbody":
            return <tbody key={key} className="divide-y divide-slate-150 bg-white text-slate-700">{children}</tbody>;
          case "tr":
            return <tr key={key} className="hover:bg-slate-50/50">{children}</tr>;
          case "th":
            return <th key={key} className="px-4 py-2 font-mono text-[9px] uppercase tracking-wider">{children}</th>;
          case "td":
            return <td key={key} className="px-4 py-2 leading-relaxed">{children}</td>;
          default:
            return <React.Fragment key={key}>{children}</React.Fragment>;
        }
      };

      return (
        <div className="space-y-1 text-left">
          {Array.from(doc.body.childNodes).map((node, i) => nodeToJSX(node, `html-node-${i}`))}
        </div>
      );
    } catch (err) {
      console.error("HTML parse fallback error:", err);
      return <div className="text-xs text-slate-700 whitespace-pre-wrap">{html}</div>;
    }
  };

  // Load state on mount
  const fetchState = async () => {
    try {
      const res = await fetch("/api/campaign/state");
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error("Error fetching campaign state:", err);
    }
  };

  const fetchSnapshots = async () => {
    try {
      setIsSnapshotsLoading(true);
      const res = await fetch("/api/campaign/snapshots");
      const data = await res.json();
      setSnapshotsList(data);
    } catch (err) {
      console.error("Error loading snapshots:", err);
    } finally {
      setIsSnapshotsLoading(false);
    }
  };

  const fetchGroundingData = async () => {
    try {
      setIsGroundingLoading(true);
      const [resC360, resM360] = await Promise.all([
        fetch("/api/data/c360"),
        fetch("/api/data/m360")
      ]);
      const dC360 = await resC360.json();
      const dM360 = await resM360.json();
      setC360Data(dC360);
      setM360Data(dM360);
    } catch (err) {
      console.error("Error loading grounding data:", err);
    } finally {
      setIsGroundingLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    fetchSnapshots();
    fetchGroundingData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to clear the active campaign session?")) return;
    try {
      const res = await fetch("/api/campaign/reset", { method: "POST" });
      const data = await res.json();
      setState(data.state);
      setSnapshotName("");
    } catch (err) {
      console.error("Error resetting session:", err);
    }
  };

  const triggerMessageSend = async (messageText: string) => {
    setIsSending(true);

    // Optimistically update chat history local state
    setState(prev => ({
      ...prev,
      campaignGoal: prev.campaignGoal || messageText,
      currentStatus: "Running",
      chatHistory: [...prev.chatHistory, { sender: "user", text: messageText, time: new Date().toLocaleTimeString() }]
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText })
      });

      if (!response.body) throw new Error("No response body stream available.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataString = line.slice(6).trim();
            try {
              const data = JSON.parse(dataString);
              
              if (currentEvent === "log") {
                setState(prev => ({
                  ...prev,
                  logs: [...prev.logs, data.line]
                }));
              } else if (currentEvent === "agent_start") {
                setState(prev => ({
                  ...prev,
                  activeAgent: data.agentName
                }));
              } else if (currentEvent === "agent_end") {
                // Pull fresh state with structured artifacts
                await fetchState();
              } else if (currentEvent === "completed") {
                await fetchState();
                setIsSending(false);
              } else if (currentEvent === "state_update") {
                setState(data);
              } else if (currentEvent === "error") {
                await fetchState();
                setIsSending(false);
              }
            } catch (err) {
              console.warn("SSE json parse failure:", dataString);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error communicating with Chat stream API:", err);
      setState(prev => ({
        ...prev,
        currentStatus: "Error",
        activeAgent: "None",
        chatHistory: [...prev.chatHistory, { sender: "agent", text: "Communication pipeline error. Please check backend server log." }]
      }));
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;
    const userMsg = chatInput;
    setChatInput("");
    await triggerMessageSend(userMsg);
  };

  useEffect(() => {
    const handleCampaignDecision = (e: Event) => {
      const decision = (e as CustomEvent).detail;
      const text = decision === "approve" ? "APPROVE_CAMPAIGN" : "DENY_CAMPAIGN";
      triggerMessageSend(text);
    };
    window.addEventListener("campaign_decision", handleCampaignDecision);
    return () => window.removeEventListener("campaign_decision", handleCampaignDecision);
  }, [isSending]);

  const handleSaveSnapshot = async () => {
    if (!snapshotName.trim()) return;
    try {
      setSnapshotStatusMsg("Uploading session state snapshot to storage...");
      const res = await fetch("/api/campaign/save-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: snapshotName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSnapshotStatusMsg(`✓ Snapshot successfully saved to ${data.location}`);
        fetchSnapshots();
      } else {
        setSnapshotStatusMsg(`❌ Failed: ${data.error}`);
      }
    } catch (err: any) {
      setSnapshotStatusMsg(`❌ Failed: ${err.message}`);
    }
  };

  const handleLoadSnapshot = async (name: string) => {
    if (!window.confirm(`Restore session state from snapshot: "${name}"?`)) return;
    try {
      setSnapshotStatusMsg(`Loading snapshot "${name}"...`);
      const res = await fetch("/api/campaign/load-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok) {
        setState(data.state);
        setSnapshotStatusMsg(`✓ Restored snapshot: "${name}"`);
      } else {
        setSnapshotStatusMsg(`❌ Failed: ${data.error}`);
      }
    } catch (err: any) {
      setSnapshotStatusMsg(`❌ Failed: ${err.message}`);
    }
  };

  const handleLoadLast = async () => {
    try {
      setSnapshotStatusMsg("Retrieving latest snapshot from storage...");
      const res = await fetch("/api/campaign/load-last");
      const data = await res.json();
      if (res.ok) {
        setState(data.state);
        setSnapshotStatusMsg(`✓ Restored latest snapshot: "${data.name}"`);
      } else {
        setSnapshotStatusMsg(`❌ Failed: ${data.error}`);
      }
    } catch (err: any) {
      setSnapshotStatusMsg(`❌ Failed: ${err.message}`);
    }
  };

  const handleDeleteSnapshot = async (name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete snapshot "${name}"?`)) return;
    try {
      setSnapshotStatusMsg(`Deleting snapshot "${name}"...`);
      const res = await fetch("/api/campaign/delete-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned an invalid non-JSON response (HTTP status: ${res.status}). If you just added this route, please restart the backend server.`);
      }
      if (res.ok) {
        setSnapshotStatusMsg(`✓ Deleted snapshot: "${name}"`);
        fetchSnapshots();
      } else {
        setSnapshotStatusMsg(`❌ Failed to delete: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setSnapshotStatusMsg(`❌ Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full text-left font-sans">
      
      {/* LEFT COLUMN: Orchestrator Chat */}
      <div className="xl:w-5/12 flex flex-col min-h-[780px] bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="border-b border-slate-800 pb-4 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 font-semibold mb-2">
            <Bot className="w-3 h-3 text-indigo-400" />
            Root Orchestration Node
          </span>
          <h3 className="text-base font-bold text-white tracking-tight">Campaign Playground</h3>
          <p className="text-xs text-slate-400 mt-1">
            Build {companyName || 'Keurig Dr Pepper'} campaigns in real time. Submit your instructions and watch the agent mesh run.
          </p>
        </div>

        {/* Messages view */}
        <div className="flex-1 overflow-y-auto max-h-[620px] min-h-[450px] bg-slate-950/80 rounded-xl p-4 border border-slate-850 space-y-4 scrollbar-thin">
          {state.chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-1`}>
              <span className="text-[8px] font-mono font-semibold text-slate-500 uppercase px-1">
                {msg.sender === "user" ? "Brand Manager" : "Root Orchestrator"}
              </span>
              <div className={`max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed font-sans ${
                msg.sender === "user" 
                  ? "bg-indigo-600 text-white rounded-tr-none text-right font-medium" 
                  : "bg-slate-800 text-slate-100 rounded-tl-none text-left"
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Active execution status loader */}
        {isSending && (
          <div className="mt-3 p-3 bg-slate-950 border border-indigo-950/40 rounded-xl flex items-center gap-3 animate-pulse">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="text-xs text-slate-300 font-mono">
              <span className="font-bold text-indigo-400">
                {state.activeAgent === "None" || !state.activeAgent ? "Root Orchestrator" : state.activeAgent}
              </span> is executing...
            </div>
          </div>
        )}

        {/* Quick Starter Presets */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            { label: "🍋 Squirt Paloma Fiesta", prompt: "Build a summer Squirt Paloma cocktail and mocktail fiesta campaign featuring ice-cold 12-packs and Mexican Squirt glass bottles." },
            { label: "🏈 Dr Pepper Fansville Blitz", prompt: "Create a Dr Pepper Fansville college football tailgate campaign featuring 12-packs, Zero Sugar, and Strawberries & Cream." },
            { label: "⚡ Zero Sugar Innovation BOGO", prompt: "Design a Dr Pepper Zero Sugar and Squirt Zero Sugar BOGO wellness retail campaign for low calorie soda shoppers." }
          ].map((preset, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => setChatInput(preset.prompt)}
              disabled={isSending}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition disabled:opacity-50 text-left cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="e.g. Build a summer Squirt Paloma fiesta campaign featuring ice-cold 12-packs and Mexican Squirt glass bottles..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isSending}
            className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 font-sans"
          />
          <button
            onClick={handleSendMessage}
            disabled={isSending || !chatInput.trim()}
            className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            disabled={isSending}
            title="Reset active session"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            RESET CHAT
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Workspace, Log & Artifacts Panel */}
      <div className="xl:w-7/12 flex flex-col min-h-[780px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Workspace Tab Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 pt-4 flex gap-1">
          <button
            onClick={() => setActiveTab("flow")}
            className={`px-4 py-2 text-xs font-semibold font-mono border-b-2 uppercase tracking-tight flex items-center gap-1.5 transition-all ${
              activeTab === "flow"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Agent Flow
          </button>

          <button
            onClick={() => setActiveTab("grounding")}
            className={`px-4 py-2 text-xs font-semibold font-mono border-b-2 uppercase tracking-tight flex items-center gap-1.5 transition-all ${
              activeTab === "grounding"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Grounding Databases
          </button>
          
          <button
            onClick={() => setActiveTab("artifacts")}
            className={`px-4 py-2 text-xs font-semibold font-mono border-b-2 uppercase tracking-tight flex items-center gap-1.5 transition-all ${
              activeTab === "artifacts"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Campaign Artifacts
          </button>

          <button
            onClick={() => setActiveTab("snapshots")}
            className={`px-4 py-2 text-xs font-semibold font-mono border-b-2 uppercase tracking-tight flex items-center gap-1.5 transition-all ${
              activeTab === "snapshots"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            GCS Snapshots
          </button>
        </div>

        {/* Tab content area */}
        <div className="flex-1 p-5 overflow-y-auto max-h-[720px]">
          
          {/* TAB 0: Agent Flow Graph */}
          {activeTab === "flow" && (
            <div className="space-y-5 text-left font-sans">
              <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Autonomous Multi-Agent Pipeline Graph</h4>
                  <p className="text-[11px] text-slate-455 mt-0.5">Click any agent step to inspect real-time input and output payloads.</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-250 border border-slate-350" /> Idle</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" /> Executing</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</span>
                </div>
              </div>

              <div className="space-y-4 relative pl-3 border-l-2 border-slate-100 ml-4 py-2">
                {[
                  {
                    id: "intake",
                    name: "Intake Agent",
                    sub: "Natural Language Parser",
                    icon: <Bot className="w-4 h-4" />,
                    isActive: state.activeAgent === "Intake Agent",
                    isCompleted: !!state.artifacts.brief,
                    input: state.campaignGoal || "Awaiting user query prompt...",
                    output: state.artifacts.brief ? JSON.stringify(state.artifacts.brief, null, 2) : null
                  },
                  {
                    id: "feasibility",
                    name: "Feasibility Agent",
                    sub: "Audience & Reach Inspector",
                    icon: <Sliders className="w-4 h-4" />,
                    isActive: state.activeAgent === "Feasibility Agent",
                    isCompleted: !!state.artifacts.feasibility,
                    input: state.artifacts.brief ? JSON.stringify(state.artifacts.brief, null, 2) : "Awaiting Brief parameters...",
                    output: state.artifacts.feasibility || null
                  },
                  {
                    id: "prioritization",
                    name: "Prioritization Agent",
                    sub: "Conflict & Queue Ranking Manager",
                    icon: <Settings className="w-4 h-4" />,
                    isActive: state.activeAgent === "Prioritization Agent",
                    isCompleted: !!state.artifacts.prioritization,
                    input: state.artifacts.feasibility ? "Feasibility Verification HTML + Campaign parameters" : "Awaiting Feasibility report...",
                    output: state.artifacts.prioritization || null
                  },
                  {
                    id: "research",
                    name: "Research Agent",
                    sub: "Market Trends Grounding",
                    icon: <Wrench className="w-4 h-4" />,
                    isActive: state.activeAgent === "Research Agent",
                    isCompleted: !!state.artifacts.research,
                    input: state.artifacts.prioritization ? "Prioritization metrics + retail catalog data" : "Awaiting Prioritization assessment...",
                    output: state.artifacts.research || null
                  },
                  {
                    id: "creative",
                    name: "Creative Gen Agent",
                    sub: "Copywriter & Asset Compiler",
                    icon: <ImageIcon className="w-4 h-4" />,
                    isActive: state.activeAgent === "Creative Gen Agent",
                    isCompleted: !!state.artifacts.creative,
                    input: state.artifacts.research ? "Retail floorset & competitive pricing report HTML" : "Awaiting pricing research report...",
                    output: state.artifacts.creative ? JSON.stringify(state.artifacts.creative, null, 2) : null
                  },
                  {
                    id: "validation",
                    name: "Validation Agent",
                    sub: "Compliance Safety Auditor",
                    icon: <CheckCircle className="w-4 h-4" />,
                    isActive: state.activeAgent === "Validation Agent",
                    isCompleted: !!state.artifacts.compliance,
                    input: state.artifacts.creative ? "Creative copywriting copy JSON + Accumulative executions history logs" : "Awaiting copywriting drafts...",
                    output: state.artifacts.compliance ? JSON.stringify(state.artifacts.compliance, null, 2) : null
                  },
                  {
                    id: "integration",
                    name: "Integration Agent",
                    sub: "Dispatch Gateway Transit",
                    icon: <Cloud className="w-4 h-4" />,
                    isActive: state.activeAgent === "Integration Agent",
                    isCompleted: !!state.artifacts.integration,
                    input: state.artifacts.compliance ? "Compliance safety report" : "Awaiting validation safety audit...",
                    output: state.artifacts.integration ? JSON.stringify(state.artifacts.integration, null, 2) : null
                  },
                  {
                    id: "judge",
                    name: "Judge Agent",
                    sub: "Campaign Critic & Strategist",
                    icon: <Bot className="w-4 h-4 text-amber-500" />,
                    isActive: state.activeAgent === "Judge Agent",
                    isCompleted: !!state.artifacts.judge,
                    input: state.artifacts.integration ? "Final integration dispatch logs + Accumulative pipeline outputs context" : "Awaiting integration dispatcher logs...",
                    output: state.artifacts.judge || null
                  }
                ].map((step, idx) => {
                  const isCurrentExpanded = expandedNode === step.id;
                  
                  // Determine border and text colors based on status
                  let borderClass = "border-slate-200 bg-white";
                  let badgeText = "Idle";
                  let badgeClass = "bg-slate-50 border-slate-200 text-slate-500";
                  let iconColor = "text-slate-455";
                  
                  if (step.isActive) {
                    borderClass = "border-indigo-500 bg-indigo-50/10 shadow-indigo-100 shadow-md ring-1 ring-indigo-400";
                    badgeText = "Executing";
                    badgeClass = "bg-indigo-100 border-indigo-200 text-indigo-700 animate-pulse";
                    iconColor = "text-indigo-600";
                  } else if (step.isCompleted) {
                    borderClass = "border-emerald-250 bg-emerald-50/5 hover:bg-emerald-50/10";
                    badgeText = "Completed";
                    badgeClass = "bg-emerald-50 border-emerald-100 text-emerald-700";
                    iconColor = "text-emerald-600";
                  }

                  return (
                    <div key={step.id} className="relative group">
                      
                      {/* Left Connected Timeline Bullet Node */}
                      <span className={`absolute -left-[18.5px] top-6 w-3 h-3 rounded-full border-2 transition-all ${
                        step.isActive ? "bg-indigo-500 border-indigo-500 animate-ping" :
                        step.isCompleted ? "bg-emerald-500 border-emerald-500" :
                        "bg-white border-slate-350"
                      }`} />
                      
                      {/* Secondary stable bullet when pulsing */}
                      {step.isActive && (
                        <span className="absolute -left-[18.5px] top-6 w-3 h-3 rounded-full border-2 bg-indigo-500 border-indigo-500" />
                      )}

                      {/* Card layout */}
                      <div 
                        onClick={() => setExpandedNode(isCurrentExpanded ? null : step.id)}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all ${borderClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg bg-slate-100 ${iconColor}`}>
                              {step.icon}
                            </div>
                            <div>
                              <strong className="text-xs text-slate-800 font-bold block">{step.name}</strong>
                              <span className="text-[10px] text-slate-455 block font-medium">{step.sub}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold font-mono border uppercase tracking-wider ${badgeClass}`}>
                              {badgeText}
                            </span>
                            <span className="text-slate-400 group-hover:text-slate-700 text-xs font-mono">
                              {isCurrentExpanded ? "Collapse ▲" : "Expand ▼"}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Inputs/Outputs details block */}
                        {isCurrentExpanded && (
                          <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3 text-[10.5px]">
                            <div>
                              <span className="text-slate-450 uppercase font-mono text-[8px] font-bold block mb-1">Input Received</span>
                              <pre className="bg-slate-950 text-slate-300 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-[140px] text-[9.5px]">
                                {step.input}
                              </pre>
                            </div>
                            <div>
                              <span className="text-slate-450 uppercase font-mono text-[8px] font-bold block mb-1">Output Generated</span>
                              {step.output ? (
                                step.output.startsWith("<") ? (
                                  <div className="bg-white p-3 rounded-lg border border-slate-155 max-h-[180px] overflow-y-auto leading-relaxed">
                                    {renderHTMLAsJSX(step.output)}
                                  </div>
                                ) : (
                                  <pre className="bg-slate-950 text-slate-300 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-[180px] text-[9.5px]">
                                    {step.output}
                                  </pre>
                                )
                              ) : (
                                <span className="text-slate-400 italic font-medium">Awaiting output generation from agent...</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: Real-time Handoff Logs */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed p-4 rounded-xl border border-slate-850 min-h-[350px] max-h-[420px] overflow-y-auto scrollbar-thin text-left">
                {state.logs.map((log, idx) => (
                  <div key={idx} className={`${
                    log.includes("[System]") ? "text-cyan-400 font-semibold" : 
                    log.includes("[Root]") ? "text-indigo-400" :
                    log.includes("Intake Agent") ? "text-blue-300" :
                    log.includes("Feasibility Agent") ? "text-emerald-300" :
                    log.includes("Prioritization Agent") ? "text-purple-300" :
                    log.includes("Validation Agent") ? "text-amber-300" :
                    log.includes("Integration Agent") ? "text-teal-300" : "text-slate-400"
                  }`}>
                    {log}
                  </div>
                ))}
                {isSending && (
                  <div className="text-indigo-400 animate-pulse mt-1">
                    &gt; Listening for next agent handoff...
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-ping" />
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* TAB 2: Campaign Artifacts */}
          {activeTab === "artifacts" && (
            <div className="space-y-5">
              
              {/* Nested Sub Tabs for Artifacts */}
              <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 text-[10px] uppercase font-mono tracking-tight">
                {[
                  { key: "summary", label: "Strategy Summary", completed: !!state.artifacts.summary },
                  { key: "brief", label: "Brief Spec", completed: !!state.artifacts.brief },
                  { key: "feasibility", label: "Feasibility", completed: !!state.artifacts.feasibility },
                  { key: "prioritization", label: "Queue Rank", completed: !!state.artifacts.prioritization },
                  { key: "research", label: "Market Ground", completed: !!state.artifacts.research },
                  { key: "creative", label: "Creative Gen", completed: !!state.artifacts.creative },
                  { key: "compliance", label: "Compliance", completed: !!state.artifacts.compliance },
                  { key: "outbound", label: "Outbound Packet", completed: !!state.artifacts.integration },
                  { key: "judge", label: "Critic Judge", completed: !!state.artifacts.judge }
                ].map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setActiveArtifactSubTab(sub.key as any)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition ${
                      activeArtifactSubTab === sub.key
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {sub.completed && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab Content Panels */}
              <div className="min-h-[320px]">
                
                {/* SUBTAB: Strategy Summary */}
                {activeArtifactSubTab === "summary" && (
                  state.artifacts.summary ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
                        <Bot className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Root Orchestrator Strategy Summary</h4>
                      </div>
                      <div className="pt-2">
                        {renderHTMLAsJSX(state.artifacts.summary)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      Orchestration flow has not generated a strategy summary report yet. Submit a message to the orchestrator to build your campaign.
                    </div>
                  )
                )}

                {/* SUBTAB: Brief */}
                {activeArtifactSubTab === "brief" && (
                  state.artifacts.brief ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Structured Campaign Brief Parameters</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                        <div>
                          <span className="text-slate-450 block font-mono text-[9px] uppercase">Campaign Title</span>
                          <strong className="text-slate-800 block text-sm font-bold mt-0.5">{state.artifacts.brief.name}</strong>
                        </div>
                        <div>
                          <span className="text-slate-450 block font-mono text-[9px] uppercase">Division Category</span>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold">{state.artifacts.brief.divisionId}</span>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <span className="text-slate-450 block font-mono text-[9px] uppercase">Core Objective</span>
                          <p className="text-slate-700 leading-normal mt-0.5">{state.artifacts.brief.objective}</p>
                        </div>
                        <div>
                          <span className="text-slate-450 block font-mono text-[9px] uppercase">Target Audience Segment</span>
                          <span className="text-slate-800 block font-medium mt-0.5">{state.artifacts.brief.audienceSegment}</span>
                        </div>
                        <div>
                          <span className="text-slate-455 block font-mono text-[9px] uppercase">Projected Budget (USD)</span>
                          <strong className="text-emerald-700 block text-sm font-extrabold mt-0.5">${state.artifacts.brief.projectedBudget?.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-slate-455 block font-mono text-[9px] uppercase">Flight Priority Scale</span>
                          <span className="text-slate-800 block font-medium mt-0.5">{state.artifacts.brief.tier}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Intake Agent has not parsed the brief yet.</div>
                  )
                )}

                {/* SUBTAB: Feasibility */}
                {activeArtifactSubTab === "feasibility" && (
                  state.artifacts.feasibility ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
                        <Sliders className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Feasibility & Audience Reach Verification</h4>
                      </div>
                      <div className="pt-2">
                        {renderHTMLAsJSX(state.artifacts.feasibility)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Feasibility Agent has not evaluated opt-ins.</div>
                  )
                )}

                {/* SUBTAB: Prioritization */}
                {activeArtifactSubTab === "prioritization" && (
                  state.artifacts.prioritization ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
                        <Settings className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Conflict Priorities & Schedule Rules Report</h4>
                      </div>
                      <div className="pt-2">
                        {renderHTMLAsJSX(state.artifacts.prioritization)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Prioritization Agent has not evaluated queue positions.</div>
                  )
                )}

                {/* SUBTAB: Research */}
                {activeArtifactSubTab === "research" && (
                  state.artifacts.research ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
                        <Wrench className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-slate-800 text-sm">Retail Floorset & Competitive Benchmark Research Report</h4>
                      </div>
                      <div className="pt-2">
                        {renderHTMLAsJSX(state.artifacts.research)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Research Agent has not grounded competitor prices.</div>
                  )
                )}

                {/* SUBTAB: Creative */}
                {activeArtifactSubTab === "creative" && (
                  state.artifacts.creative ? (
                    <div className="space-y-4">
                      {state.artifacts.creative.error && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-mono text-left leading-relaxed">
                          <strong className="block text-rose-950 font-bold mb-1">❌ Creative Generation Error:</strong>
                          {state.artifacts.creative.error}
                        </div>
                      )}
                      {/* Specs card */}
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <strong className="text-slate-850 font-bold text-sm">Creative Theme: {state.artifacts.creative.theme}</strong>
                          <span className="font-mono bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            CTR Yield Index: {state.artifacts.creative.explainableCTRScore}%
                          </span>
                        </div>
                        <p className="text-slate-750"><strong className="text-slate-450 uppercase text-[9px] font-mono block">Headline Headline</strong> {state.artifacts.creative.headline}</p>
                        <p className="text-slate-750"><strong className="text-slate-450 uppercase text-[9px] font-mono block">Sub-headline Hook</strong> {state.artifacts.creative.subHeadline}</p>
                        <p className="text-slate-755"><strong className="text-slate-450 uppercase text-[9px] font-mono block">Visual Layout Direction</strong> {state.artifacts.creative.visualDirection}</p>
                      </div>

                      {/* Communication Channels Banners Preview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {state.artifacts.creative.assets?.map((asset, aIdx) => (
                          <div key={aIdx} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col justify-between">
                            <div className="bg-slate-100 border-b border-slate-200 p-2.5 flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1">
                                {asset.type === "Email" ? <Mail className="w-3.5 h-3.5 text-blue-500" /> :
                                 asset.type === "SMS" ? <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> :
                                 <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />}
                                {asset.type} Mockup
                              </span>
                              <span className="font-mono text-[9px] text-slate-450">{asset.dimensions}</span>
                            </div>
                            
                            <div className="p-4 flex-1 text-xs">
                              {asset.type === "SMS" ? (
                                <div className="bg-slate-900 text-white rounded-2xl p-3 max-w-[220px] mx-auto text-left font-sans shadow-md border border-slate-800">
                                  <div className="text-[10px] font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-1">{companyName || "Keurig Dr Pepper"} VIP Alerts</div>
                                  <p className="text-[11px] leading-relaxed">{asset.body}</p>
                                </div>
                              ) : (
                                <div className="text-left space-y-3 font-sans bg-white p-3 rounded-lg border border-slate-150 shadow-sm min-h-[120px]">
                                  <strong className="text-slate-800 block text-xs border-b border-slate-100 pb-1">{asset.title}</strong>
                                  <p className="text-slate-600 text-[10.5px] leading-relaxed whitespace-pre-wrap">{asset.body}</p>
                                  {asset.imgUrl && (
                                    <div className="rounded-lg overflow-hidden border border-slate-200 mt-2">
                                      <img src={asset.imgUrl} alt={asset.title} className="w-full h-auto object-cover max-h-[160px]" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {asset.imgText && asset.imgText !== "No Image" && (
                              <div className="bg-indigo-50/50 p-2 text-[10px] text-slate-500 border-t border-slate-150 font-mono italic text-center">
                                Banner Image Prompt: {asset.imgText}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Creative Gen Agent has not drafted assets yet.</div>
                  )
                )}

                {/* SUBTAB: Compliance */}
                {activeArtifactSubTab === "compliance" && (
                  state.artifacts.compliance ? (
                    <div className="space-y-4 text-xs font-sans">
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Validation Compliance Safety Audit
                          </h4>
                          <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider font-mono ${
                            state.artifacts.compliance.passed
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-rose-100 text-rose-800 border-rose-200"
                          }`}>
                            {state.artifacts.compliance.passed ? "PASSED" : "VIOLATION DETECTED"}
                          </span>
                        </div>
                        <div className="pt-2">
                          {renderHTMLAsJSX(state.artifacts.compliance.report)}
                        </div>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-2">
                        <strong className="font-mono text-[9px] text-slate-450 uppercase tracking-widest block">Audit Checklist Points</strong>
                        <div className="grid grid-cols-1 gap-2.5">
                          {state.artifacts.compliance.checklist?.map((item, cIdx) => (
                            <div key={cIdx} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-start justify-between shadow-sm">
                              <div className="space-y-1 text-left">
                                <span className="text-[10px] font-bold text-slate-800 block">{item.rule}</span>
                                <p className="text-slate-500 text-[10.5px] leading-normal">{item.details}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase shrink-0 ${
                                item.status === "Pass" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" :
                                item.status === "Warning" ? "bg-amber-50 border border-amber-100 text-amber-700" :
                                "bg-rose-50 border border-rose-100 text-rose-700"
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Validation Agent has not audited copywriting.</div>
                  )
                )}

                {/* SUBTAB: Outbound */}
                {activeArtifactSubTab === "outbound" && (
                  state.artifacts.integration ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Share2 className="w-5 h-5 text-indigo-500" />
                          Outbound Integration REST Transit Packet
                        </h4>
                        <span className="font-mono px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-semibold">
                          VERIFIED DISPATCH
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-left">
                        <span className="font-mono text-[9px] text-slate-450 uppercase block">Outbound dispatch logging</span>
                        <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px]">{state.artifacts.integration.dispatchLog}</div>
                      </div>

                      <div className="space-y-1 text-left">
                        <span className="font-mono text-[9px] text-slate-450 uppercase block">Payload JSON contents</span>
                        <pre className="bg-slate-950 text-slate-300 p-3 rounded-xl border border-slate-850 overflow-x-auto whitespace-pre-wrap font-mono text-[9.5px] leading-relaxed max-h-[220px]">
                          {JSON.stringify(state.artifacts.integration.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Integration Agent has not verified electronic signoff.</div>
                  )
                )}

                {/* SUBTAB: Critic Judge */}
                {activeArtifactSubTab === "judge" && (
                  state.artifacts.judge ? (
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Shield className="w-5 h-5 text-indigo-500" />
                          Critic Judge Evaluation & Analytics Report
                        </h4>
                        <span className="font-mono px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded text-[9px] font-semibold">
                          JUDGEMENT COMPLETE
                        </span>
                      </div>
                      
                      <div className="text-left w-full">
                        {renderHTMLAsJSX(state.artifacts.judge)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Judge Agent has not evaluated the campaign strategy.</div>
                  )
                )}

              </div>

            </div>
          )}

          {/* TAB 3: GCS Snapshots Manager */}
          {activeTab === "snapshots" && (
            <div className="space-y-6">
              
              {/* Snapshot Action Tools */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-indigo-500" />
                  GCS Persistent Storage Panel
                </h4>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter snapshot name (e.g. fall_fragrance_launch_v1)"
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={handleSaveSnapshot}
                    disabled={!snapshotName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-sm shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    SAVE SNAPSHOT
                  </button>
                  <button
                    onClick={handleLoadLast}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-sm shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    LOAD LAST
                  </button>
                </div>

                {snapshotStatusMsg && (
                  <div className="text-[11px] font-mono text-slate-650 bg-white p-2 rounded-lg border border-slate-150 shadow-inner">
                    {snapshotStatusMsg}
                  </div>
                )}
              </div>

              {/* Snapshots Lists */}
              <div className="space-y-3">
                <strong className="font-mono text-[9px] text-slate-450 uppercase tracking-widest text-left block">
                  Available GCS Cloud & Local Snapshots
                </strong>

                {isSnapshotsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : snapshotsList.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                    No snapshots found in storage bucket or local catalog.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {snapshotsList.map((snap, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:border-slate-350 transition duration-150"
                      >
                        <div className="text-left space-y-1">
                          <span className="text-xs font-bold text-slate-800 font-mono block">{snap.name}</span>
                          <span className="text-[10px] text-slate-500 block font-sans">Goal: "{snap.goal}"</span>
                          <span className="text-[9px] text-slate-400 font-mono block">Timestamp: {new Date(snap.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleLoadSnapshot(snap.name)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            RESTORE
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.name)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-650 rounded-lg hover:text-rose-700 transition"
                            title="Delete Snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === "grounding" && (
            <div className="space-y-6 text-left font-sans">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 text-sm">Synthetic Grounding Databases</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Inspect the static database models parsed by specialized agents during execution.
                </p>
              </div>

              {isGroundingLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* C360 Shopper Opt-In Registry */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-mono uppercase">
                      <Database className="w-3.5 h-3.5 text-indigo-500" />
                      C360 Shopper Opt-In Registry (Feasibility Agent Input)
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                          <tr>
                            <th className="px-4 py-2.5">Segment ID</th>
                            <th className="px-4 py-2.5">Segment Name</th>
                            <th className="px-4 py-2.5">Enrolled Shoppers</th>
                            <th className="px-4 py-2.5">SMS Opt-In</th>
                            <th className="px-4 py-2.5">Email Opt-In</th>
                            <th className="px-4 py-2.5">Weekly Limit / Sent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-slate-700 bg-white font-medium">
                          {c360Data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-mono text-[11px]">{row.segmentId}</td>
                              <td className="px-4 py-2">{row.name}</td>
                              <td className="px-4 py-2 font-semibold text-slate-900">{row.enrolledShoppersCount?.toLocaleString()}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.optInSMS ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                                  {row.optInSMS ? "TRUE" : "FALSE"}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.optInEmail ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                                  {row.optInEmail ? "TRUE" : "FALSE"}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-600">
                                {row.contactFrequencyLimits?.rollingSent} / {row.contactFrequencyLimits?.maxPerWeek}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>


                  {/* M360 Campaign Performance History */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-mono uppercase">
                      <Database className="w-3.5 h-3.5 text-indigo-500" />
                      M360 Campaign Performance Registry (Prioritization Agent Input)
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                          <tr>
                            <th className="px-4 py-2.5">Campaign Name</th>
                            <th className="px-4 py-2.5">Division ID</th>
                            <th className="px-4 py-2.5">Open Rate</th>
                            <th className="px-4 py-2.5">Click Rate</th>
                            <th className="px-4 py-2.5">Clip Rate</th>
                            <th className="px-4 py-2.5">Redemption</th>
                            <th className="px-4 py-2.5">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-slate-700 bg-white font-medium">
                          {m360Data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-semibold text-slate-900">{row.campaignName}</td>
                              <td className="px-4 py-2 text-slate-600">{row.divisionId}</td>
                              <td className="px-4 py-2 font-mono">{(row.openRate * 100).toFixed(0)}%</td>
                              <td className="px-4 py-2 font-mono">{(row.clickRate * 100).toFixed(0)}%</td>
                              <td className="px-4 py-2 font-mono">{(row.clipRate * 100).toFixed(0)}%</td>
                              <td className="px-4 py-2 font-mono">{(row.redemptionRate * 100).toFixed(0)}%</td>
                              <td className="px-4 py-2 font-extrabold text-indigo-700 font-mono">{row.conversionScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
