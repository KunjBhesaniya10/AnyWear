import React, { useEffect, useState } from 'react';
import { STORAGE_KEYS } from './constants';
import { UploadProfile } from './components/UploadProfile';
import { Wardrobe } from './components/Wardrobe';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserProfile, WardrobeState, OutfitHistory, SavedOutfit, OutfitCollection } from './types';

// Dashboard View Component
const DashboardView: React.FC<{
  userProfile: UserProfile;
  history: OutfitHistory[];
  savedOutfits: SavedOutfit[];
  collections: OutfitCollection[];
  onProfileUpdate: (profile: UserProfile) => void;
  onHistoryUpdate: (history: OutfitHistory[]) => void;
  onSavedOutfitsUpdate: (outfits: SavedOutfit[]) => void;
  onCollectionsUpdate: (collections: OutfitCollection[]) => void;
  onOpenFittingRoom: () => void;
}> = ({ 
  userProfile, 
  history, 
  savedOutfits, 
  collections,
  onProfileUpdate,
  onHistoryUpdate,
  onSavedOutfitsUpdate,
  onCollectionsUpdate,
  onOpenFittingRoom 
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteHistory = async (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: newHistory });
    onHistoryUpdate(newHistory);
  };

  const handleDeleteSavedOutfit = async (id: string) => {
    const newOutfits = savedOutfits.filter(outfit => outfit.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.SAVED_OUTFITS]: newOutfits });
    onSavedOutfitsUpdate(newOutfits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-indigo-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AnyWear</h1>
                <p className="text-xs text-slate-500">AI Virtual Fitting Room</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Shopping Mode
              </button>
              
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">My Profile</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-indigo-100 shadow-sm">
              <img 
                src={userProfile.imageData} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Body Profile Active</p>
              <p className="text-xs text-slate-500">
                Updated {new Date(userProfile.updatedAt).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Ready for try-on
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent History */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent History</h2>
            {history.length > 0 && (
              <button 
                onClick={() => {
                  if (confirm('Clear all try-on history?')) {
                    chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
                    onHistoryUpdate([]);
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          
          {history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="truncate">{formatDate(item.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Outfits */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Saved Outfits</h2>
          </div>
          
          {savedOutfits.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600">No saved outfits yet</p>
              <p className="text-xs text-slate-500 mt-1">Save your favorite combinations for quick access</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {savedOutfits.map((outfit) => (
                <div key={outfit.id} className="relative group">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-100">
                    <img 
                      src={outfit.resultImage} 
                      alt={outfit.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteSavedOutfit(outfit.id)}
                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 truncate">{outfit.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenFittingRoom}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl hover:from-indigo-100 hover:to-indigo-200 transition-all group"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-indigo-700">Fitting Room</span>
              <span className="text-xs text-indigo-600">Try new outfits</span>
            </button>

            <button
              onClick={() => chrome.tabs.create({ url: 'https://www.amazon.com/s?k=fashion' })}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all group"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-purple-700">Browse Fashion</span>
              <span className="text-xs text-purple-600">Shop for clothes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeState>({});
  const [history, setHistory] = useState<OutfitHistory[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [collections, setCollections] = useState<OutfitCollection[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'fitting'>('dashboard');

  // Initial Load Check
  useEffect(() => {
    const init = async () => {
      try {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.USER_PROFILE,
          STORAGE_KEYS.WARDROBE,
          STORAGE_KEYS.HISTORY,
          STORAGE_KEYS.SAVED_OUTFITS,
          STORAGE_KEYS.COLLECTIONS
        ]);

        if (result[STORAGE_KEYS.USER_PROFILE]) {
          setUserProfile(result[STORAGE_KEYS.USER_PROFILE]);
        }
        if (result[STORAGE_KEYS.WARDROBE]) {
          setWardrobe(result[STORAGE_KEYS.WARDROBE]);
        }
        setHistory(result[STORAGE_KEYS.HISTORY] || []);
        setSavedOutfits(result[STORAGE_KEYS.SAVED_OUTFITS] || []);
        setCollections(result[STORAGE_KEYS.COLLECTIONS] || []);
      } catch (e) {
        console.error("Failed to load storage", e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleProfileUpload = async (base64Image: string) => {
    const newProfile: UserProfile = {
      id: crypto.randomUUID(),
      imageData: base64Image,
      updatedAt: Date.now()
    };
    
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_PROFILE]: newProfile });
    setUserProfile(newProfile);
  };

  const handleResetProfile = async () => {
    await chrome.storage.local.remove([STORAGE_KEYS.USER_PROFILE, STORAGE_KEYS.WARDROBE]);
    setUserProfile(null);
    setWardrobe({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400">
        <div className="animate-pulse">Loading Fitting Room...</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <ErrorBoundary>
        <UploadProfile onUploadComplete={handleProfileUpload} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {currentView === 'dashboard' ? (
        <DashboardView 
          userProfile={userProfile}
          history={history}
          savedOutfits={savedOutfits}
          collections={collections}
          onProfileUpdate={setUserProfile}
          onHistoryUpdate={setHistory}
          onSavedOutfitsUpdate={setSavedOutfits}
          onCollectionsUpdate={setCollections}
          onOpenFittingRoom={() => setCurrentView('fitting')}
        />
      ) : (
        <Wardrobe 
          userImage={userProfile.imageData}
          initialWardrobe={wardrobe}
          onResetProfile={handleResetProfile}
          onBackToDashboard={() => setCurrentView('dashboard')}
        />
      )}
    </ErrorBoundary>
  );
}

export default App;