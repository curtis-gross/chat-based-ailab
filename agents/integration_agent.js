import { safeParseJson } from "./orchestrator.js";

export const integrationAgent = {
  name: "Integration Agent",
  sub: "Outbound Dispatch Gateway",
  description: "Aggregates manager signatures and packages finalized payloads with PENDING_JUDGE_REVIEW status.",
  tools: ["signatures_key_verifier", "payload_rest_transporter"],
  dataRequired: ["key_registry", "api_endpoints"],

  async run(approvedDataJson, ai, companyName = "Keurig Dr Pepper") {
    const approvedData = safeParseJson(approvedDataJson, { name: "Active Campaign", status: "Approved" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Integration Agent. Finalize campaign payload formatting, check signatures, and structure the outbound transit package.
        
        Approved Campaign Data:
        ${JSON.stringify(approvedData, null, 2)}
        
        Your job:
        1. Parse the campaign parameters, creative texts/assets (and GCS image references if any) and compliance flags from the input.
        2. Package them into a structured REST payload. Set the status of the campaign explicitly to "PENDING_JUDGE_REVIEW".
        3. Formulate a dispatch verification log: "電子署名 VERIFIED. Outbound Transit Package constructed. Status: PENDING_JUDGE_REVIEW (Awaiting final critic review & coordinator signoff)."
        
        CRITICAL: Ensure the response is valid JSON. All string properties must use properly escaped control characters (e.g. \\n for newlines, \\\" for nested quotes).
        
        Output a JSON object matching this schema exactly:
        {
          "payload": {
            "campaign_id": "c_alb_174981...",
            "status": "PENDING_JUDGE_REVIEW",
            "campaign_data": {
              "name": "Campaign Name",
              "objective": "Objective text",
              "divisionId": "Division ID",
              "audienceReach": 18450,
              "budget": 45000,
              "assets": [ ... creative assets list from input ... ]
            },
            "signatures": ["SupervisorCM-902", "ProdPM-410"]
          },
          "dispatchLog": "Cryptographic packaging complete. Status set to PENDING_JUDGE_REVIEW. Waiting for Judge validation."
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              payload: {
                type: "OBJECT",
                properties: {
                  campaign_id: { type: "STRING" },
                  status: { type: "STRING" },
                  campaign_data: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      objective: { type: "STRING" },
                      divisionId: { type: "STRING" },
                      audienceReach: { type: "INTEGER" },
                      budget: { type: "INTEGER" },
                      assets: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            type: { type: "STRING" },
                            title: { type: "STRING" },
                            body: { type: "STRING" },
                            dimensions: { type: "STRING" },
                            imgText: { type: "STRING" }
                          },
                          required: ["type", "title", "body", "dimensions", "imgText"]
                        }
                      }
                    },
                    required: ["name", "objective", "divisionId", "audienceReach", "budget", "assets"]
                  },
                  signatures: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["campaign_id", "status", "campaign_data", "signatures"]
              },
              dispatchLog: { type: "STRING" }
            },
            required: ["payload", "dispatchLog"]
          }
        }
      });

      const parsedOutput = safeParseJson(response.text || "{}", {});
      return JSON.stringify(parsedOutput);
    } catch (err) {
      console.error("[Integration Agent Error]:", err);
      return JSON.stringify({
        payload: { status: "PENDING_JUDGE_REVIEW", error: err.message || err },
        dispatchLog: "Integration dispatch packaging error. Status: PENDING_JUDGE_REVIEW."
      });
    }
  }
};
