import React, { useState, useEffect } from 'react';
import { Settings, Save, Globe, Info, FileText, Sparkles } from 'lucide-react';
import { brandConfig } from '../config';



export const CompanyContext: React.FC<CompanyContextProps> = () => {
  const [editedContext, setEditedContext] = useState(companyContext);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setEditedContext(companyContext);
  }, [companyContext]);

  const handleSave = () => {
    setCompanyContext(editedContext);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="page-header mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Settings className="text-[#0077C8]" size={24} />
          </div>
          <div>
            <h1 className="page-title text-3xl font-extrabold tracking-tight">Global Company Context</h1>
            <p className="text-subtext">Define your brand identity to power AI-driven insights and content generation.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="content-card p-8 shadow-lg border-none bg-white/80 backdrop-blur-md">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-[#0077C8]" />
                    Company Name
                  </div>
                </label>
                <input 
                  className="input-field text-lg font-semibold py-3 px-4 rounded-xl border-gray-200 focus:border-[#0077C8] focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                  value={editedContext.name}
                  onChange={(e) => setEditedContext({...editedContext, name: e.target.value})}
                  placeholder="e.g. Healthco"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-[#0077C8]" />
                    Brand Description
                  </div>
                </label>
                <textarea 
                  className="input-field h-32 py-3 px-4 rounded-xl border-gray-200 focus:border-[#0077C8] focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                  value={editedContext.description}
                  onChange={(e) => setEditedContext({...editedContext, description: e.target.value})}
                  placeholder="Describe your company, industry, and core mission..."
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[#0077C8]" />
                    Brand Guidelines
                  </div>
                </label>
                <textarea 
                  className="input-field h-40 py-3 px-4 rounded-xl border-gray-200 focus:border-[#0077C8] focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                  value={editedContext.guidelines}
                  onChange={(e) => setEditedContext({...editedContext, guidelines: e.target.value})}
                  placeholder="e.g. Use a professional yet empathetic tone. Prioritize clarity and trust..."
                />
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSaved && (
                  <div className="flex items-center gap-2 text-green-600 font-bold animate-fadeIn">
                    <Sparkles size={18} />
                    <span>Configuration Saved Successfully</span>
                  </div>
                )}
              </div>
              <button 
                onClick={handleSave}
                className="btn-primary flex items-center gap-3 px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-200"
              >
                <Save size={20} />
                Save Brand Configuration
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="content-card p-6 border-none bg-blue-50">
            <h4 className="font-bold text-[#0077C8] mb-3 flex items-center gap-2 uppercase tracking-wider text-sm">
              <Sparkles size={16} />
              AI Impact
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              This context serves as the "source of truth" for all AI-powered features. It ensures that synthetic focus groups, marketing briefs, and assistant responses are perfectly aligned with your brand's voice and values.
            </p>
          </div>

          <div className="content-card p-6 border-none bg-gray-50">
            <h4 className="font-bold text-gray-700 mb-3 uppercase tracking-wider text-sm">
              Live Preview
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Logo</p>
                <span className="text-xl font-extrabold text-[#0077C8] tracking-tight">{editedContext.name || 'Brand Name'}</span>
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-md transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer"
                style={{ backgroundColor: brandConfig.colors.accent }}
              >
                {(editedContext.name || 'B').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
