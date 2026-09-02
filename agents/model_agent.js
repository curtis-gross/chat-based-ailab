import fs from "fs";
import path from "path";

export const modelAgent = {
  name: "Model Agent",
  sub: "Adaptive Machine Learning Evaluator",
  description: "Triggers Auto-ML recommend blueprints when performance deltas drop below threshold averages.",
  tools: ["bigquery_ml_builder_specs"],
  dataRequired: ["m360_historical.json"],

  async run(performanceDeltas, ai, companyName = "Keurig Dr Pepper") {
    let mockM360Data = [];
    try {
      const dbPath = path.join(process.cwd(), "data", "strategy", "m360_historical.json");
      if (fs.existsSync(dbPath)) {
        mockM360Data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      }
    } catch (err) {
      console.warn("Could not load m360_historical.json in Model Agent", err);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Model Agent. Review campaign performance data and determine if custom machine learning models are recommended for training in BigQuery.
        
        Recent Campaign Performance Telemetry:
        "${performanceDeltas}"
        
        Historical Baseline Campaign Performance:
        ${JSON.stringify(mockM360Data, null, 2)}
        
        Output a model recommendation blueprint explaining:
        - Predictive accuracy drops or performance deltas.
        - Recommended ML model type (e.g. XGBoost Classification, BigQuery Matrix Factorization, or AutoML).
        - Suggested features and inputs for the new training run.`
      });
      return response.text || "No response generated.";
    } catch (err) {
      return `Model agent assessment failure: ${err.message || err}`;
    }
  }
};
