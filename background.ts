import { STORAGE_KEYS } from './constants';
import { ScrapedProduct, WardrobeState } from './types';

// Configure Side Panel to open automatically when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("SidePanel behavior error:", error));

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === 'ADD_PRODUCT') {
    handleNewProduct(message.payload).then(() => {
      sendResponse({ status: 'success' });
    });
    return true; 
  }
});

async function handleNewProduct(product: ScrapedProduct) {
  // Logic: Determine if Top or Bottom based on keywords
  const lowerText = (product.title + " " + product.description).toLowerCase();
  let isBottom = false;
  
  const bottomKeywords = ['pant', 'jean', 'skirt', 'trouser', 'short', 'legging', 'sweatpant', 'jogger', 'denim'];
  if (bottomKeywords.some(kw => lowerText.includes(kw))) {
    isBottom = true;
  }
  
  const data = await chrome.storage.local.get(STORAGE_KEYS.WARDROBE);
  const currentWardrobe: WardrobeState = data[STORAGE_KEYS.WARDROBE] || {};

  if (isBottom) {
    currentWardrobe.bottom = product;
  } else {
    currentWardrobe.top = product;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.WARDROBE]: currentWardrobe });
  
  // Safely notify the Side Panel only if it's listening
  chrome.runtime.sendMessage({ type: 'WARDROBE_UPDATED', payload: currentWardrobe })
    .catch(() => {
      // Catch error quietly: happens if side panel is closed
    });
}