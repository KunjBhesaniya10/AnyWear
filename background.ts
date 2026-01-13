import { STORAGE_KEYS } from './constants';
import { ScrapedProduct, WardrobeState } from './types';

// Open dashboard tab when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('index.html')
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_PRODUCT') {
    handleNewProduct(message.payload).then(() => {
      sendResponse({ status: 'success' });
    });
    return true; 
  }
  
  if (message.type === 'CHECK_WARDROBE_STATE') {
    // Return current wardrobe state for validation
    chrome.storage.local.get(STORAGE_KEYS.WARDROBE).then(result => {
      const wardrobe: WardrobeState = result[STORAGE_KEYS.WARDROBE] || {};
      sendResponse({ 
        hasTop: !!wardrobe.top,
        hasBottom: !!wardrobe.bottom,
        canVisualize: !!(wardrobe.top && wardrobe.bottom)
      });
    });
    return true;
  }
});

async function handleNewProduct(product: ScrapedProduct) {
  // Only process if we're on a product page
  const isProductPage = await isCurrentPageProductPage();
  if (!isProductPage) {
    console.log('Not on product page, skipping product addition');
    return;
  }

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
  
  // Safely notify the side panel only if it's listening
  chrome.runtime.sendMessage({ type: 'WARDROBE_UPDATED', payload: currentWardrobe })
    .catch(() => {
      // Catch error quietly: happens if side panel is closed
    });
}

async function isCurrentPageProductPage(): Promise<boolean> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url) return false;
    
    const url = new URL(tab.url);
    const pathname = url.pathname;
    
    const marketplacePatterns = [
      '/dp/',             // Amazon (Detail Page)
      '/gp/product/',     // Amazon (General Product)
      '/p/',              // Flipkart, Target (Short product links)
      '/buy/',            // Myntra (e.g., myntra.com/tshirt/buy)
      '/ip/',             // Walmart (Item Page)
      '/pd/',             // Generic "Product Detail"
      '/catalog/product/' // Magento / Adobe Commerce default
    ];
    
    return marketplacePatterns.some(pattern => pathname.includes(pattern));
  } catch (e) {
    console.error('Error checking product page:', e);
    return false;
  }
}