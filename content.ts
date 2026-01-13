import { STORAGE_KEYS } from './constants';
import { ScrapedProduct, WardrobeState } from './types';

// Create floating hanger button
function createFloatingButton() {
  const existingButton = document.getElementById('anywear-fab');
  if (existingButton) existingButton.remove();

  const fab = document.createElement('div');
  fab.id = 'anywear-fab';
  fab.innerHTML = '👔';
  fab.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
    border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%);
    border: none; color: white; font-size: 24px; cursor: pointer; z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); transition: all 0.3s ease;
    display: flex; align-items: center; justify-content: center;
  `;
  
  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.1)';
    fab.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
  });
  
  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1)';
    fab.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  fab.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    } catch (error) {
      showToast('Please open Side Panel from Chrome menu to start trying on!');
    }
  });

  document.body.appendChild(fab);
}

// Create toast notification
function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #1f2937; color: white;
    padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); opacity: 0; transform: translateY(-20px);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 100);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Check if current page is a shopping site
function isShoppingSite(): boolean {
  const shoppingSites = ['amazon.com', 'flipkart.com', 'myntra.com', 'walmart.com', 'target.com'];
  const currentDomain = window.location.hostname.toLowerCase();
  return shoppingSites.some(site => currentDomain.includes(site));
}

// Initialize floating button on shopping sites
if (isShoppingSite()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }
}

// Existing scanPage function
export async function scanPage(): Promise<{ isValid: boolean; image: string; title: string; description: string } | null> {
  try {
    const url = new URL(window.location.href);
    const pathname = url.pathname;
    
    const marketplacePatterns = ['/dp/', '/gp/product/', '/p/', '/buy/', '/ip/', '/pd/', '/catalog/product/'];
    const isProductPage = marketplacePatterns.some(pattern => pathname.includes(pattern));
    if (!isProductPage) return null;

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] === 'Product') {
          const image = data.image || data.image?.[0]?.url || '';
          const title = data.name || '';
          const description = data.description || '';
          
          if (image && title) {
            return { isValid: true, image, title, description };
          }
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
      }
    }

    const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                  document.querySelector('title')?.textContent || '';
    const image = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                 document.querySelector('img')?.src || '';
    const description = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

    if (title && image) {
      return { isValid: true, image, title, description };
    }

    return null;
  } catch (error) {
    console.error('Error scanning page:', error);
    return null;
  }
}
