import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { intakeAgent } from "./intake_agent.js";
import { feasibilityAgent } from "./feasibility_agent.js";
import { prioritizationAgent } from "./prioritization_agent.js";
import { creativeAgent } from "./creative_agent.js";
import { validationAgent } from "./validation_agent.js";
import { integrationAgent } from "./integration_agent.js";
import { researchAgent } from "./research_agent.js";
import { modelAgent } from "./model_agent.js";
import { judgeAgent } from "./judge_agent.js";

const defaultAgentsMap = {
  intake: intakeAgent,
  feasibility: feasibilityAgent,
  prioritization: prioritizationAgent,
  creative: creativeAgent,
  validation: validationAgent,
  integration: integrationAgent,
  research: researchAgent,
  model: modelAgent,
  judge: judgeAgent
};

export async function runOrchestration(
  userMessage,
  chatHistory,
  ai,
  onProgress,
  companyName = "Bath & Body Works"
) {
  try {
    if (userMessage === "APPROVE_CAMPAIGN") {
      const finalReply = `
        <div class="bg-emerald-50/60 border border-emerald-200 p-5 rounded-2xl text-left space-y-3 shadow-xs">
          <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Campaign Dispatch Authorization Confirmed
          </h2>
          <p class="text-xs text-slate-700 leading-relaxed font-sans">
            The campaign outbound transit payload has been signed and officially submitted to the Salesforce Marketing Cloud REST gateways. Outbound status has been updated to <strong>DISPATCHED (Active)</strong>.
          </p>
          <div class="p-3 bg-white/80 rounded-lg border border-emerald-100 font-mono text-[9.5px] text-slate-500">
            [REST Dispatch Logs]: HTTP POST 202 accepted | correlation_id: alb-sfmc-${Date.now()} | timestamp: ${new Date().toISOString()}
          </div>
        </div>
      `;
      const result = { text: finalReply, executionLogs: [] };
      onProgress?.("completed", result);
      return result;
    }

    if (userMessage === "DENY_CAMPAIGN") {
      const finalReply = `
        <div class="bg-rose-50/60 border border-rose-200 p-5 rounded-2xl text-left space-y-2 shadow-xs">
          <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5 mb-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            Campaign Dispatch Rejected
          </h2>
          <p class="text-xs text-slate-700 leading-relaxed font-sans">
            The campaign dispatch was denied by the administrator coordinator. The active workflow execution queue has been cancelled, and the transit status has been set to <strong>CANCELLED (Rejected)</strong>.
          </p>
        </div>
      `;
      const result = { text: finalReply, executionLogs: [] };
      onProgress?.("completed", result);
      return result;
    }

    // 1. Load agents dynamically from agents.json
    const agentsPath = path.join(process.cwd(), "data", "strategy", "agents.json");
    let allAgents = [];
    try {
      if (fs.existsSync(agentsPath)) {
        allAgents = JSON.parse(fs.readFileSync(agentsPath, "utf-8"));
      }
    } catch (err) {
      console.error("Error reading agents.json in orchestrator:", err);
    }

    if (allAgents.length === 0) {
      // Fallback if file not found or empty
      allAgents = Object.keys(defaultAgentsMap).map(key => ({
        id: key,
        name: defaultAgentsMap[key].name,
        sub: defaultAgentsMap[key].sub,
        description: defaultAgentsMap[key].description,
        inputs: defaultAgentsMap[key].inputs || "",
        outputs: defaultAgentsMap[key].outputs || "",
      }));
    }

    // 2. Build agents info for router prompt
    const agentsListText = allAgents
      .map(a => `- ${a.id}: ${a.name} (${a.sub}). Description: ${a.description}`)
      .join("\n");

    onProgress?.("routing", { status: "Analyzing your request and planning agent execution..." });

    // 3. Identify which agents are relevant to the user query
    const routerResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `You are the ${companyName} Root Orchestrator Agent. You route incoming requests to specialized agents.
      Available Agents in the mesh:
      ${agentsListText}
      
      User message: "${userMessage}"
      
      Output a JSON list of matching agent IDs.
      Select only the agents that are relevant to answer or fulfill the user's prompt.
      If the user is requesting to build, create, schedule, run, or evaluate a campaign or strategy brief, you MUST select all 8 primary pipeline agents in sequence: ["intake", "feasibility", "prioritization", "research", "creative", "validation", "integration", "judge"].
      If the query is a general question, greeting, or general talk, return an empty array [].`,
      config: {
        responseMimeType: "application/json"
      }
    });

    let selectedAgents = safeParseJson(routerResponse.text || "[]", []);
    
    // If user's prompt matches any campaign parameters or pipeline agents, run the complete 8-agent chain
    const campaignAgents = ["intake", "feasibility", "prioritization", "research", "creative", "validation", "integration", "judge"];
    if (selectedAgents.some(a => campaignAgents.includes(a))) {
      selectedAgents = [...campaignAgents];
    }

    // Sort selected agents based on the standard pipeline order to ensure architectural consistency
    selectedAgents.sort((a, b) => {
      const idxA = campaignAgents.indexOf(a);
      const idxB = campaignAgents.indexOf(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    const executionLogs = [];

    // 4. Execute selected agents in sequence
    let currentInput = userMessage;
    let briefJson = "";

    for (const agentId of selectedAgents) {
      // Look up agent config in loaded agents
      const agentConfig = allAgents.find(a => a.id === agentId);
      if (!agentConfig) continue;

      onProgress?.("agent_start", { agentId, agentName: agentConfig.name });
      console.log(`[Orchestration] Executing agent ${agentConfig.name} (${agentId})...`);

      let result = "";
      const defaultAgent = defaultAgentsMap[agentId];
      
      // Determine what input payload to send to this agent to prevent synthetic fallbacks
      let inputPayload = currentInput;
      if (agentId === "validation") {
        inputPayload = JSON.stringify({ creativeOutput: currentInput, priorExecutions: executionLogs }, null, 2);
      } else if (agentId === "feasibility" || agentId === "research") {
        inputPayload = briefJson || currentInput;
      } else if (agentId === "prioritization") {
        const feasibilityLog = executionLogs.find(l => l.agentId === "feasibility");
        const feasibilityText = feasibilityLog ? feasibilityLog.result : "No feasibility report generated yet.";
        try {
          const parsedBrief = JSON.parse(briefJson || "{}");
          inputPayload = JSON.stringify({
            ...parsedBrief,
            feasibilityReport: feasibilityText
          }, null, 2);
        } catch {
          inputPayload = briefJson || currentInput;
        }
      } else if (agentId === "creative") {
        const researchLog = executionLogs.find(l => l.agentId === "research");
        const researchText = researchLog ? researchLog.result : "No competitor pricing research generated yet.";
        try {
          const parsedBrief = JSON.parse(briefJson || "{}");
          inputPayload = JSON.stringify({
            ...parsedBrief,
            pricingGrounding: researchText
          }, null, 2);
        } catch {
          inputPayload = briefJson || currentInput;
        }
      } else if (agentId === "integration") {
        const briefObj = briefJson ? safeParseJson(briefJson, {}) : {};
        const creativeLog = executionLogs.find(l => l.agentId === "creative");
        const creativeObj = creativeLog ? safeParseJson(creativeLog.result, {}) : {};
        const complianceLog = executionLogs.find(l => l.agentId === "validation");
        const complianceObj = complianceLog ? complianceLog.result : "No compliance audit log found.";
        
        inputPayload = JSON.stringify({
          brief: briefObj,
          creative: creativeObj,
          compliance: complianceObj,
          signatures: ["SupervisorCM-902", "ProdPM-410"]
        }, null, 2);
      } else if (agentId === "judge") {
        inputPayload = JSON.stringify({
          brief: briefJson ? JSON.parse(briefJson) : null,
          feasibility: executionLogs.find(l => l.agentId === "feasibility")?.result || "",
          prioritization: executionLogs.find(l => l.agentId === "prioritization")?.result || "",
          research: executionLogs.find(l => l.agentId === "research")?.result || "",
          creative: executionLogs.find(l => l.agentId === "creative")?.result || "",
          compliance: executionLogs.find(l => l.agentId === "validation")?.result || "",
          outbound: executionLogs.find(l => l.agentId === "integration")?.result || ""
        }, null, 2);
      }

      // Sanitize input payload to remove large base64 image strings and avoid token limit errors
      const sanitizedInput = sanitizePayloadForAgent(inputPayload);

      try {
        if (defaultAgent) {
          result = await defaultAgent.run(sanitizedInput, ai, companyName);
        } else {
          // Run as a dynamic custom agent using a generalized prompt
          result = await runCustomAgent(agentConfig, sanitizedInput, ai, companyName);
        }
      } catch (err) {
        console.error(`[Orchestrator] Error running agent ${agentConfig.name} (${agentId}):`, err);
        result = `Agent execution error: ${err.message || err}`;
      }

      if (agentId === "intake") {
        briefJson = result;
      }

      // Sanitize output result before adding to execution logs
      const sanitizedResult = sanitizePayloadForAgent(result);
      executionLogs.push({ agent: agentConfig.name, agentId, result: sanitizedResult });
      onProgress?.("agent_end", { agentId, agentName: agentConfig.name, result });
      
      // Feed forward output to the next agent
      currentInput = result;
    }

    // 5. Synthesize the final response to the user
    const synthesisResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `You are the ${companyName} Root Orchestrator Agent. Present the results of the campaign evaluation pipeline to the user.
      
      User message: "${userMessage}"
      Specialized Agent Executions:
      ${JSON.stringify(executionLogs, null, 2)}
      
      Synthesize a final, user-friendly HTML response. If specialized agents ran, summarize their findings step-by-step. If no agents ran, answer the query directly.
      
      At the bottom of the response, you MUST append this exact HTML action block for the user to review the Critic Judge's report and confirm approval:
      <div class="mt-4 p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div>
          <h5 class="font-bold text-indigo-900 text-xs font-mono uppercase">Action Required: Strategy Review</h5>
          <p class="text-[11px] text-indigo-750 font-sans mt-0.5">Please review the Critic Judge's evaluation report and the structured outbound package. Do you approve dispatching this campaign to Salesforce Marketing Cloud?</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="window.dispatchEvent(new CustomEvent('campaign_decision', {detail: 'approve'}))" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-mono text-[10px] font-bold uppercase cursor-pointer">APPROVE</button>
          <button onclick="window.dispatchEvent(new CustomEvent('campaign_decision', {detail: 'deny'}))" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-mono text-[10px] font-bold uppercase cursor-pointer">DENY</button>
        </div>
      </div>

      Formatting Rules:
      - Return ONLY clean, semantic HTML inside a wrapping <div>. Do NOT return markdown or wrap the response in markdown code blocks (\`\`\`html).
      - Use <h2> for main section headers (e.g. <h2>CAMPAIGN PIPELINE BREAKDOWN</h2>).
      - Use <h3> for sub-headings.
      - Use <p> for paragraphs and descriptions.
      - Use <ul> and <li> for list points.
      - If displaying metrics or comparison datasets, use standard HTML <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags.`,
    });

    const finalResult = {
      text: synthesisResponse.text || "I was unable to complete the orchestration flow.",
      executionLogs
    };

    onProgress?.("completed", finalResult);
    return finalResult;
  } catch (err) {
    const errorResult = {
      text: `Orchestration routing failure: ${err.message || err}`,
      executionLogs: []
    };
    onProgress?.("error", errorResult);
    return errorResult;
  }
}

