import React, { useEffect, useState } from 'react';
import { WardrobeState, ScrapedProduct } from '../types';
import { generateTryOn } from '../services/geminiService';

interface Props {
  userImage: string;
  initialWardrobe: WardrobeState;
  onResetProfile: () => void;
}

const LOADING_MESSAGES = [
  "Analyzing fabric details...",
  "Mapping body shape...",
  "Draping fabric...",
  "Adjusting lighting...",
  "Finalizing look..."
];

// Helper Component for Clothing Slot
const ClothingSlot = ({ 
  item, 
  type, 
  onRemove 
}: { 
  item?: ScrapedProduct, 
  type: 'top' | 'bottom', 
  onRemove: (t: 'top' | 'bottom') => void 
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={`
      relative p-2 rounded-2xl border flex items-center gap-3 transition-all duration-300 group
      ${item 
        ? 'bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200' 
        : 'bg-slate-50/50 border-slate-200 border-dashed hover:bg-slate-50'
      }
    `}>
      <div className="w-12 h-12 bg-white rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center relative border border-slate-100 shadow-sm">
        {item ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
            <img 
              src={item.imageUrl} 
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              alt={item.title}
            />
          </>
        ) : (
          <span className="text-xl opacity-20 grayscale">{type === 'top' ? '👕' : '👖'}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0 py-1">
        <p className={`text-xs font-semibold truncate ${item ? 'text-slate-800' : 'text-slate-400 italic'}`}>
          {item ? item.title : `No ${type === 'top' ? 'Top' : 'Bottom'} Selected`}
        </p>
      </div>

      {item && (
        <button 
          onClick={() => onRemove(type)} 
          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Remove item"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const Wardrobe: React.FC<Props> = ({ userImage, initialWardrobe, onResetProfile }) => {
  const [wardrobe, setWardrobe] = useState<WardrobeState>(initialWardrobe);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // Listen for wardrobe updates from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'WARDROBE_UPDATED') {
        setWardrobe(message.payload);
        setResultImage(null); 
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Cycle loading messages
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let i = 0;
      setLoadingMessage(LOADING_MESSAGES[0]);
      interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!wardrobe.top && !wardrobe.bottom) {
      setError("Please add at least one item to your wardrobe from a website.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateTryOn(userImage, wardrobe.top, wardrobe.bottom);
      setResultImage(result);
    } catch (err) {
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removeItem = async (type: 'top' | 'bottom') => {
    const newWardrobe = { ...wardrobe };
    delete newWardrobe[type];
    setWardrobe(newWardrobe);
    await chrome.storage.local.set({ 'stylein_current_wardrobe': newWardrobe });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="glass-panel px-4 py-3 flex justify-between items-center sticky top-0 z-30 border-b border-white/50 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">AnyWear</h1>
        </div>
        <button onClick={onResetProfile} className="px-3 py-1 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors">
          Reset Profile
        </button>
      </header>

      {/* Main Content - Flex layout to fit screen */}
      <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
        
        {/* Result Area - Dynamic height to fill available space */}
        <div className="flex-1 relative w-full bg-slate-100/50 rounded-2xl shadow-inner border border-slate-100 overflow-hidden group min-h-[200px]">
          {resultImage ? (
            <img src={resultImage} alt="Virtual Try-On Result" className="w-full h-full object-contain animate-fade-in" />
          ) : (
            <img src={userImage} alt="User Profile" className="w-full h-full object-contain" />
          )}
          
          {/* Overlay for Loading */}
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-10 transition-all duration-500">
               <div className="relative w-16 h-16 mb-4">
                 <div className="absolute inset-0 border-[5px] border-indigo-100 rounded-full"></div>
                 <div className="absolute inset-0 border-[5px] border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
               </div>
              <p className="text-sm font-bold text-slate-800 animate-pulse">{loadingMessage}</p>
            </div>
          )}
        </div>

        {/* Clothing Slots - Fixed height area */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Wardrobe</h2>
            <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Auto-detected</span>
          </div>
          
          <div className="grid gap-2">
            <ClothingSlot 
              type="top" 
              item={wardrobe.top} 
              onRemove={removeItem} 
            />
            
            <ClothingSlot 
              type="bottom" 
              item={wardrobe.bottom} 
              onRemove={removeItem} 
            />
          </div>
        </div>

        {error && (
          <div className="shrink-0 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2">
            <span>🚫</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <footer className="p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 sticky bottom-0 z-30 shrink-0">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || (!wardrobe.top && !wardrobe.bottom)}
          className={`
            w-full py-3 font-bold rounded-xl shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-wide
            ${isGenerating || (!wardrobe.top && !wardrobe.bottom) 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:translate-y-[-1px]'}
          `}
        >
          {isGenerating ? (
            'Processing...'
          ) : (
            <>
              <span>✨</span>
              <span>Visualize Outfit</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
};