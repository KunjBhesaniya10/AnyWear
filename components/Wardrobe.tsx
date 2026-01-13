
import { useEffect, useState } from 'react';
import { WardrobeState, ScrapedProduct, OutfitHistory, SavedOutfit } from '../types';
import { generateTryOn } from '../services/geminiService';
import { STORAGE_KEYS } from '../constants';

interface Props {
  userImage: string;
  initialWardrobe: WardrobeState;
  onResetProfile: () => void;
  onBackToDashboard?: () => void;
}

const LOADING_MESSAGES = [
  "Analyzing fabric details...",
  "Mapping body shape...",
  "Draping fabric...",
  "Adjusting lighting...",
  "Finalizing look..."
];

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
        : 'bg-slate-50/50 border-slate-200 border-dashed'
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
          {item ? item.title : `No ${type === 'top' ? 'Top' : 'Bottom'} Added`}
        </p>
      </div>

      {item && (
        <button 
          onClick={() => onRemove(type)} 
          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const Wardrobe: React.FC<Props> = ({ userImage, initialWardrobe, onResetProfile, onBackToDashboard }) => {
  const [wardrobe, setWardrobe] = useState<WardrobeState>(initialWardrobe);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [canVisualize, setCanVisualize] = useState(true);

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

  useEffect(() => {
    // Check wardrobe state and update visualize button
    const hasTop = !!wardrobe.top;
    const hasBottom = !!wardrobe.bottom;
    setCanVisualize(hasTop || hasBottom);
  }, [wardrobe]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!wardrobe.top && !wardrobe.bottom) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateTryOn(userImage, wardrobe.top, wardrobe.bottom);
      setResultImage(result);
      
      // Save to history
      const historyItem: OutfitHistory = {
        id: crypto.randomUUID(),
        resultImage: result,
        top: wardrobe.top,
        bottom: wardrobe.bottom,
        timestamp: Date.now(),
        userImage: userImage
      };
      
      const existingHistory = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      const history = existingHistory[STORAGE_KEYS.HISTORY] || [];
      const updatedHistory = [...history, historyItem].slice(-50); // Keep last 50 items
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updatedHistory });
      
    } catch (err) {
      setError("Failed to generate outfit. Check your connection.");
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

  const handleSaveOutfit = async () => {
    if (!resultImage || !outfitName.trim()) return;
    
    const savedOutfit: SavedOutfit = {
      id: crypto.randomUUID(),
      name: outfitName.trim(),
      resultImage: resultImage,
      top: wardrobe.top,
      bottom: wardrobe.bottom,
      createdAt: Date.now()
    };
    
    const existingOutfits = await chrome.storage.local.get(STORAGE_KEYS.SAVED_OUTFITS);
    const outfits = existingOutfits[STORAGE_KEYS.SAVED_OUTFITS] || [];
    const updatedOutfits = [...outfits, savedOutfit];
    await chrome.storage.local.set({ [STORAGE_KEYS.SAVED_OUTFITS]: updatedOutfits });
    
    setShowSaveDialog(false);
    setOutfitName('');
  };

  const isWardrobeEmpty = !wardrobe.top && !wardrobe.bottom;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="px-4 py-4 flex justify-between items-center border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button 
              onClick={onBackToDashboard}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-2xl">✨</span>
          <h1 className="text-xl font-black text-indigo-600 tracking-tight">AnyWear</h1>
        </div>
        <button onClick={onResetProfile} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Reset Profile">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </header>

      <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0 overflow-y-auto">
        {/* Result/Preview Area */}
        <div className="aspect-[3/4] relative w-full bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-sm shrink-0">
          {resultImage ? (
            <>
              <img src={resultImage} alt="Result" className="w-full h-full object-contain animate-fade-in" />
              {/* Save Outfit Button */}
              <button
                onClick={() => setShowSaveDialog(true)}
                className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm border border-white shadow-lg rounded-full flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Save Outfit"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </>
          ) : (
            <img src={userImage} alt="User" className="w-full h-full object-contain" />
          )}
          
          {isGenerating && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-widest animate-pulse">{loadingMessage}</p>
            </div>
          )}
        </div>

        {/* Empty State Instructions */}
        {isWardrobeEmpty && !isGenerating && (
          <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-fade-in-up">
            <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <span>🚀</span> Get Started
            </h3>
            <ul className="space-y-3">
              {[
                "Visit any clothing store (Amazon, Zara, etc.)",
                "Navigate to a product's main page",
                "Hover over a product image",
                "Click the ✨ Add to Wardrobe button"
              ].map((step, idx) => (
                <li key={idx} className="flex gap-3 text-xs text-indigo-700 leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center font-bold shadow-sm">{idx + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Wardrobe Controls */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Selected Items</h2>
          <div className="grid gap-2">
            <ClothingSlot type="top" item={wardrobe.top} onRemove={removeItem} />
            <ClothingSlot type="bottom" item={wardrobe.bottom} onRemove={removeItem} />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || isWardrobeEmpty || !canVisualize}
          className={`
            w-full py-4 font-black rounded-2xl shadow-xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 text-xs uppercase tracking-widest
            ${isGenerating || isWardrobeEmpty || !canVisualize
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl'}
          `}
        >
          {isGenerating ? 'Processing...' : (
            <><span className="text-base">✨</span> Visualize Outfit</>
          )}
        </button>
        
        {!canVisualize && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 text-center">
              <span className="font-bold">⚠️ Product Page Required</span><br />
              Please navigate to a product's main page to add items to your wardrobe
            </p>
          </div>
        )}
      </div>

      {/* Save Outfit Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Save Outfit</h3>
            <div className="aspect-[3/4] w-32 h-40 mx-auto mb-4 rounded-lg overflow-hidden border border-slate-200">
              <img src={resultImage!} alt="Outfit preview" className="w-full h-full object-cover" />
            </div>
            <input
              type="text"
              placeholder="Outfit name..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveOutfit}
                disabled={!outfitName.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setOutfitName('');
                }}
                className="flex-1 py-2 bg-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
