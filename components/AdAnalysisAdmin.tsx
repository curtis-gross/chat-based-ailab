import React, { useState } from 'react';
import { Trash2, Plus, Youtube, Link, FileText, Sparkles } from 'lucide-react';
import { AppConfig } from '../context/AppConfigContext';

interface AdAnalysisAdminProps {
  editedConfig: AppConfig;
  setEditedConfig: (config: AppConfig) => void;
}

export const AdAnalysisAdmin: React.FC<AdAnalysisAdminProps> = ({ editedConfig, setEditedConfig }) => {
  const [newVideo, setNewVideo] = useState({ title: '', url: '', description: '' });

  const videos = editedConfig.adAnalysisVideos || [];

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleAddVideo = () => {
    if (!newVideo.title || !newVideo.url) {
      alert("Title and URL are required.");
      return;
    }

    const id = extractYoutubeId(newVideo.url);
    if (!id) {
      alert("Invalid YouTube URL.");
      return;
    }

    const updatedVideos = [
      ...videos,
      { ...newVideo, id }
    ];

    setEditedConfig({ ...editedConfig, adAnalysisVideos: updatedVideos });
    setNewVideo({ title: '', url: '', description: '' });
  };

  const handleDeleteVideo = (index: number) => {
    const updatedVideos = videos.filter((_, i) => i !== index);
    setEditedConfig({ ...editedConfig, adAnalysisVideos: updatedVideos });
  };

  const handleUpdateVideo = (index: number, field: string, value: string) => {
    const updatedVideos = [...videos];
    updatedVideos[index] = { ...updatedVideos[index], [field]: value };
    
    // If URL changes, try to update ID
    if (field === 'url') {
      const id = extractYoutubeId(value);
      if (id) {
        updatedVideos[index].id = id;
      }
    }
    
    setEditedConfig({ ...editedConfig, adAnalysisVideos: updatedVideos });
  };

  return (
    <div className="content-card w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Youtube className="text-red-500" size={20} />
            Ad Analysis Videos
          </h3>
          <p className="text-sm text-subtext">Configure videos for the Insights / Ad Analysis page.</p>
        </div>
      </div>

      {/* Add New Video Form */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6">
        <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Plus size={16} /> Add New Video
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label block mb-1">Video Title</label>
            <input
              className="input-field"
              value={newVideo.title}
              onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
              placeholder="e.g. USAA Brand Anthem"
            />
          </div>
          <div>
            <label className="form-label block mb-1">YouTube URL</label>
            <input
              className="input-field"
              value={newVideo.url}
              onChange={e => setNewVideo({ ...newVideo, url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="form-label block mb-1">Description</label>
          <textarea
            className="input-field min-h-[80px]"
            value={newVideo.description}
            onChange={e => setNewVideo({ ...newVideo, description: e.target.value })}
            placeholder="Brief description of the analysis target..."
          />
        </div>
        <button
          onClick={handleAddVideo}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus size={16} /> Add Video
        </button>
      </div>

      {/* Video List */}
      <div className="space-y-4">
        {videos.map((video, index) => (
          <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                  <input
                    className="w-full bg-transparent font-bold text-gray-800 outline-none border-b border-transparent hover:border-gray-200 focus:border-blue-500 transition-all font-sans"
                    value={video.title}
                    onChange={e => handleUpdateVideo(index, 'title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Link size={12} /> YouTube URL
                  </label>
                  <input
                    className="w-full bg-transparent text-sm text-blue-600 outline-none border-b border-transparent hover:border-gray-200 focus:border-blue-500 transition-all font-sans"
                    value={video.url}
                    onChange={e => handleUpdateVideo(index, 'url', e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={() => handleDeleteVideo(index)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Video"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <FileText size={12} /> Description
              </label>
              <textarea
                className="w-full bg-transparent text-sm text-gray-600 outline-none border-b border-transparent hover:border-gray-200 focus:border-blue-500 transition-all min-h-[50px] font-sans"
                value={video.description}
                onChange={e => handleUpdateVideo(index, 'description', e.target.value)}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Sparkles size={12} /> Detected ID: <span className="font-mono text-gray-600">{video.id}</span>
            </div>
          </div>
        ))}

        {videos.length === 0 && (
          <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 font-sans">
             No videos configured. Add one above.
          </div>
        )}
      </div>
    </div>
  );
};
