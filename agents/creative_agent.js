import { GoogleGenAI } from "@google/genai";
import { safeParseJson } from "./orchestrator.js";

export const creativeAgent = {
  name: "Creative Gen Agent",
  sub: "Copywriter & Asset Compiler",
  description: "Generates creative themes, banner specs, copy hooks, and handles files uploads references to GCS.",
  tools: ["creative_concept_builder", "gcs_asset_uploader"],
  dataRequired: ["gcs_creative_assets_bucket"],

  async run(campaignParamsJson, ai, companyName = "Keurig Dr Pepper") {
    const params = safeParseJson(campaignParamsJson, { name: "Active Campaign", objective: "General Promotion", divisionId: "Citrus & Carbonated Soft Drinks" });
    const isPetSmart = companyName.toLowerCase().includes("petsmart");
    const isInstacart = companyName.toLowerCase().includes("instacart");

    const toneDescription = isPetSmart 
      ? "pet-loving/friendly tone" 
      : isInstacart
        ? "vibrant, family-friendly, and convenient tone"
        : "bold, refreshing, crisp, flavor-obsessed, and dynamic beverage brand tone";

    const imageThemeDescription = isPetSmart 
      ? "pet, animal, or pet-care retail setting image" 
      : isInstacart
        ? "fresh grocery ingredients, recipes, or convenient home delivery scene image"
        : "ice-cold carbonated soft drink cans or bottles on crushed ice with water droplets, vibrant citrus grapefruit splashes, college football tailgating, or refreshing summer Paloma cocktail setting";

    const defaultTheme = `${companyName} Bold Refreshment`;
    
    const defaultHeadline = isPetSmart 
      ? "Save big on pet essentials." 
      : isInstacart
        ? "Vibrant organic groceries, delivered fast."
        : "Crack open authentic flavor. Ice-cold refreshment guaranteed.";

    const defaultVisual = isPetSmart 
      ? "Clean retail layout with pet elements" 
      : isInstacart
        ? "Clean layout featuring fresh ingredients and convenient delivery packaging"
        : "Crisp beverage cans or glass bottles glistening with ice condensation, vibrant citrus or deep burgundy hues, bold energetic typography";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `You are the ${companyName} Creative Gen Agent. Generate marketing copywriting and banner specs.
        
        Campaign Context:
        ${JSON.stringify(params, null, 2)}
        
        CRITICAL TASK:
        1. Examine the "pricingGrounding" field in the Campaign Context.
        2. Extract the specific promotional products and the benchmark competitor pricing or recommended pricing (e.g. "$5.99/12-pack", "Save $2.00", "Buy 2 Get 1 Free").
        3. You MUST explicitly embed these exact products and pricing numbers into the copywriting body of all assets (Email, SMS, Display Banner). Do NOT use generic price placeholders (e.g. do not say "great discounts" if a price of "$5.99/12-pack" is available in the grounding).
        4. Do NOT swap products or invent pricing that contradicts the brief or pricing grounding data.
        5. PRODUCT PACKAGING SPECIFICATION: For beverage imagery, ensure image prompts ("imgText") specify authentic product packaging such as chilled 12oz aluminum cans, glass bottles, or multi-pack cartons glistening on ice.
        
        Return a JSON response conforming strictly to:
        {
          "theme": "The creative theme title",
          "headline": "Main marketing headline containing specific products and pricing",
          "subHeadline": "Subheadline / Call-to-Action with exact pricing",
          "visualDirection": "Visual layout description",
          "explainableCTRScore": 92,
          "assets": [
            {
              "type": "Email",
              "title": "Email Subject Line",
              "body": "Email body copywriting with ${toneDescription} containing the specific items and price promotions",
              "dimensions": "600x900px",
              "imgText": "A detailed descriptive prompt for generating a ${imageThemeDescription} using Gemini Flash Lite Image."
            },
            {
              "type": "SMS",
              "title": "SMS Short Offer",
              "body": "SMS copywriting matching character limits, containing specific price and items",
              "dimensions": "160 Chars",
              "imgText": "No Image"
            },
            {
              "type": "Display Banner",
              "title": "Web banner copy",
              "body": "Banner overlay text copywriting with specific price",
              "dimensions": "1200x628px",
              "imgText": "A detailed descriptive prompt for generating a ${imageThemeDescription} using Gemini Flash Lite Image."
            }
          ]
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              theme: { type: "STRING" },
              headline: { type: "STRING" },
              subHeadline: { type: "STRING" },
              visualDirection: { type: "STRING" },
              explainableCTRScore: { type: "INTEGER" },
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
            required: ["theme", "headline", "subHeadline", "visualDirection", "explainableCTRScore", "assets"]
          }
        }
      });

      const creativeObj = safeParseJson(response.text || "{}", {});
      return JSON.stringify(creativeObj);
    } catch (err) {
      console.error("[Creative Agent Error]:", err);
      return JSON.stringify({
        error: `Creative asset generation failure: ${err.message || err}`,
        theme: defaultTheme,
        headline: defaultHeadline,
        subHeadline: "Clip coupons on our app.",
        visualDirection: defaultVisual,
        explainableCTRScore: 85,
        assets: []
      });
    }
  },

  async generateImagesBackground(creativeObj, ai, onImageReady, companyName = "Keurig Dr Pepper") {
    if (!creativeObj || !creativeObj.assets || !Array.isArray(creativeObj.assets)) return;

    console.log(`[Creative Agent - Async] Triggering concurrent image generation for ${creativeObj.assets.filter((a) => a.imgText && a.imgText !== "No Image").length} assets...`);

    // Map prompts to concurrent generateContent promises
    const promises = creativeObj.assets.map(async (asset) => {
      if (!asset.imgText || asset.imgText === "No Image") return;

      const runConfig = {
        model: "gemini-3.1-flash-lite-image",
        contents: [`High-fidelity professional retail advertising creative for ${companyName || 'Keurig Dr Pepper'}, clean crisp lighting, refreshing carbonated beverage product photography. Scene prompt: ${asset.imgText}`],
        config: {
          temperature: 1,
          topP: 0.95,
          maxOutputTokens: 32768,
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: asset.type === "Email" ? "4:3" : "16:9",
            imageSize: "1K",
            outputMimeType: "image/jpeg"
          },
          thinkingConfig: {
            thinkingLevel: "MINIMAL"
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
          ]
        }
      };

      try {
        console.log(`[Creative Agent - Async] Concurrent image generation started for: "${asset.imgText}"`);
        const imgResponse = await ai.models.generateContent(runConfig);

        const part = imgResponse.candidates?.[0]?.content?.parts?.find(
          (p) => p.inlineData && p.inlineData.mimeType?.startsWith("image/")
        );
        const base64Bytes = part?.inlineData?.data;
        if (base64Bytes) {
          console.log(`[Creative Agent - Async] Concurrent image generation success for: "${asset.type}"`);
          onImageReady(asset.type, `data:image/png;base64,${base64Bytes}`);
        } else {
          console.warn(`[Creative Agent - Async] No image part found in response for prompt "${asset.imgText}"`);
        }
      } catch (imgErr) {
        console.error(`[Creative Agent - Async] Concurrent image generation failed for: "${asset.imgText}":`, imgErr.message || imgErr);
      }
    });

    // Execute concurrently
    await Promise.all(promises);
  }
};
