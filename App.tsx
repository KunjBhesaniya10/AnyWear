import React, { useEffect, useState } from 'react';
import { STORAGE_KEYS } from './constants';
import { UploadProfile } from './components/UploadProfile';
import { Wardrobe } from './components/Wardrobe';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserProfile, WardrobeState } from './types';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeState>({});

  // Initial Load Check
  useEffect(() => {
    const init = async () => {
      try {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.USER_PROFILE,
          STORAGE_KEYS.WARDROBE
        ]);

        if (result[STORAGE_KEYS.USER_PROFILE]) {
          setUserProfile(result[STORAGE_KEYS.USER_PROFILE]);
        }
        if (result[STORAGE_KEYS.WARDROBE]) {
          setWardrobe(result[STORAGE_KEYS.WARDROBE]);
        }
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
      <Wardrobe 
        userImage={userProfile.imageData}
        initialWardrobe={wardrobe}
        onResetProfile={handleResetProfile}
      />
    </ErrorBoundary>
  );
}

export default App;