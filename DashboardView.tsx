import React, { useState, useEffect } from 'react';
import { WardrobeState } from './types';
import { STORAGE_KEYS } from './constants';

interface DashboardViewProps {
  wardrobe: WardrobeState;
}

function DashboardView({ wardrobe }: DashboardViewProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [profileImage, setProfileImage] = useState<string>('');

  useEffect(() => {
    // Load history
    chrome.storage.local.get(STORAGE_KEYS.HISTORY).then(result => {
      const historyData = result[STORAGE_KEYS.HISTORY] || [];
      setHistory(historyData);
    });

    // Load profile image
    chrome.storage.local.get(STORAGE_KEYS.PROFILE_IMAGE).then(result => {
      if (result[STORAGE_KEYS.PROFILE_IMAGE]) {
        setProfileImage(result[STORAGE_KEYS.PROFILE_IMAGE]);
      }
    });
  }, []);

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE_IMAGE]: base64String });
      setProfileImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteHistory = async (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updatedHistory });
    setHistory(updatedHistory);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AnyWear Dashboard
                </h1>
                <p className="text-xs text-slate-600">Manage your virtual fitting room</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Your Profile</h2>
              
              <div className="space-y-4">
                <div className="aspect-4-3 bg-slate-100 rounded-xl overflow-hidden relative group">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Your profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm">Upload your photo</p>
                    </div>
                  )}
                  
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Change Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfileUpload}
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="text-xs text-slate-500">
                  <p className="font-medium">Tips for best results:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Full body photo</li>
                    <li>• Clear lighting</li>
                    <li>• Simple background</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Current Wardrobe */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Current Wardrobe</h2>
                  <p className="text-sm text-slate-600">Items selected from shopping sites</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Top Item */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700">Top</h3>
                  <div className="aspect-3-4 bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300">
                    {wardrobe.top ? (
                      <div className="relative group">
                        <img 
                          src={wardrobe.top.imageUrl} 
                          alt={wardrobe.top.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                            <p className="text-sm font-medium truncate">{wardrobe.top.title}</p>
                            <p className="text-xs opacity-90 truncate">{wardrobe.top.description}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <p className="text-sm">No top selected</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Item */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700">Bottom</h3>
                  <div className="aspect-3-4 bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300">
                    {wardrobe.bottom ? (
                      <div className="relative group">
                        <img 
                          src={wardrobe.bottom.imageUrl} 
                          alt={wardrobe.bottom.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                            <p className="text-sm font-medium truncate">{wardrobe.bottom.title}</p>
                            <p className="text-xs opacity-90 truncate">{wardrobe.bottom.description}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <p className="text-sm">No bottom selected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Try-On History</h2>
            
            {history.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600">No try-on history yet</p>
                <p className="text-xs text-slate-500 mt-1">Your recent outfit combinations will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {history.slice(-5).reverse().map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-3-4 rounded-xl overflow-hidden border-2 border-slate-100 hover:border-indigo-200 transition-colors">
                      <img 
                        src={item.resultImage} 
                        alt="Try-on result" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDeleteHistory(item.id)}
                        className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white truncate">{item.top.title}</p>
                      <p className="text-xs text-white/80 truncate">{item.bottom.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
