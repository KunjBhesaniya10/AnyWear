// AnyWear Content Script - Product Page Detection and Extraction
interface ProductData {
  isValid: boolean;
  image: string;
  title: string;
  description: string;
}

const marketplacePatterns = [
  '/dp/',             // Amazon (Detail Page)
  '/gp/product/',     // Amazon (General Product)
  '/p/',              // Flipkart, Target (Short product links)
  '/buy/',            // Myntra (e.g., myntra.com/tshirt/buy)
  '/ip/',             // Walmart (Item Page)
  '/pd/',             // Generic "Product Detail"
  '/catalog/product/' // Magento / Adobe Commerce default
];

function isProductPage(): boolean {
  const pathname = window.location.pathname;
  return marketplacePatterns.some(pattern => pathname.includes(pattern));
}

function extractFromSchema(): ProductData | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      if (data['@type'] === 'Product') {
        const image = data.image || data.image?.[0] || '';
        const title = data.name || '';
        const description = data.description || '';
        
        if (image && title) {
          return {
            isValid: true,
            image: image,
            title: title,
            description: description
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse schema:', e);
    }
  }
  
  return null;
}

function extractFromPage(): ProductData | null {
  if (!isProductPage()) {
    return {
      isValid: false,
      image: '',
      title: '',
      description: ''
    };
  }

  // First try schema extraction
  const schemaData = extractFromSchema();
  if (schemaData && schemaData.isValid) {
    return schemaData;
  }

  // Fallback to manual extraction
  const mainImage = document.querySelector('img[id*="main"], img[class*="main"], img[class*="product"], img[alt*="product"]') as HTMLImageElement;
  const title = document.querySelector('h1')?.textContent?.trim() || document.title.split('|')[0].split('-')[0].trim();
  
  if (mainImage && title) {
    return {
      isValid: true,
      image: mainImage.src,
      title: title,
      description: extractFabricDetails()
    };
  }

  return null;
}

function extractFabricDetails(): string {
  const keywords = ["Material", "Fabric", "Composition", "Fit", "Description", "Details", "Cotton", "Polyester", "Silk"];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  
  let details = "";
  let node;
  let count = 0;
  
  while ((node = walker.nextNode()) && count < 8) {
    const text = node.textContent?.trim();
    if (text && keywords.some(k => text.includes(k)) && text.length > 10 && text.length < 400) {
      details += text + ". ";
      count++;
    }
  }
  return details.trim();
}

// Main scan function
function scanPage(): ProductData | null {
  try {
    return extractFromPage();
  } catch (e) {
    console.error('Scan page failed:', e);
    return null;
  }
}

let activeBtn: HTMLButtonElement | null = null;

// Only run on product pages
if (isProductPage()) {
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      if (activeBtn) return;
      injectHoverButton(img);
    }
  }, { passive: true });
}

function injectHoverButton(img: HTMLImageElement) {
  const button = document.createElement('button');
  button.className = 'anywear-float-btn';
  button.innerHTML = "✨ Add to Wardrobe";
  
  // Use a fixed width and very specific styles to prevent site CSS interference
  Object.assign(button.style, {
    position: 'absolute',
    zIndex: '2147483647',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: '100px',
    padding: '0 16px',
    height: '36px',
    width: 'auto',
    minWidth: '140px',
    maxWidth: '200px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '800',
    boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    pointerEvents: 'auto',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    margin: '0',
    boxSizing: 'border-box'
  });

  const updatePosition = () => {
    const rect = img.getBoundingClientRect();
    const top = rect.top + window.scrollY + 12;
    const left = rect.left + window.scrollX + 12;
    button.style.top = `${top}px`;
    button.style.left = `${left}px`;
  };

  updatePosition();
  document.body.appendChild(button);
  activeBtn = button;

  button.onmouseenter = () => { 
    button.style.transform = 'scale(1.05) translateY(-2px)';
    button.style.boxShadow = '0 15px 30px -5px rgba(79, 70, 229, 0.5)';
  };
  button.onmouseleave = () => { 
    button.style.transform = 'scale(1) translateY(0)';
  };

  const cleanup = () => {
    if (activeBtn === button) {
      button.remove();
      activeBtn = null;
    }
  };

  // Improved hover lifecycle
  const checkLeave = (e: MouseEvent) => {
    const related = e.relatedTarget as HTMLElement;
    if (related !== button && related !== img) {
      cleanup();
    }
  };

  img.addEventListener('mouseleave', checkLeave);
  button.addEventListener('mouseleave', checkLeave);
  
  // Remove if image is scrolled away
  window.addEventListener('scroll', cleanup, { once: true, passive: true });

  button.onclick = async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    
    button.innerText = "✨ Processing...";
    button.disabled = true;
    
    let bestImageUrl = img.src;
    const zoomAttr = img.getAttribute('data-zoom-image') || img.getAttribute('data-high-res') || img.src;
    if (zoomAttr && zoomAttr.startsWith('http')) bestImageUrl = zoomAttr;

    const productData = scanPage();
    if (!productData || !productData.isValid) {
      button.innerText = "❌ Product Not Found";
      button.style.background = '#ef4444';
      setTimeout(cleanup, 2000);
      return;
    }

    const product = {
      id: crypto.randomUUID(),
      url: window.location.href,
      title: productData.title,
      imageUrl: bestImageUrl,
      description: productData.description,
      timestamp: Date.now()
    };

    chrome.runtime.sendMessage({
      type: 'ADD_PRODUCT',
      payload: product
    }, () => {
      button.innerText = "✅ Added!";
      button.style.background = '#10b981';
      setTimeout(cleanup, 2000);
    });
  };
}

// Listen for wardrobe state changes
chrome.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'WARDROBE_UPDATED') {
    // Update UI based on wardrobe state if needed
    console.log('Wardrobe updated:', message.payload);
  }
});
