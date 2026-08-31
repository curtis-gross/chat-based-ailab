import fs from "fs";
import path from "path";

export const feasibilityAgent = {
  name: "Feasibility Agent",
  sub: "Audience & Reach Inspector",
  description: "Queries C360 directories, calculates target cohort sizes, and checks frequency caps.",
  tools: ["c360_cohort_evaluator"],
  dataRequired: ["c360_opt_in.json"],

  async run(campaignParamsJson, ai, companyName = "Bath & Body Works") {
    let params = {};
    try {
      params = JSON.parse(campaignParamsJson);
    } catch {
      params = { name: "Active Campaign", divisionId: "Home Fragrance & 3-Wick Candles" };
    }

    // Load simulated DB
    let mockC360Data = [];
    try {
      const dbPath = path.join(process.cwd(), "data", "strategy", "c360_opt_in.json");
      if (fs.existsSync(dbPath)) {
        mockC360Data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      }
    } catch (err) {
      console.warn("Could not load c360_opt_in.json in Feasibility Agent", err);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Feasibility Agent. Check target audience reachability and frequency limits.
        
        Campaign Parameters:
        ${JSON.stringify(params, null, 2)}
        
        Shopper Opt-in Database Telemetry:
        ${JSON.stringify(mockC360Data, null, 2)}
        
        Formulate a structured HTML feasibility report explaining:
        - Target audience reach matching this division/segments.
        - Opt-in status check.
        - Overlap collision warnings if frequency limits are exceeded.
        - Recommended adjustments to parameters if needed.

        Formatting Rules:
        - Return ONLY clean, semantic HTML inside a wrapping <div>. Do NOT return markdown or wrap the response in markdown code blocks (\`\`\`html).
        - Use <h2> for main section headers (e.g. <h2>AUDIENCE COHORT REACH</h2>).
        - Use <h3> for sub-headings.
        - Use <p> for paragraphs and descriptions.
        - Use <ul> and <li> for list points.
        - If displaying metrics or comparison datasets, use standard HTML <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags.`,
      });
      return response.text || "No response generated.";
    } catch (err) {
      console.error("[Feasibility Agent Error]:", err);
      return `Feasibility analysis failure: ${err.message || err}`;
    }
  }
};
