import React, { useState, useEffect } from 'react';
import { Settings, Save, Sparkles, Layout, Database, Palette, Plus, Trash2, Loader2, Wand2, ImagePlus, GripVertical, Box, RotateCw, Image, Layers, Search, UploadCloud, X, ChevronUp, ChevronDown, Lock, Youtube, HeartHandshake } from 'lucide-react';
import { useAppConfig, AppConfig } from '../context/AppConfigContext';
import { useCompanyContext } from '../context/CompanyContext';
import { AppMode } from '../types';
import { AdAnalysisAdmin } from './AdAnalysisAdmin';

const LOCKED_TABLES = ['standard_audiences', 'app_config', 'synthetic_standard_audiences'];

export const Admin: React.FC = () => {
  const { config, updateConfig, isLoading: isConfigLoading, refreshConfig } = useAppConfig();
  const { description, saveContext } = useCompanyContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'navigation' | 'tables' | 'assets' | 'ad_analysis'>('branding');
  const [editedConfig, setEditedConfig] = useState<AppConfig | null>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [tempDesc, setTempDesc] = useState(description);
  const [tablePrompt, setTablePrompt] = useState("");
  const [isUpdatingTable, setIsUpdatingTable] = useState(false);
  const [isGeneratingDemoData, setIsGeneratingDemoData] = useState(false);
  const [demoDataGuidance, setDemoDataGuidance] = useState("");
  const [wizardProgress, setWizardProgress] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Image Library State
  const [availableImages, setAvailableImages] = useState<{filename: string, url: string}[]>([]);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  
  // Table Manager State
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Gemini Wizard State
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tableSaveMessage, setTableSaveMessage] = useState("");

  useEffect(() => {
    if (config) setEditedConfig(config);
  }, [config]);

  useEffect(() => {
    setTempDesc(description);
  }, [description]);

  useEffect(() => {
    if (activeTab === 'tables') fetchTables();
    if (activeTab === 'assets') fetchAvailableImages();
  }, [activeTab]);

  const fetchAvailableImages = async () => {
    try {
      const res = await fetch('/api/admin/images');
      if (res.ok) {
        const data = await res.json();
        setAvailableImages(data);
      }
    } catch (e) {
      console.error("Failed to fetch image library", e);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (e) {
      console.error("Failed to fetch tables", e);
    }
  };

  const loadTableData = async (table: any) => {
    setIsTableLoading(true);
    try {
      const res = await fetch(table.path);
      if (res.ok) {
        const data = await res.json();
        setTableData(data);
        setSelectedTable(table);
      }
    } catch (e) {
      console.error("Failed to load table data", e);
    } finally {
      setIsTableLoading(false);
    }
  };

  const toggleContentStudioTab = (tabId: string, isVisible: boolean) => {
    const newConfig = { ...editedConfig } as AppConfig;
    if (!newConfig.pages) newConfig.pages = {};
    if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
    const disabled = newConfig.pages.CONTENT_STUDIO.disabledTabs || [];
    newConfig.pages.CONTENT_STUDIO.disabledTabs = isVisible ? disabled.filter(t => t !== tabId) : [...disabled, tabId];
    setEditedConfig(newConfig);
  };

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>, configKey: 'primaryProductImage' | 'secondaryStyleReference' | 'contentVersioningReference' | 'sketchToRealityReference' | 'youtubeBannerTemplate') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/admin/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: file.name })
          });
          if (res.ok) {
            const data = await res.json();
            const newConfig = { ...editedConfig } as AppConfig;
            if (!newConfig.pages) newConfig.pages = {};
            if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
            newConfig.pages.CONTENT_STUDIO[configKey] = data.url;
            setEditedConfig(newConfig);
          } else {
            alert('Upload failed.');
          }
        } catch (err) {
          console.error('Failed to upload', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/admin/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: file.name })
          });
          if (res.ok) {
            const data = await res.json();
            const newConfig = { ...editedConfig } as AppConfig;
            newConfig.branding.logo = data.url;
            setEditedConfig(newConfig);
          } else {
            alert('Upload failed.');
          }
        } catch (err) {
          console.error('Failed to upload logo', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/admin/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: file.name })
          });
          if (res.ok) {
            const data = await res.json();
            const newConfig = { ...editedConfig } as AppConfig;
            if (!newConfig.pages) newConfig.pages = {};
            if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
            const currentRefs = newConfig.pages.CONTENT_STUDIO.multiImageReferences || [];
            newConfig.pages.CONTENT_STUDIO.multiImageReferences = [...currentRefs, data.url];
            setEditedConfig(newConfig);
            fetchAvailableImages(); // Refresh library
          } else {
            alert('Upload failed.');
          }
        } catch (err) {
          console.error('Failed to upload image', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingBatch(true);
    setSaveStatus(`Uploading ${files.length} images...`);

    try {
      const imageData = await Promise.all(
        files.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ base64: reader.result, filename: file.name });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );

      const res = await fetch('/api/admin/save-images-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imageData })
      });

      if (res.ok) {
        setSaveStatus("Batch upload successful!");
        fetchAvailableImages(); // Refresh library
      } else {
        alert("Batch upload failed.");
      }
    } catch (e) {
      console.error("Batch upload error", e);
      alert("Error during batch upload.");
    } finally {
      setIsUploadingBatch(false);
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleProductSpinUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/admin/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename: file.name })
          });
          if (res.ok) {
            const data = await res.json();
            const newConfig = { ...editedConfig } as AppConfig;
            if (!newConfig.pages) newConfig.pages = {};
            if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
            let currentRefs = newConfig.pages.CONTENT_STUDIO.productSpinReferences || [];
            if (currentRefs.length >= 3) {
                alert("Maximum of 3 images allowed for Product Spin references.");
                return;
            }
            newConfig.pages.CONTENT_STUDIO.productSpinReferences = [...currentRefs, data.url];
            setEditedConfig(newConfig);
          } else {
            alert('Upload failed.');
          }
        } catch (err) {
          console.error('Failed to upload image', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const createEmptyTable = () => {
    const defaultTableName = `new_table_${Math.floor(Math.random() * 1000)}`;
    const tableName = prompt("Enter a name for the new table (without .json):", defaultTableName);
    if (!tableName || tableName.trim() === '') return;
    
    const safeName = tableName.trim().replace(/[^a-z0-9_-]/gi, '_');
    
    // Check if exists
    if (tables.some(t => t.id === safeName)) {
        alert("Table name already exists!");
        return;
    }

    const newTable = {
        id: safeName,
        filename: `${safeName}.json`,
        path: `/data/configuration/${safeName}.json`
    };
    
    setTables([...tables, newTable]);
    setSelectedTable(newTable);
    setTableData([]); // empty array as starting point
  };

  const handleSaveConfig = async () => {
    if (!editedConfig) return;
    setIsSaving(true);
    setSaveStatus("Saving configuration...");
    try {
      await updateConfig(editedConfig);
      await saveContext(editedConfig.branding.companyName, tempDesc);
      setSaveStatus("Saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e) {
      setSaveStatus("Error saving configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeminiGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/genai/generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash-lite-preview-09-2025',
          contents: [{
            role: 'user',
            parts: [{ text: `Generate a JSON array of 5 objects for the following request: "${prompt}". Return ONLY the raw JSON array. DO NOT include markdown formatting or backticks.` }]
          }],
          config: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const generatedData = JSON.parse(text);
        setTableData(generatedData);
        setActiveTab('tables');
        // Pre-fill "New Table" logic
        setSelectedTable({ id: 'generated_table' });
      }
    } catch (e) {
      console.error("Gemini data generation failed", e);
      alert("Failed to generate data. Please check your prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDemoData = async () => {
    setIsGeneratingDemoData(true);
    setWizardProgress("Initializing...");
    setSaveStatus("Generating demo data...");
    try {
      // Fetch latest table list to ensure it's up-to-date
      const resList = await fetch('/api/admin/tables');
      let currentTables = tables;
      if (resList.ok) {
        currentTables = await resList.json();
        setTables(currentTables);
      }

      const baseTables = currentTables.filter(t => !t.id.includes('_run') && !LOCKED_TABLES.includes(t.id));
      if (baseTables.length === 0) {
        setWizardProgress("No base configuration tables found.");
        setIsGeneratingDemoData(false);
        return;
      }

      const total = baseTables.length;

      for (let i = 0; i < total; i++) {
        const table = baseTables[i];
        const tableIndexStr = `${i + 1} of ${total}`;
        
        // 1. Load Table Data
        setWizardProgress(`[${tableIndexStr}] Loading ${table.id}...`);
        const loadRes = await fetch(table.path);
        if (!loadRes.ok) throw new Error(`Failed to load ${table.id}`);
        const originalData = await loadRes.json();

        // 2. Generate updated content using Gemini
        setWizardProgress(`[${tableIndexStr}] Aligning ${table.id} to ${editedConfig.branding.companyName}...`);
        const currentJson = JSON.stringify(originalData, null, 2);
        
        const systemPrompt = `You are an AI data assistant. I have the following JSON data representing configuration/demo data for our application.
I need you to align/update this JSON data to match our company name, description, and target branding guidelines.

Company Name: ${editedConfig.branding.companyName}
Company Description: ${tempDesc}
Additional Prompting Guidance: ${demoDataGuidance || "Ensure the data is realistic and representative of our business."}

Current JSON Data:
${currentJson}

You MUST keep the exact same JSON structure/schema as the current data. Translate texts, generate new realistic values, update brand references, and align everything to our company.
Return ONLY the raw updated JSON structure. DO NOT include markdown formatting or backticks.`;

        const response = await fetch('/api/genai/generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-3.5-flash-lite',
            contents: [{
              role: 'user',
              parts: [{ text: systemPrompt }]
            }],
            config: { responseMimeType: 'application/json' }
          })
        });

        if (!response.ok) throw new Error(`Failed to call Gemini for ${table.id}`);
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`No text returned for ${table.id}`);
        
        const cleanText = text.replace(/```json|```/g, '').trim();
        const generatedData = JSON.parse(cleanText);

        // 3. Save Table Data
        setWizardProgress(`[${tableIndexStr}] Saving ${table.id}...`);
        const saveRes = await fetch('/api/admin/tables/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: table.id, data: generatedData })
        });
        if (!saveRes.ok) throw new Error(`Failed to save ${table.id}`);
      }

      setWizardProgress("All base configuration tables aligned successfully!");
      setSaveStatus("Demo data updated successfully!");
      
      // Refresh current table if one is selected
      if (selectedTable && !LOCKED_TABLES.includes(selectedTable.id)) {
        loadTableData(selectedTable);
      }
    } catch (e: any) {
      console.error("Failed to generate demo data:", e);
      setWizardProgress(`Error: ${e.message}`);
      setSaveStatus("Error generating demo data.");
    } finally {
      setIsGeneratingDemoData(false);
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleUpdateTableWithGemini = async () => {
    if (!selectedTable || !tableData || !tablePrompt) return;
    setIsUpdatingTable(true);
    try {
      const currentJson = typeof tableData === 'string' ? tableData : JSON.stringify(tableData, null, 2);
      const response = await fetch('/api/genai/generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash-lite',
          contents: [{
            role: 'user',
            parts: [{ text: `You are an AI data assistant. I have the following JSON data. I need you to update, expand, or modify it based on the user's prompt. 
User Prompt: "${tablePrompt}"
Current JSON Data:
${currentJson}

You MUST keep the exact same JSON structure/schema as the current data. Return ONLY the raw updated JSON structure. DO NOT include markdown formatting or backticks.` }]
          }],
          config: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const generatedData = JSON.parse(text);
        setTableData(generatedData);
        setTablePrompt("");
      } else {
        alert("Failed to update data via Gemini API.");
      }
    } catch (e) {
      console.error("Gemini data update failed", e);
      alert("Failed to update data. Please ensure the prompt is clear.");
    } finally {
      setIsUpdatingTable(false);
    }
  };

  if (isConfigLoading || !editedConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-heading">App Configuration</h1>
            <p className="text-subtext">Manage branding, navigation, and data across the entire platform.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {saveStatus && <span className={`text-sm font-bold ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{saveStatus}</span>}
          <button 
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-blue-200"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save All Changes
          </button>
        </div>
      </div>

      <div className="flex w-full border-b border-gray-200 mb-8 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('branding')}
          className={`flex-1 justify-center py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'branding' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-subtext hover:text-heading hover:bg-gray-50'}`}
        >
          <Palette size={18} /> Configuration
        </button>
        <button 
          onClick={() => setActiveTab('navigation')}
          className={`flex-1 justify-center py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'navigation' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-subtext hover:text-heading hover:bg-gray-50'}`}
        >
          <Layout size={18} /> Navigation Designer
        </button>
        <button 
          onClick={() => setActiveTab('tables')}
          className={`flex-1 justify-center py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'tables' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-subtext hover:text-heading hover:bg-gray-50'}`}
        >
          <Database size={18} /> Data Tables
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 justify-center py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'assets' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-subtext hover:text-heading hover:bg-gray-50'}`}
        >
          <ImagePlus size={18} /> Content Assets
        </button>
        <button 
          onClick={() => setActiveTab('ad_analysis')}
          className={`flex-1 justify-center py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'ad_analysis' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-subtext hover:text-heading hover:bg-gray-50'}`}
        >
          <Youtube size={18} /> Ad Analysis
        </button>
      </div>

      <div className="space-y-8">
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="content-card">
              <h3 className="text-lg font-bold mb-6">Global Identity</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label block mb-1">Company Name</label>
                  <input 
                    className="input-field" 
                    value={editedConfig.branding.companyName}
                    onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, companyName: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="form-label block mb-1">Logo URL</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      className="input-field flex-1" 
                      value={editedConfig.branding.logo}
                      onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, logo: e.target.value}})}
                    />
                    <label className="btn-secondary py-3 px-4 flex items-center gap-2 cursor-pointer font-bold shrink-0">
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="form-label block mb-1">Logo Height (px) - {editedConfig.branding.logoHeight || 32}px</label>
                  <input 
                    type="range"
                    min="16" max="128"
                    className="w-full accent-[#0077C8]"
                    value={editedConfig.branding.logoHeight || 32}
                    onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, logoHeight: parseInt(e.target.value)}})}
                  />
                  <div className="mt-2 bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col items-center justify-center min-h-[160px] relative group">
                     {editedConfig.branding.logo ? (
                        <>
                          <img src={editedConfig.branding.logo} style={{ height: `${editedConfig.branding.logoHeight || 32}px` }} alt="Logo Preview" />
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => setPickerTarget('branding.logo')} className="p-2 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50">
                              <Search size={16} />
                            </button>
                            <label className="p-2 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50 cursor-pointer">
                              <Plus size={16} />
                              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                          </div>
                        </>
                     ) : (
                        <button onClick={() => setPickerTarget('branding.logo')} className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors">
                          <ImagePlus size={32} />
                          <span className="text-xs font-bold">Add Logo</span>
                        </button>
                     )}
                  </div>
                </div>
                <div>
                  <label className="form-label block mb-1">Company Description / Context</label>
                  <textarea 
                    className="input-field min-h-[120px] resize-y" 
                    value={tempDesc}
                    onChange={e => setTempDesc(e.target.value)}
                    placeholder="Describe what your company does and who your customers are..."
                  />
                  <p className="text-xs text-subtext mt-1">
                    Used to calibrate AI features (briefs, audiences) to your specific brand goals.
                  </p>
                </div>
                <div>
                  <label className="form-label block mb-1">Industry Type</label>
                  <select 
                    className="input-field"
                    value={editedConfig.branding.industryType || ''}
                    onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, industryType: e.target.value}})}
                  >
                    <option value="">Select Industry...</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Retail">Retail</option>
                    <option value="Big Box Retailer">Big Box Retailer</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                  </select>
                  <p className="text-xs text-subtext mt-1">
                    Switches the type of bulk analysis being run and gives the bulk analysis prompting some additional insight.
                  </p>
                </div>
                <div>
                  <label className="form-label block mb-1">Default Marketing Campaign Goal</label>
                  <textarea 
                    className="input-field min-h-[80px] resize-y" 
                    value={editedConfig.pages?.MARKETING_BRIEF?.defaultGoal || ''}
                    onChange={e => {
                      const newConfig = { ...editedConfig } as AppConfig;
                      if (!newConfig.pages) newConfig.pages = {};
                      if (!newConfig.pages.MARKETING_BRIEF) newConfig.pages.MARKETING_BRIEF = {};
                      newConfig.pages.MARKETING_BRIEF.defaultGoal = e.target.value;
                      setEditedConfig(newConfig);
                    }}
                    placeholder="Enter the default goal for your marketing campaigns..."
                  />
                  <p className="text-xs text-subtext mt-1">
                    This will be the starting goal for all new Marketing Briefs.
                  </p>
                </div>
              </div>
            </div>

            <div className="content-card">
              <h3 className="text-lg font-bold mb-6">Theme Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label block mb-1">Primary Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={editedConfig.branding.colors.primary} onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, colors: {...editedConfig.branding.colors, primary: e.target.value}}})} />
                    <input className="input-field py-1" value={editedConfig.branding.colors.primary} onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, colors: {...editedConfig.branding.colors, primary: e.target.value}}})} />
                  </div>
                </div>
                <div>
                  <label className="form-label block mb-1">Accent Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={editedConfig.branding.colors.accent} onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, colors: {...editedConfig.branding.colors, accent: e.target.value}}})} />
                    <input className="input-field py-1" value={editedConfig.branding.colors.accent} onChange={e => setEditedConfig({...editedConfig, branding: {...editedConfig.branding, colors: {...editedConfig.branding.colors, accent: e.target.value}}})} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'navigation' && (
          <div className="content-card w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Navigation Links</h3>
              <button className="btn-secondary flex items-center gap-1 py-1" onClick={() => setEditedConfig({...editedConfig, navigation: [...editedConfig.navigation, {id: AppMode.HOME, label: 'New Link', icon: 'Layout'}]})}>
                <Plus size={16} /> Add Link
              </button>
            </div>
            
            <div className="space-y-2">
              {editedConfig.navigation.map((nav, index) => (
                <div 
                  key={index} 
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedIndex === null || draggedIndex === index) return;
                  }}
                  onDrop={() => {
                    if (draggedIndex === null || draggedIndex === index) return;
                    const newNav = [...editedConfig.navigation];
                    const item = newNav.splice(draggedIndex, 1)[0];
                    newNav.splice(index, 0, item);
                    setEditedConfig({...editedConfig, navigation: newNav});
                    setDraggedIndex(null);
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group transition-all duration-200 ${draggedIndex === index ? 'opacity-40 scale-95 border-blue-400 bg-blue-50' : 'hover:border-blue-200 hover:bg-white hover:shadow-sm shadow-blue-50'}`}
                >
                  <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-300 hover:text-blue-400 transition-colors">
                    <GripVertical size={18} />
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-200">
                    <Layout size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1 relative group/input">
                    <input 
                      className="w-full bg-transparent font-bold text-gray-800 outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 transition-all py-1 px-1" 
                      value={nav.label} 
                      onChange={e => {
                        const newNav = [...editedConfig.navigation];
                        newNav[index] = { ...newNav[index], label: e.target.value };
                        setEditedConfig({...editedConfig, navigation: newNav});
                      }}
                      placeholder="Menu Label"
                    />
                  </div>
                  <select 
                    className="bg-white border border-gray-200 rounded text-sm text-subtext outline-none px-2 py-1 focus:ring-2 focus:ring-blue-100 transition-all"
                    value={nav.id}
                    onChange={e => {
                      const newNav = [...editedConfig.navigation];
                      newNav[index] = { ...newNav[index], id: e.target.value as AppMode };
                      setEditedConfig({...editedConfig, navigation: newNav});
                    }}
                  >
                    {Object.values(AppMode).map(mode => (
                      <option key={mode} value={mode}>{mode.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                  <div className="flex flex-col -space-y-px">
                    <button 
                      className={`p-0.5 rounded-t border border-gray-100 bg-white hover:bg-blue-50 hover:text-blue-500 transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (index === 0) return;
                        const newNav = [...editedConfig.navigation];
                        const item = newNav.splice(index, 1)[0];
                        newNav.splice(index - 1, 0, item);
                        setEditedConfig({...editedConfig, navigation: newNav});
                      }}
                      disabled={index === 0}
                      title="Move Up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button 
                      className={`p-0.5 rounded-b border border-gray-100 bg-white hover:bg-blue-50 hover:text-blue-500 transition-colors ${index === editedConfig.navigation.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (index === editedConfig.navigation.length - 1) return;
                        const newNav = [...editedConfig.navigation];
                        const item = newNav.splice(index, 1)[0];
                        newNav.splice(index + 1, 0, item);
                        setEditedConfig({...editedConfig, navigation: newNav});
                      }}
                      disabled={index === editedConfig.navigation.length - 1}
                      title="Move Down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button 
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      const newNav = editedConfig.navigation.filter((_, i) => i !== index);
                      setEditedConfig({...editedConfig, navigation: newNav});
                    }}
                    title="Delete Link"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {editedConfig.navigation.length === 0 && (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                   No navigation links configured. Click "Add Link" to start.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ad_analysis' && editedConfig && (
          <AdAnalysisAdmin editedConfig={editedConfig} setEditedConfig={setEditedConfig} />
        )}

        {activeTab === 'tables' && (
          <div className="space-y-6">
            {/* Demo Data Wizard */}
            <div className="content-card border-blue-100 bg-blue-50/20">
               <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1 space-y-4 w-full">
                     <div className="flex items-center gap-2 text-blue-600">
                       <Wand2 size={20} />
                       <h3 className="text-lg font-bold">Demo Data Wizard</h3>
                     </div>
                     <p className="text-sm text-subtext">
                       This tool generates standard audiences and microsite sample data by analyzing your current company identity (name, description, and context).
                     </p>
                     <div>
                       <label className="text-xs font-black uppercase tracking-wider text-blue-600 block mb-2">Additional Prompting Guidance</label>
                       <textarea 
                         className="input-field min-h-[80px] text-sm" 
                         placeholder="e.g. Focus on younger urban professionals, emphasize sustainability in person bios..."
                         value={demoDataGuidance}
                         onChange={e => setDemoDataGuidance(e.target.value)}
                       />
                     </div>
                     {isGeneratingDemoData && wizardProgress && (
                       <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-700 animate-pulse flex items-center gap-2">
                         <Loader2 className="animate-spin text-blue-500" size={14} />
                         {wizardProgress}
                       </div>
                     )}
                  </div>
                  <div className="md:w-64 w-full pt-2">
                     <button
                       onClick={handleGenerateDemoData}
                       disabled={isGeneratingDemoData}
                       className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-blue-100 mb-3"
                     >
                       {isGeneratingDemoData ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                       Generate Demo Data
                     </button>
                     <div className="p-3 bg-white rounded-lg border border-blue-100 text-[10px] text-subtext italic leading-relaxed">
                       <span className="font-bold text-blue-600 uppercase block mb-1">Disclaimer</span>
                       This pulling context directly from your Company Name, Description, and Brand Identity.
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="content-card md:col-span-1 p-0 overflow-hidden flex flex-col h-[500px]">
               <div className="p-4 border-b border-gray-100 font-bold text-sm bg-gray-50 flex justify-between items-center">
                 <span>Saved Tables</span>
                 <button onClick={createEmptyTable} className="text-blue-600 hover:bg-blue-100 p-1 rounded-md" title="Create New Table">
                   <Plus size={16} />
                 </button>
               </div>
               <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                  {/* Locked Configuration Section */}
                  <div className="p-2 bg-gray-50 font-bold text-xs text-red-500 uppercase tracking-wider sticky top-0">Locked Configuration</div>
                  {tables.filter(t => LOCKED_TABLES.includes(t.id)).map((t, idx) => (
                    <button 
                      key={`locked-${idx}`}
                      onClick={() => loadTableData(t)}
                      className={`w-full p-4 text-left text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-between ${selectedTable?.id === t.id ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600'}`}
                    >
                      {t.id}
                      <Lock size={14} className="text-red-500" />
                    </button>
                  ))}

                  {/* Base Configuration Section */}
                  <div className="p-2 bg-gray-50 font-bold text-xs text-gray-400 uppercase tracking-wider sticky top-[37px]">Base Configuration</div>
                  {tables.filter(t => !t.id.includes('_run') && !LOCKED_TABLES.includes(t.id)).map((t, idx) => (
                    <button 
                      key={`base-${idx}`}
                      onClick={() => loadTableData(t)}
                      className={`w-full p-4 text-left text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-between ${selectedTable?.id === t.id ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600'}`}
                    >
                      {t.id}
                      <Database size={14} className="opacity-50" />
                    </button>
                  ))}

                  {/* User Generated Section */}
                  <div className="p-2 bg-gray-50 font-bold text-xs text-gray-400 uppercase tracking-wider sticky top-[37px] mt-2">User Generated (Runs)</div>
                  {tables.filter(t => t.id.includes('_run')).map((t, idx) => (
                    <button 
                      key={`user-${idx}`}
                      onClick={() => loadTableData(t)}
                      className={`w-full p-4 text-left text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-between ${selectedTable?.id === t.id ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600'}`}
                    >
                      {t.id}
                      <Database size={14} className="opacity-50" />
                    </button>
                  ))}
               </div>
            </div>

            <div className="content-card md:col-span-3">
              {isTableLoading ? (
                <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin" size={32} /></div>
              ) : selectedTable ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-blue-600 uppercase tracking-widest text-xs">Table: {selectedTable.id}.json</h4>
                    {!LOCKED_TABLES.includes(selectedTable.id) && (
                      <div className="flex items-center gap-3">
                        {tableSaveMessage && <span className="text-green-600 text-xs font-bold">{tableSaveMessage}</span>}
                        <button 
                          onClick={async () => {
                             const res = await fetch('/api/admin/tables/save', {
                               method: 'POST',
                               headers: {'Content-Type': 'application/json'},
                               body: JSON.stringify({ id: selectedTable.id, data: tableData })
                             });
                             if (res.ok) {
                                 setTableSaveMessage("Saved!");
                                 setTimeout(() => setTableSaveMessage(""), 3000);
                             }
                          }}
                          className="btn-secondary py-1 text-xs"
                        >
                          Save Table Data
                        </button>
                      </div>
                    )}
                  </div>
                  {!LOCKED_TABLES.includes(selectedTable.id) && (
                    <div className="flex gap-2 mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <input 
                        type="text" 
                        placeholder="Prompt Gemini 3.5 to modify this data (e.g., 'Add 3 more entries', 'Translate values to ES')" 
                        className="input-field flex-1 py-2 text-sm"
                        value={tablePrompt}
                        onChange={e => setTablePrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isUpdatingTable && handleUpdateTableWithGemini()}
                      />
                      <button 
                        onClick={handleUpdateTableWithGemini}
                        disabled={isUpdatingTable || !tablePrompt.trim()}
                        className="btn-primary text-xs py-2 px-4 whitespace-nowrap flex items-center gap-2"
                      >
                        {isUpdatingTable ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                        Update via Gemini
                      </button>
                    </div>
                  )}
                  <textarea 
                    className="w-full h-96 font-mono text-xs p-4 bg-gray-900 text-green-400 rounded-xl border-none outline-none focus:ring-4 focus:ring-blue-100"
                    value={typeof tableData === 'string' ? tableData : JSON.stringify(tableData, null, 2)}
                    readOnly={LOCKED_TABLES.includes(selectedTable.id)}
                    onChange={e => {
                      if (LOCKED_TABLES.includes(selectedTable.id)) return;
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setTableData(parsed);
                      } catch (err) {
                        setTableData(e.target.value);
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400">Directly edit the JSON to update application data instantly.</p>
                </div>
              ) : (
                <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-4">
                   <Database size={48} className="opacity-20" />
                   <p>Select a table from the sidebar to view or edit its data.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {activeTab === 'gemini' && (
          <div className="content-card w-full space-y-8 py-12">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 animate-pulse">
               <Sparkles size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-heading mb-3 tracking-tight">Gemini Data Forge</h2>
              <p className="text-subtext">Describe the structured data you need, and Gemini will build the entire JSON table for you.</p>
            </div>
            
            <div className="relative">
              <textarea 
                className="w-full h-40 p-6 rounded-2xl border-gray-200 shadow-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-lg"
                placeholder="e.g. Create a table of 10 fictional gen-z personas for a skincare brand including their routines, concerns, and favorite influencers."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <button 
                onClick={handleGeminiGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="absolute bottom-4 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-indigo-300 transform hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
              </button>
            </div>
            
            <div className="flex items-center gap-8 opacity-50 pt-4">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> <span className="text-xs font-bold uppercase">Synthesize Data</span></div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> <span className="text-xs font-bold uppercase">Export JSON</span></div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> <span className="text-xs font-bold uppercase">Zero Coding</span></div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-heading tracking-tight">Content Assets Library</h2>
                <p className="text-subtext">Manage default product images, style references, and media pipelines for the Content Studio.</p>
              </div>
              <label className={`btn-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-blue-100 cursor-pointer ${isUploadingBatch ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploadingBatch ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                <span className="font-bold">Bulk Upload Assets</span>
                <input type="file" className="hidden" multiple accept="image/*" onChange={handleBatchUpload} disabled={isUploadingBatch} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {/* Chiclet: Creative Workflow */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-indigo-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                      <Wand2 size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">Creative Workflow</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('CREATIVE_WORKFLOW')} onChange={(e) => toggleContentStudioTab('CREATIVE_WORKFLOW', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-2">5-step GenMedia deep dive: Core asset & brand compliance audit, persona scenario variations, multi-aspect ratio adaptations, product variant swapping, and Omni video motion.</p>
              </div>

              {/* Combined Chiclet: PDP Personalization  */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-blue-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">PDP Personalization</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('PERSONALIZATION')} onChange={(e) => toggleContentStudioTab('PERSONALIZATION', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-6">Set the default merchandise and style reference used for generating personalized product imagery.</p>
                
                <div className="space-y-6">
                  {/* Sub-section: Product */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex justify-between">
                      <span>Primary Product</span>
                      {!editedConfig.pages?.CONTENT_STUDIO?.primaryProductImage && (
                        <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded tracking-normal">System Default</span>
                      )}
                    </label>
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 h-32 flex items-center justify-center p-2">
                       <img 
                         src={editedConfig.pages?.CONTENT_STUDIO?.primaryProductImage || '/images/default-pot.png'} 
                         className={`max-h-full max-w-full object-contain ${!editedConfig.pages?.CONTENT_STUDIO?.primaryProductImage ? 'opacity-60 grayscale-[50%]' : ''}`} 
                         alt="Primary" 
                       />
                       {editedConfig.pages?.CONTENT_STUDIO?.primaryProductImage && (
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => {
                              const newConfig = { ...editedConfig };
                              if (newConfig.pages?.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO.primaryProductImage = '';
                              setEditedConfig(newConfig);
                            }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text"
                        className="input-field text-xs py-2 w-full"
                        value={editedConfig.pages?.CONTENT_STUDIO?.primaryProductImage || ''}
                        onChange={(e) => {
                          const newConfig = { ...editedConfig };
                          if (!newConfig.pages) newConfig.pages = {};
                          if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                          newConfig.pages.CONTENT_STUDIO.primaryProductImage = e.target.value;
                          setEditedConfig(newConfig);
                        }}
                        placeholder="Product URL..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setPickerTarget('primaryProductImage')} className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-blue-200 text-blue-600 text-xs">
                          <Search size={14} /> Search
                        </button>
                        <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm">
                          <Plus size={14} /> Upload
                          <input type="file" className="hidden" accept="image/*" onChange={e => handleAssetUpload(e, 'primaryProductImage')} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Sub-section: Style */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <label className="text-[10px] font-black uppercase tracking-wider text-purple-600 flex justify-between">
                      <span>Style Reference</span>
                      {!editedConfig.pages?.CONTENT_STUDIO?.secondaryStyleReference && (
                        <span className="text-[8px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded tracking-normal">System Default</span>
                      )}
                    </label>
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 h-32 flex items-center justify-center p-2">
                       <img 
                         src={editedConfig.pages?.CONTENT_STUDIO?.secondaryStyleReference || '/images/qvc-dish2.png'} 
                         className={`max-h-full max-w-full object-contain ${!editedConfig.pages?.CONTENT_STUDIO?.secondaryStyleReference ? 'opacity-60 grayscale-[50%]' : ''}`} 
                         alt="Style" 
                       />
                       {editedConfig.pages?.CONTENT_STUDIO?.secondaryStyleReference && (
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => {
                              const newConfig = { ...editedConfig };
                              if (newConfig.pages?.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO.secondaryStyleReference = '';
                              setEditedConfig(newConfig);
                            }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text"
                        className="input-field text-xs py-2 w-full"
                        value={editedConfig.pages?.CONTENT_STUDIO?.secondaryStyleReference || ''}
                        onChange={(e) => {
                          const newConfig = { ...editedConfig };
                          if (!newConfig.pages) newConfig.pages = {};
                          if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                          newConfig.pages.CONTENT_STUDIO.secondaryStyleReference = e.target.value;
                          setEditedConfig(newConfig);
                        }}
                        placeholder="Style URL..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setPickerTarget('secondaryStyleReference')} className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-purple-200 text-purple-600 text-xs">
                          <Search size={14} /> Search
                        </button>
                        <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm">
                          <Plus size={14} /> Upload
                          <input type="file" className="hidden" accept="image/*" onChange={e => handleAssetUpload(e, 'secondaryStyleReference')} />
                        </label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Chiclet 2: Sketch to Reality */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-emerald-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">Sketch to Reality</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('NEW_PRODUCT')} onChange={(e) => toggleContentStudioTab('NEW_PRODUCT', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-4 flex-1">Reference sketch image used for transforming concepts into photorealistic product generations.</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Sketch Reference</span>
                    {!editedConfig.pages?.CONTENT_STUDIO?.sketchToRealityReference && (
                      <span className="text-[8px] bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded tracking-normal">System Default</span>
                    )}
                  </div>
                  <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center p-2">
                     <img 
                       src={editedConfig.pages?.CONTENT_STUDIO?.sketchToRealityReference || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=2000'} 
                       className={`max-h-full max-w-full object-contain ${!editedConfig.pages?.CONTENT_STUDIO?.sketchToRealityReference ? 'opacity-60 grayscale-[50%]' : ''}`} 
                       alt="Sketch" 
                     />
                     {editedConfig.pages?.CONTENT_STUDIO?.sketchToRealityReference && (
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => {
                            const newConfig = { ...editedConfig };
                            if (newConfig.pages?.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO.sketchToRealityReference = '';
                            setEditedConfig(newConfig);
                          }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                       </div>
                     )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text"
                      className="input-field text-xs py-2 w-full"
                      value={editedConfig.pages?.CONTENT_STUDIO?.sketchToRealityReference || ''}
                      onChange={(e) => {
                        const newConfig = { ...editedConfig };
                        if (!newConfig.pages) newConfig.pages = {};
                        if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                        newConfig.pages.CONTENT_STUDIO.sketchToRealityReference = e.target.value;
                        setEditedConfig(newConfig);
                      }}
                      placeholder="Sketch URL..."
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setPickerTarget('sketchToRealityReference')} className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-emerald-200 text-emerald-600 text-xs">
                        <Search size={14} /> Search
                      </button>
                      <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm">
                        <Plus size={14} /> Upload
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleAssetUpload(e, 'sketchToRealityReference')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chiclet 3: Asset Variations */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-emerald-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Layers size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">Asset Variations</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('CONTENT_VERSIONING')} onChange={(e) => toggleContentStudioTab('CONTENT_VERSIONING', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-4 flex-1">Source image for generating alternate dimensional variations and ad layouts.</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Preview</span>
                    {!editedConfig.pages?.CONTENT_STUDIO?.contentVersioningReference && (
                      <span className="text-[8px] bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded tracking-normal font-black uppercase">System Default</span>
                    )}
                  </div>
                  <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center p-2">
                     <img 
                       src={editedConfig.pages?.CONTENT_STUDIO?.contentVersioningReference || '/images/qvc-ad.png'} 
                       className={`max-h-full max-w-full object-contain ${!editedConfig.pages?.CONTENT_STUDIO?.contentVersioningReference ? 'opacity-60 grayscale-[50%]' : ''}`} 
                       alt="Content" 
                     />
                     {editedConfig.pages?.CONTENT_STUDIO?.contentVersioningReference && (
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => {
                            const newConfig = { ...editedConfig };
                            if (newConfig.pages?.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO.contentVersioningReference = '';
                            setEditedConfig(newConfig);
                          }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                       </div>
                     )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text"
                      className="input-field text-xs py-2 w-full"
                      value={editedConfig.pages?.CONTENT_STUDIO?.contentVersioningReference || ''}
                      onChange={(e) => {
                        const newConfig = { ...editedConfig };
                        if (!newConfig.pages) newConfig.pages = {};
                        if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                        newConfig.pages.CONTENT_STUDIO.contentVersioningReference = e.target.value;
                        setEditedConfig(newConfig);
                      }}
                      placeholder="URL..."
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPickerTarget('contentVersioningReference')}
                        className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-emerald-200 text-emerald-600 text-xs"
                      >
                        <Search size={14} /> Search
                      </button>
                      <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm">
                        <Plus size={14} /> Upload
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleAssetUpload(e, 'contentVersioningReference')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chiclet 3.5: YouTube Banner Template */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-red-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                      <Youtube size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">YouTube Banner</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('YOUTUBE_BANNER')} onChange={(e) => toggleContentStudioTab('YOUTUBE_BANNER', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-4 flex-1">Base image template for generating YouTube channel banners.</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Preview</span>
                    {!editedConfig.pages?.CONTENT_STUDIO?.youtubeBannerTemplate && (
                      <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded tracking-normal font-black uppercase">System Default</span>
                    )}
                  </div>
                  <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center p-2">
                    <img 
                      src={editedConfig.pages?.CONTENT_STUDIO?.youtubeBannerTemplate || '/images/qvc-ad.png'} 
                      className={`max-h-full max-w-full object-contain ${!editedConfig.pages?.CONTENT_STUDIO?.youtubeBannerTemplate ? 'opacity-60 grayscale-[50%]' : ''}`} 
                      alt="Banner"
                    />
                    {editedConfig.pages?.CONTENT_STUDIO?.youtubeBannerTemplate && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => {
                          const newConfig = { ...editedConfig };
                          if (newConfig.pages?.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO.youtubeBannerTemplate = '';
                          setEditedConfig(newConfig);
                        }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" className="input-field text-xs py-2 w-full" 
                      value={editedConfig.pages?.CONTENT_STUDIO?.youtubeBannerTemplate || ''}
                      onChange={e => {
                        const newConfig = { ...editedConfig };
                        if (!newConfig.pages) newConfig.pages = {};
                        if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                        newConfig.pages.CONTENT_STUDIO.youtubeBannerTemplate = e.target.value;
                        setEditedConfig(newConfig);
                      }}
                      placeholder="URL..."
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPickerTarget('youtubeBannerTemplate')}
                        className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-red-200 text-red-600 text-xs"
                      >
                        <Search size={14} /> Search
                      </button>
                      <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm">
                        <Plus size={14} /> Upload
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleAssetUpload(e, 'youtubeBannerTemplate')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chiclet 4: 3D Product Spin */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-amber-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <Box size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">3D Product Spin</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('PRODUCT_SPIN')} onChange={(e) => toggleContentStudioTab('PRODUCT_SPIN', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-4 flex-1">Multi-angle object references (front, side, rear) for dynamic video generation context.</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Angles</span>
                    {(!editedConfig.pages?.CONTENT_STUDIO?.productSpinReferences || editedConfig.pages.CONTENT_STUDIO.productSpinReferences.length === 0) && (
                      <span className="text-[8px] bg-amber-50 text-amber-500 px-1.5 py-0.5 rounded tracking-normal font-black uppercase">System Defaults</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map(i => {
                      const defaults = ['/images/default-pot.png', '/images/qvc-dish2.png'];
                      const hasImage = !!editedConfig.pages?.CONTENT_STUDIO?.productSpinReferences?.[i];
                      const imgSrc = hasImage ? editedConfig.pages.CONTENT_STUDIO.productSpinReferences[i] : defaults[i];
                      
                      return (
                        <div key={i} className="aspect-square rounded border border-gray-200 bg-gray-50 flex items-center justify-center p-1 relative group">
                          <img 
                            src={imgSrc} 
                            className={`max-h-full max-w-full object-contain ${!hasImage ? 'opacity-40 grayscale' : ''}`} 
                            alt={`Spin ${i}`} 
                          />
                          {hasImage && (
                            <button 
                              onClick={() => {
                                const newConfig = { ...editedConfig };
                                if (newConfig.pages?.CONTENT_STUDIO?.productSpinReferences) {
                                  newConfig.pages.CONTENT_STUDIO.productSpinReferences.splice(i, 1);
                                  setEditedConfig(newConfig);
                                }
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    <textarea 
                      className="input-field text-xs py-2 w-full"
                      rows={2}
                      value={(editedConfig.pages?.CONTENT_STUDIO?.productSpinReferences || []).join(', ')}
                      onChange={(e) => {
                        const newConfig = { ...editedConfig };
                        if (!newConfig.pages) newConfig.pages = {};
                        if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                        newConfig.pages.CONTENT_STUDIO.productSpinReferences = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setEditedConfig(newConfig);
                      }}
                      placeholder="URLs separated by comma..."
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPickerTarget('productSpinReferences')}
                        className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-amber-200 text-amber-600 text-xs"
                      >
                        <Search size={14} /> Search
                      </button>
                      <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm">
                        <Plus size={14} /> Add
                        <input type="file" className="hidden" accept="image/*" onChange={handleProductSpinUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chiclet 5: Multi-Image Library */}
              <div className="content-card flex flex-col hover:shadow-lg transition-all border-indigo-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <RotateCw size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">Multi-Image Library</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={!(editedConfig?.pages?.CONTENT_STUDIO?.disabledTabs || []).includes('MULTI_IMAGE')} onChange={(e) => toggleContentStudioTab('MULTI_IMAGE', e.target.checked)} />
                    <span className="text-xs font-bold text-gray-500">Visible</span>
                  </label>
                </div>
                <p className="text-xs text-subtext mb-4">The visual gallery of diverse pipeline references used for generating composite lifestyle scenes.</p>
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-3 content-start">
                    {(editedConfig.pages?.CONTENT_STUDIO?.multiImageReferences || []).map((img, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-white shadow-sm bg-white p-1">
                        <img src={img} className="w-full h-full object-contain" alt={`Ref ${i}`} />
                        <button 
                          onClick={() => {
                            const newConfig = { ...editedConfig };
                            if (newConfig.pages?.CONTENT_STUDIO?.multiImageReferences) {
                              newConfig.pages.CONTENT_STUDIO.multiImageReferences.splice(i, 1);
                              setEditedConfig(newConfig);
                            }
                          }}
                          className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    {(editedConfig.pages?.CONTENT_STUDIO?.multiImageReferences || []).length === 0 && (
                      <div className="flex items-center justify-center w-full h-full text-gray-300 font-medium">Empty Library</div>
                    )}
                  </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Persona</label>
                      <input 
                        className="input-field text-xs py-2 w-full"
                        value={editedConfig.pages?.CONTENT_STUDIO?.multiImagePersona || "younger Gen-Z woman in her 20s"}
                        onChange={(e) => {
                          const newConfig = { ...editedConfig };
                          if (!newConfig.pages) newConfig.pages = {};
                          if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                          newConfig.pages.CONTENT_STUDIO.multiImagePersona = e.target.value;
                          setEditedConfig(newConfig);
                        }}
                        placeholder="e.g. woman in her 30s"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Product</label>
                      <input 
                        className="input-field text-xs py-2 w-full"
                        value={editedConfig.pages?.CONTENT_STUDIO?.multiImageProduct || "sandals"}
                        onChange={(e) => {
                          const newConfig = { ...editedConfig };
                          if (!newConfig.pages) newConfig.pages = {};
                          if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                          newConfig.pages.CONTENT_STUDIO.multiImageProduct = e.target.value;
                          setEditedConfig(newConfig);
                        }}
                        placeholder="e.g. a candle"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Lifestyle Locations</label>
                      {[0, 1, 2].map(i => (
                        <input 
                          key={i}
                          className="input-field text-xs py-2 w-full mb-2"
                          value={editedConfig.pages?.CONTENT_STUDIO?.multiImageLocations?.[i] || ['At Home', 'Out with Friends', 'At a Festival'][i]}
                          onChange={(e) => {
                            const newConfig = { ...editedConfig };
                            if (!newConfig.pages) newConfig.pages = {};
                            if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                            const locs = [...(newConfig.pages.CONTENT_STUDIO.multiImageLocations || ['At Home', 'Out with Friends', 'At a Festival'])];
                            locs[i] = e.target.value;
                            newConfig.pages.CONTENT_STUDIO.multiImageLocations = locs;
                            setEditedConfig(newConfig);
                          }}
                          placeholder={`Location ${i+1}`}
                        />
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Reference URLs</label>
                      <textarea 
                        className="input-field text-xs py-2 w-full"
                        rows={2}
                        value={(editedConfig.pages?.CONTENT_STUDIO?.multiImageReferences || []).join(', ')}
                        onChange={(e) => {
                          const newConfig = { ...editedConfig };
                          if (!newConfig.pages) newConfig.pages = {};
                          if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                          newConfig.pages.CONTENT_STUDIO.multiImageReferences = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          setEditedConfig(newConfig);
                        }}
                        placeholder="Add image URLs separated by commas..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPickerTarget('multiImageReferences')}
                        className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 font-bold border-indigo-200 text-indigo-600 text-xs"
                      >
                        <Search size={14} /> Search
                      </button>
                      <label className="btn-secondary py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer font-bold text-xs shadow-sm border-indigo-200 text-indigo-600">
                        <Plus size={14} /> Upload
                        <input type="file" className="hidden" accept="image/*" onChange={handleMultiImageUpload} />
                      </label>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Picker Modal */}
      {pickerTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-heading tracking-tight">Select from Library</h3>
                <p className="text-sm text-subtext">Pick an existing asset from the server images folder.</p>
              </div>
              <button 
                onClick={() => setPickerTarget(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const newConfig = { ...editedConfig } as AppConfig;
                      if (!newConfig.pages) newConfig.pages = {};
                      if (!newConfig.pages.CONTENT_STUDIO) newConfig.pages.CONTENT_STUDIO = {};
                      
                      if (pickerTarget === 'branding.logo') {
                        newConfig.branding.logo = img.url;
                      } else if (pickerTarget === 'productSpinReferences') {
                        if (!newConfig.pages.CONTENT_STUDIO.productSpinReferences) newConfig.pages.CONTENT_STUDIO.productSpinReferences = [];
                        newConfig.pages.CONTENT_STUDIO.productSpinReferences.push(img.url);
                      } else if (pickerTarget === 'multiImageReferences') {
                        if (!newConfig.pages.CONTENT_STUDIO.multiImageReferences) newConfig.pages.CONTENT_STUDIO.multiImageReferences = [];
                        newConfig.pages.CONTENT_STUDIO.multiImageReferences.push(img.url);
                      } else {
                        // @ts-ignore
                        newConfig.pages.CONTENT_STUDIO[pickerTarget] = img.url;
                      }
                      
                      setEditedConfig(newConfig);
                      setPickerTarget(null);
                    }}
                    className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group relative bg-gray-50"
                  >
                    <img src={img.url} className="w-full h-full object-contain p-2" alt={img.filename} />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.filename}
                    </div>
                  </button>
                ))}
                {availableImages.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    <ImagePlus size={48} className="mx-auto mb-4 opacity-10" />
                    <p>No images found in library. Upload some first!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
