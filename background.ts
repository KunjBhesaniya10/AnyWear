import { STORAGE_KEYS } from './constants';
import { ScrapedProduct, WardrobeState } from './types';

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === 'ADD_PRODUCT') {
    handleNewProduct(message.payload).then(() => {
      sendResponse({ status: 'success' });
    });
    return true; // Keep channel open for async response
  }
});

// Open side panel on action click
chrome.action.onClicked.addListener((tab: any) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

async function handleNewProduct(product: ScrapedProduct) {
  // Logic: Determine if Top or Bottom based on keywords in title/desc
  // This is a simple heuristic.
  const lowerText = (product.title + " " + product.description).toLowerCase();
  let isBottom = false;
  if (lowerText.includes('pant') || lowerText.includes('jean') || lowerText.includes('skirt') || lowerText.includes('trouser') || lowerText.includes('short')) {
    isBottom = true;
  }
  
  // Fetch current wardrobe
  const data = await chrome.storage.local.get(STORAGE_KEYS.WARDROBE);
  const currentWardrobe: WardrobeState = data[STORAGE_KEYS.WARDROBE] || {};

  // Mix & Match Logic
  if (isBottom) {
    currentWardrobe.bottom = product;
  } else {
    currentWardrobe.top = product;
  }

  // Save back
  await chrome.storage.local.set({ [STORAGE_KEYS.WARDROBE]: currentWardrobe });
  
  // Optional: Notify Side Panel if open (runtime.sendMessage targets all extension views)
  chrome.runtime.sendMessage({ type: 'WARDROBE_UPDATED', payload: currentWardrobe });
}
