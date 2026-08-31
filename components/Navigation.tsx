import React, { useState } from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import { 
  Sparkles, 
  Target, 
  Palette, 
  ShieldCheck, 
  Workflow, 
  ChevronRight, 
  Menu, 
  X, 
  Settings, 
  Folder, 
  Search,
  Home as HomeIcon,
  Sliders
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const IconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Sparkles,
  Target,
  Palette,
  ShieldCheck,
  Workflow,
  Home: HomeIcon,
  Settings,
  Sliders
};

export const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { name } = useCompanyContext();
  const { config } = useAppConfig();
  const [searchQuery, setSearchQuery] = useState('');

  // 5 Active Conversational AI Agents
  const agentItems = [
    { 
      id: AppMode.INSIGHTS, 
      label: 'Insights Agent', 
      icon: 'Sparkles', 
      desc: 'Multimodal Video & Reddit',
      activeBg: 'bg-blue-50 border-blue-200/80 text-[#1A73E8]',
      iconActive: 'bg-blue-100 text-[#1A73E8]',
      badge: 'bg-blue-100 text-[#1A73E8]'
    },
    { 
      id: AppMode.STRATEGIZE, 
      label: 'Strategize Agent', 
      icon: 'Target', 
      desc: 'WSI Personas & Strategy',
      activeBg: 'bg-purple-50 border-purple-200/80 text-purple-700',
      iconActive: 'bg-purple-100 text-purple-700',
      badge: 'bg-purple-100 text-purple-700'
    },
    { 
      id: AppMode.CREATIVE, 
      label: 'Creative Agent', 
      icon: 'Palette', 
      desc: '9 Aspect Ratios & Video Edit',
      activeBg: 'bg-pink-50 border-pink-200/80 text-pink-700',
      iconActive: 'bg-pink-100 text-pink-700',
      badge: 'bg-pink-100 text-pink-700'
    },
    { 
      id: AppMode.AUDIT_AGENT, 
      label: 'Audit Agent', 
      icon: 'ShieldCheck', 
      desc: 'Visual Score, Metadata & Pros/Cons',
      activeBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
      iconActive: 'bg-emerald-100 text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700'
    },
    { 
      id: AppMode.ORCHESTRATION, 
      label: 'Orchestration Agent', 
      icon: 'Workflow', 
      desc: 'Campaign & Google Ads Builder',
      activeBg: 'bg-amber-50 border-amber-200/80 text-amber-800',
      iconActive: 'bg-amber-100 text-amber-800',
      badge: 'bg-amber-100 text-amber-800'
    }
  ];

  const filterItem = (item: { label: string; desc?: string }) => {
    if (!searchQuery) return true;
    return item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredAgents = agentItems.filter(filterItem);

  const themeColors = config?.branding?.colors || brandConfig.colors;
  const logoUrl = config?.branding?.logo || brandConfig.logo.sidebar;
  const companyName = config?.branding?.companyName || name;
  const accentColor = themeColors.accent || '#1A73E8';

  return (
    <>
      {/* Mobile Header */}
      <div 
        className="md:hidden fixed top-0 left-0 w-full h-16 flex items-center justify-between px-4 z-50 text-white shadow-xs transition-colors"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight">{companyName} AI</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`
        nav-sidebar h-full max-h-screen transition-transform duration-300 ease-in-out pt-16 md:pt-0 flex flex-col justify-start pb-4
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white" style={{ minHeight: '4.5rem' }}>
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={companyName} 
                className="w-auto object-contain transition-all" 
                style={{ height: `${config?.branding?.logoHeight || 36}px`, maxHeight: '42px' }} 
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1A73E8] text-white flex items-center justify-center font-bold text-sm">
                  {companyName.charAt(0)}
                </div>
                <span className="font-bold text-gray-900 text-sm">{companyName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Workspaces & Home Section */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium px-2 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Folder size={14} /> Workspace
            </span>
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
            <button 
              onClick={() => {
                setMode(AppMode.HOME);
                setIsMobileMenuOpen(false);
              }}
              className={`flex-1 text-left px-2.5 py-1.5 text-xs font-bold truncate transition-colors ${
                currentMode === AppMode.HOME ? 'text-[#1A73E8]' : 'text-gray-800 hover:text-[#1A73E8]'
              }`}
            >
              {companyName} Mission Control
            </button>
            <button 
              onClick={() => {
                setMode(AppMode.ADMIN);
                setIsMobileMenuOpen(false);
              }}
              className="p-1.5 text-gray-400 hover:text-[#1A73E8] rounded-lg hover:bg-gray-50 transition-colors"
              title="Admin Configuration"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat agents..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1A73E8] focus:bg-white text-gray-800 placeholder-gray-400 transition-colors"
            />
          </div>
        </div>

        {/* AI Agents List */}
        <div className="px-2 py-1 space-y-1 flex-1 overflow-y-auto">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Sparkles size={11} className="text-[#1A73E8]" /> Conversational Agents
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-50 text-[#1A73E8] rounded-full">
              5 Live
            </span>
          </div>

          {filteredAgents.map((item) => {
            const isActive = currentMode === item.id;
            const Icon = IconMap[item.icon as string] || Sparkles;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setMode(item.id as AppMode);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 font-medium text-xs
                  ${isActive
                    ? `${item.activeBg || 'bg-blue-50 text-[#1A73E8]'} font-bold shadow-2xs border`
                    : `text-gray-800 hover:bg-gray-100 hover:text-gray-900 bg-white/60 border border-gray-100/80 mb-1`}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ChevronRight size={14} className={`text-gray-400 ${isActive ? (item.activeBg?.split(' ')[2] || 'text-[#1A73E8]') : ''}`} />
                  <div className={`p-1 rounded-lg ${isActive ? (item.iconActive || 'bg-blue-100 text-[#1A73E8]') : 'bg-gray-100 text-gray-600'}`}>
                    {React.createElement(Icon, { size: 14 })}
                  </div>
                  <span className="truncate font-semibold">{item.label}</span>
                </div>

                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.badge || 'bg-blue-100 text-[#1A73E8]'}`}>
                  AGENT
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Quick Links */}
        <div className="px-3 pt-2 border-t border-gray-200 mt-auto space-y-1">
          <button
            onClick={() => {
              setMode(AppMode.COMPANY_CONTEXT);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              currentMode === AppMode.COMPANY_CONTEXT ? 'bg-gray-100 text-[#1A73E8] font-bold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Sliders size={14} />
            <span>Brand Configuration</span>
          </button>
          <button
            onClick={() => {
              setMode(AppMode.ADMIN);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              currentMode === AppMode.ADMIN ? 'bg-gray-100 text-[#1A73E8] font-bold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings size={14} />
            <span>Admin Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};
