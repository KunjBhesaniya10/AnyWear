import React, { useState, useEffect } from 'react';
import { Wardrobe } from './components/Wardrobe';
import DashboardView from './DashboardView';
import { STORAGE_KEYS } from './constants';
import { WardrobeState } from './types';

function App() {
  const [view, setView] = useState<'dashboard' | 'panel'>('panel');
  const [wardrobe, setWardrobe] = useState<WardrobeState>({});

  useEffect(() => {
    // Get view from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam === 'dashboard' || viewParam === 'panel') {
      setView(viewParam);
    }

    // Load wardrobe state
    chrome.storage.local.get(STORAGE_KEYS.WARDROBE).then(result => {
      const wardrobeData: WardrobeState = result[STORAGE_KEYS.WARDROBE] || {};
      setWardrobe(wardrobeData);
    });

    // Listen for wardrobe updates
    const handleMessage = (message: any) => {
      if (message.type === 'WARDROBE_UPDATED') {
        setWardrobe(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Render based on view
  if (view === 'dashboard') {
    return <DashboardView wardrobe={wardrobe} />;
  }

  return (
    <div className="w-full min-h-screen">
      <Wardrobe 
        userImage=""
        initialWardrobe={wardrobe}
        onResetProfile={() => {}}
      />
    </div>
  );
}

export default App;