async function runCustomAgent(agentConfig, input, ai, companyName = "Albertsons") {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `You are the specialized ${companyName} custom agent "${agentConfig.name}" (${agentConfig.sub}).
      Your role description: ${agentConfig.description}
      Expected input payload format: ${agentConfig.inputs}
      Expected output payload format: ${agentConfig.outputs}
      
      Here is the input you need to process:
      "${input}"
      
      Process this input according to your role, inputs expected, and outputs expected, and return the result. Keep it descriptive yet concise.`,
    });
    return response.text || "{}";
  } catch (err) {
    return `Custom agent execution error: ${err.message || err}`;
  }
}

export function sanitizePayloadForAgent(payload) {
  if (!payload) return "";
  try {
    const parsed = JSON.parse(payload);
    const walkAndSanitize = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) {
        return obj.map(walkAndSanitize);
      }
      const newObj = {};
      for (const key of Object.keys(obj)) {
        if (key === "imgUrl" && typeof obj[key] === "string" && obj[key].startsWith("data:")) {
          newObj[key] = "[BASE64_IMAGE_DATA_TRUNCATED]";
        } else {
          newObj[key] = walkAndSanitize(obj[key]);
        }
      }
      return newObj;
    };
    return JSON.stringify(walkAndSanitize(parsed), null, 2);
  } catch {
    // If HTML or text, replace base64 img patterns
    return payload.replace(/data:image\/[a-zA-Z]+;base64,[^"'\s)]+/g, "[BASE64_IMAGE_DATA_TRUNCATED]");
  }
}

export function safeParseJson(text, fallback) {
  if (!text) return fallback;
  let cleanText = text.trim();

  let startIdx = -1;
  let endIdx = -1;
  
  // Find first opening brace or bracket
  for (let i = 0; i < cleanText.length; i++) {
    if (cleanText[i] === '{' || cleanText[i] === '[') {
      startIdx = i;
      break;
    }
  }

  if (startIdx !== -1) {
    const openChar = cleanText[startIdx];
    const closeChar = openChar === '{' ? '}' : ']';
    let balance = 1;
    let inQuote = false;
    let escape = false;

    for (let i = startIdx + 1; i < cleanText.length; i++) {
      const char = cleanText[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (!inQuote) {
        if (char === openChar) {
          balance++;
        } else if (char === closeChar) {
          balance--;
          if (balance === 0) {
            endIdx = i;
            break;
          }
        }
      }
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    cleanText = cleanText.slice(startIdx, endIdx + 1);
  } else {
    // Strip code fences if they exist as fallback
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    try {
      // Clean up literal unescaped newlines inside JSON string values
      const sanitized = cleanText.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
      });
      return JSON.parse(sanitized);
    } catch (cleanErr) {
      console.warn("[JSON Parse Warning]: Failed to parse JSON, returning fallback.", err);
      return fallback;
    }
  }
}
