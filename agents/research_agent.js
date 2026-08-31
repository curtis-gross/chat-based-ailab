export const researchAgent = {
  name: "Research Agent",
  sub: "Market Trends Grounding",
  description: "Leverages Google Search Grounding to validate campaign concepts and compare real-time competitor flyer prices.",
  tools: ["google_search_grounding"],
  dataRequired: [],

  async run(campaignTheme, ai, companyName = "Bath & Body Works") {
    let themeText = campaignTheme;
    let divisionCategory = "";
    try {
      const parsed = JSON.parse(campaignTheme);
      themeText = parsed.name || parsed.objective || campaignTheme;
      divisionCategory = parsed.divisionId || "";
    } catch {
      // Fallback if raw string
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Research Agent. Use Google Search Grounding to validate the proposed campaign concept and cross-reference with real-time external pricing flyer data and specialty beauty/fragrance retail market trends.
        
        Campaign parameters context:
        "${campaignTheme}"
        
        CRITICAL TASK:
        1. Parse the campaign parameters json above to identify the specific target products, items, or promotional focus (e.g. "3-wick candle", "fine fragrance mist", "wallflowers refill", "body cream").
        2. Perform Google Search queries focusing STRICLY AND EXCLUSIVELY on finding current promotional deals and pricing benchmarks at major specialty fragrance & personal care retailers (such as Victoria's Secret, Yankee Candle, Goose Creek, Sephora, Ulta Beauty, or Target) for those EXACT products.
        3. Do NOT benchmark unrelated products. If you must use comparable items due to low search volume, clearly explain why and state the price differences.
        
        Compare these competitor prices with standard pricing strategies and formulate a detailed HTML market analysis report explaining:
        - Price competitiveness analysis (grounded on current search-retrieved pricing flyer benchmarks for the target products).
        - Real-time market demand index for these specific items.
        - Trend validation alignment (Does this campaign theme align with active consumer search trends or seasonality?).
        
        Include search sources, URLs, or citations if applicable.
 
        Formatting Rules:
        - Return ONLY clean, semantic HTML inside a wrapping <div>. Do NOT return markdown or wrap the response in markdown code blocks (\`\`\`html).
        - Use <h2> for main section headers (e.g. <h2>REAL-TIME PRICE COMPETITIVENESS ANALYSIS</h2>).
        - Use <h3> for sub-headings.
        - Use <p> for paragraphs and descriptions.
        - Use <ul> and <li> for list points.
        - If displaying metrics or comparison datasets, use standard HTML <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return response.text || "No response generated.";
    } catch (err) {
      console.error("[Research Agent Error]:", err);
      return `<div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
        <strong>Research Agent Failure:</strong> ${err.message || err}
      </div>`;
    }
  }
};
