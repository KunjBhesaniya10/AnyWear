// AnyWear Content Script - Smarter detection and robust UI
interface ProductDetails {
  title: string;
  description: string;
  imageUrl: string;
}

const FASHION_KEYWORDS = ['shirt', 'pant', 'dress', 'shoe', 'wear', 'cloth', 'model', 'jean', 'jacket', 'coat', 'suit', 'top', 'bottom', 'skirt', 'apparel', 'fit'];

function isFashionImage(img: HTMLImageElement): boolean {
  const rect = img.getBoundingClientRect();
  // Filter by size
  if (rect.width < 200 || rect.height < 200) return false;
  
  // Filter by aspect ratio (mostly vertical or square for clothing)
  const ratio = rect.height / rect.width;
  if (ratio < 0.5 || ratio > 3) return false;

  // Filter by context (alt text or src)
  const searchString = (img.alt + " " + img.src + " " + img.className).toLowerCase();
  return FASHION_KEYWORDS.some(keyword => searchString.includes(keyword));
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

function getProductTitle(): string {
  const h1 = document.querySelector('h1');
  if (h1) return h1.innerText.trim();
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) return (ogTitle as HTMLMetaElement).content;
  return document.title.split('|')[0].split('-')[0].trim();
}

let activeBtn: HTMLButtonElement | null = null;

document.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'IMG') {
    const img = target as HTMLImageElement;
    if (!isFashionImage(img)) return;
    if (activeBtn) return;
    injectHoverButton(img);
  }
}, { passive: true });

function injectHoverButton(img: HTMLImageElement) {
  const button = document.createElement('button');
  button.className = 'anywear-float-btn';
  button.innerHTML = "✨ AnyWear";
  
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
    minWidth: '110px',
    maxWidth: '180px',
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

    const product = {
      id: crypto.randomUUID(),
      url: window.location.href,
      title: getProductTitle(),
      imageUrl: bestImageUrl,
      description: extractFabricDetails(),
      timestamp: Date.now()
    };

    chrome.runtime.sendMessage({
      type: 'ADD_PRODUCT',
      payload: product
    }, () => {
      button.innerText = "✅ Saved!";
      button.style.background = '#10b981';
      setTimeout(cleanup, 2000);
    });
  };
}
