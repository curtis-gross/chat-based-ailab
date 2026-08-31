export const intakeAgent = {
  name: "Intake Agent",
  sub: "Natural Language Parser",
  description: "Parses plain text campaign briefs into structured parameters.",
  tools: ["nlp_intent_parser"],
  dataRequired: ["category_taxonomies"],
  
  async run(prompt, ai, companyName = "Bath & Body Works") {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Intake Agent. Parse the marketing text brief and extract campaign properties.
        Brief: "${prompt}"
        
        Return a JSON response conforming strictly to:
        {
          "name": "Brief title",
          "objective": "Objective summary",
          "divisionId": "One of: Fine Body Care, Home Fragrance & 3-Wick Candles, Wallflowers & Plug-Ins, Aromatherapy & Wellness, Hand Soaps & Sanitizers, Gift Sets & Accessories",
          "audienceSegment": "Primary segment target",
          "projectedBudget": 50000,
          "tier": "Tier 1 (High) or Tier 2 (Medium) or Tier 3 (Low)"
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      return response.text || "{}";
    } catch (err) {
      console.error("[Intake Agent Error]:", err);
      return JSON.stringify({
        error: `Intake parsing failure: ${err.message || err}`,
        fallbackName: `Custom ${companyName} Campaign`,
        divisionId: "Home Fragrance & 3-Wick Candles",
        projectedBudget: 25000,
        tier: "Tier 3 (Low)"
      });
    }
  }
};
