import { brandConfig } from "../config";
import { extractTextFromResponse } from "./geminiService";

export interface AssistantResponse {
    html: string;
}

export const generateAssistantResponse = async (
    prompt: string,
    history: { sender: 'user' | 'bot', text: string }[],
    companyName: string,
    companyDescription: string,
    images: string[] = []
): Promise<AssistantResponse> => {
    try {

        const historyContext = history.map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');

        const systemPrompt = `
            You are an expert ${companyName} Commerce & AI Lab Advisor.
            Your role is to help ${companyName} teams optimize their digital commerce strategy, analyze shopper behavior, and generate high-impact marketing assets. 
            
            **Company Context:**
            ${companyDescription}

            Provide tailored, data-driven advice specifically for this company and its goals.

            **Guidelines:**
            - Always maintain a highly professional, consultative, and knowledgeable tone.
            - Provide clear, actionable advice for retail and commerce within the context of ${companyName}.
            - If you use search tools, synthesize the information naturally into your response.

            **Core Capabilities:**
            1. **Campaign Optimization**: Suggest specific retail strategies, promotional angles, and engagement tactics.
            2. **Data Lookup**: Use Google Search to retrieve REAL-TIME data from commerce trends, competitor analysis, and shopper sentiment relevant to ${companyName}.
            3. **Report Generation**: Create structured HTML reports with "findings", "risks", and "recommendations".

            **Rules:**
            - **Tone**: Professional, analytical, forward-thinking, and business-focused.
            - **Grounding**: ALWAYS use Google Search when asked for current market trends, retail news, or competitor data.
            - **References**: If you include external market data, you MUST include sources.
            - **Output**: You MUST return a JSON object with a specific "type" and content.
            - **Visuals**: Use HTML to format your response. Use Tailwind CSS classes for styling. Use brand colors: Primary: ${brandConfig.colors.primary}, Secondary: ${brandConfig.colors.secondary}.
            
            **Response Types:**

            **Type A: General Chat / Question**
            {
                "type": "chat",
                "html": "<p class='text-gray-800'>Your answer here...</p>",
                "references": [
                    { "text": "Source Name", "url": "https://..." }
                ]
            }

            **Type B: Feasibility Report request**
            If the user asks to "analyze", "evaluate", or "assess" a project/idea:
            {
                "type": "report",
                "title": "Feasibility Assessment: [Project Name]",
                "score": 85, // 0-100
                "summary": "Brief executive summary...",
                "sections": [
                    { "title": "Regulatory", "content": "..." },
                    { "title": "Market Viability (Real-time)", "content": "..." },
                    { "title": "Technical Feasibility", "content": "..." }
                ],
                "recommendation": "Produce / Kill / Pivot",
                "references": [
                    { "text": "FDA Guidance", "url": "https://..." }
                ]
            }

            **Type C: Data Retrieval**
            If the user asks for "data", "stats", "numbers":
            {
                "type": "data",
                "title": "Data Query Results",
                "items": [
                    { "label": "Metric 1", "value": "Value 1" },
                    { "label": "Metric 2", "value": "Value 2" }
                ],
                "references": [ ... ]
            }

            **Output Format:**
            Return ONLY valid JSON.
        `;

        const parts: any[] = [{ text: systemPrompt }];

        if (images && images.length > 0) {
            images.forEach(img => {
                const cleanBase64 = img.split(',')[1] || img;
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
            });
        }

        const genaiResponse = await fetch('/api/genai/generateContent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                    tools: [{ googleSearch: {} }]
                }
            })
        });
        
        if (!genaiResponse.ok) {
             throw new Error("Failed to generate assistant response from proxy");
        }
        
        const response = await genaiResponse.json();

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);

        // Convert JSON response to HTML for the UI
        let htmlContent = "";

        const renderReferences = (refs?: { text: string, url: string }[]) => {
            if (!refs || refs.length === 0) return '';
            return `
                <div class="mt-3 pt-3 border-t border-gray-100">
                    <p class="text-[10px] uppercase font-bold text-gray-400 mb-1">Sources</p>
                    <div class="flex flex-wrap gap-2">
                        ${refs.map(ref => `
                            <a href="${ref.url}" target="_blank" rel="noopener noreferrer" 
                               class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-md transition-colors flex items-center gap-1">
                                🌐 ${ref.text}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        };



        if (data.type === 'chat') {
            htmlContent = `
                <div>
                    ${data.html}
                    ${renderReferences(data.references)}
                </div>
            `;
        } else if (data.type === 'report') {
            const scoreColor = data.score >= 80 ? 'text-green-600' : data.score >= 60 ? 'text-yellow-600' : 'text-red-600';
            htmlContent = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden font-sans">
                    <div class="bg-[${brandConfig.colors.primary}] p-4 text-white flex justify-between items-center">
                        <h3 class="font-bold text-lg">${data.title}</h3>
                        <div class="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">Score: ${data.score}/100</div>
                    </div>
                    <div class="p-5 space-y-4">
                        <p class="text-gray-700 italic border-l-4 border-gray-200 pl-3">${data.summary}</p>
                        
                        <div class="grid gap-3">
                            ${data.sections.map((s: any) => `
                                <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <h4 class="font-bold text-[${brandConfig.colors.primary}] text-sm uppercase mb-1">${s.title}</h4>
                                    <p class="text-sm text-gray-800">${s.content}</p>
                                </div>
                            `).join('')}
                        </div>

                        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span class="text-xs font-bold text-gray-500 uppercase">Recommendation</span>
                            <span class="font-bold text-lg ${data.recommendation === 'Produce' ? 'text-green-600' : 'text-gray-800'}">${data.recommendation}</span>
                        </div>
                        
                        ${renderReferences(data.references)}
                    </div>
                </div>
            `;
        } else if (data.type === 'data') {
            htmlContent = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 font-sans">
                    <h3 class="font-bold text-[${brandConfig.colors.primary}] mb-3 border-b border-gray-100 pb-2">${data.title}</h3>
                    <div class="grid grid-cols-2 gap-4">
                        ${data.items.map((item: any) => `
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">${item.label}</div>
                                <div class="text-lg font-bold text-gray-900">${item.value}</div>
                            </div>
                        `).join('')}
                    </div>
                    ${renderReferences(data.references)}
                </div>
            `;
        } else {
            // Fallback
            htmlContent = `<p>I generated a response but the format was unexpected.</p>`;
        }

        return { html: htmlContent };

    } catch (error) {
        console.error("Assistant generation error:", error);
        return { html: `<p class="text-red-600">Sorry, I encountered an error processing your request.</p>` };
    }
};
