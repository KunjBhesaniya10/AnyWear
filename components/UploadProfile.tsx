import React, { useCallback, useState } from 'react';
import { validateUserImage } from '../services/geminiService';

interface Props {
  onUploadComplete: (base64: string) => void;
}

export const UploadProfile: React.FC<Props> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file (JPG, PNG).");
      return;
    }
    
    setError(null);
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      if (result) {
        try {
          // AI Sanity Check
          const validation = await validateUserImage(result);
          
          if (!validation.isValid) {
            setError(validation.reason || "Image rejected. Please upload a clear full-body photo.");
            setIsValidating(false);
            return;
          }

          onUploadComplete(result);
        } catch (err) {
          setError("Failed to validate image. Please check your internet connection.");
          setIsValidating(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isValidating && e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [isValidating]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isValidating && e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-4xl">✨</span>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            AnyWear
          </h1>
        </div>
        <p className="text-slate-500 font-medium">Universal Virtual Fitting Room</p>
      </div>

      <div 
        className={`w-full max-w-sm p-10 border-2 border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' 
            : 'border-indigo-200 bg-white/60 backdrop-blur-sm hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100'
          }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isValidating && document.getElementById('profile-upload')?.click()}
      >
        {isValidating ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-600 font-semibold animate-pulse">Analyzing body profile...</p>
            <p className="text-xs text-slate-400 mt-2">Checking for full-body visibility</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-purple-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Setup Body Profile</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Upload a clear <strong>full-body photo</strong> of yourself. Good lighting.
            </p>
            
            <input 
              type="file" 
              id="profile-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleInput}
              disabled={isValidating}
            />
            <button className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition transform active:scale-95">
              Select Photo
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2 max-w-sm animate-fade-in-up">
          <span className="flex-shrink-0 mt-0.5">🚫</span>
          <span>{error}</span>
        </div>
      )}
      
      <div className="mt-8 flex gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span>Private</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span>Fast</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span>Secure</span>
        </div>
      </div>
    </div>
  );
};