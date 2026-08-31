import fs from "fs";
import path from "path";

export const prioritizationAgent = {
  name: "Prioritization Agent",
  sub: "Conflict & Queue Ranking Manager",
  description: "Resolves priority conflicts when multiple campaigns compete for same shopper segments.",
  tools: ["ranking_prioritization_engine"],
  dataRequired: ["m360_historical.json", "c360_opt_in.json"],

  async run(campaignParamsJson, ai, companyName = "Bath & Body Works") {
    let params = {};
    try {
      params = JSON.parse(campaignParamsJson);
    } catch {
      params = { name: "Active Campaign", divisionId: "Home Fragrance & 3-Wick Candles", tier: "Tier 2 (Medium)" };
    }

    // Load simulated DB
    let mockM360Data = [];
    try {
      const dbPath = path.join(process.cwd(), "data", "strategy", "m360_historical.json");
      if (fs.existsSync(dbPath)) {
        mockM360Data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      }
    } catch (err) {
      console.warn("Could not load m360_historical.json", err);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Prioritization Agent. Resolve campaign queue ranking and queue conflicts.
        
        New Campaign:
        ${JSON.stringify(params, null, 2)}
        
        Historical & Active Campaigns Performance Database:
        ${JSON.stringify(mockM360Data, null, 2)}
        
        Provide a detailed HTML conflict report:
        - Conflict overlap index (does this conflict with active banners?).
        - Ranking priority recommendation based on campaign tier and objective values.
        - Priority multiplier assessment.

        Formatting Rules:
        - Return ONLY clean, semantic HTML inside a wrapping <div>. Do NOT return markdown or wrap the response in markdown code blocks (\`\`\`html).
        - Use <h2> for main section headers (e.g. <h2>SCHEDULING CONFLICT INDEX</h2>).
        - Use <h3> for sub-headings.
        - Use <p> for paragraphs and descriptions.
        - Use <ul> and <li> for list points.
        - If displaying metrics or comparison datasets, use standard HTML <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags.`,
      });
      return response.text || "No response generated.";
    } catch (err) {
      console.error("[Prioritization Agent Error]:", err);
      return `Prioritization check failure: ${err.message || err}`;
    }
  }
};
