// This script runs on web pages (Amazon, Myntra, etc.)

interface ProductDetails {
  title: string;
  description: string;
  imageUrl: string;
}

// Helper to find texture/fabric details
function extractFabricDetails(): string {
  const keywords = ["Material", "Fabric", "Composition", "Fit", "Description", "Details"];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  
  let details = "";
  let node;
  let count = 0;
  
  // Basic heuristic: Scan text nodes for keywords, capture surrounding text
  while ((node = walker.nextNode()) && count < 10) {
    const text = node.textContent?.trim();
    if (text && keywords.some(k => text.includes(k)) && text.length > 10 && text.length < 300) {
      details += text + ". ";
      count++;
    }
  }

  // Fallback to meta description if nothing found
  if (!details) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) details = metaDesc.getAttribute('content') || "";
  }

  return details.trim();
}

function getProductTitle(): string {
  const h1 = document.querySelector('h1');
  return h1 ? h1.innerText.trim() : document.title;
}

// Inject Hover Button Logic
document.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement;
  
  if (target.tagName === 'IMG') {
    const img = target as HTMLImageElement;
    
    // Ignore small icons or tiny images
    if (img.width < 200 || img.height < 200) return;

    // Check if we already injected a button wrapper
    if (img.parentElement?.classList.contains('stylein-wrapper')) return;

    injectHoverButton(img);
  }
});

function injectHoverButton(img: HTMLImageElement) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stylein-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  
  const button = document.createElement('button');
  button.innerText = "✨ AnyWear"; // REBRANDED
  button.style.position = 'absolute';
  button.style.zIndex = '99999';
  button.style.top = '10px';
  button.style.right = '10px';
  button.style.background = 'linear-gradient(135deg, #4F46E5, #7C3AED)'; // Gradient
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '20px';
  button.style.padding = '8px 16px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.2)';
  button.style.fontSize = '14px';
  button.style.fontWeight = 'bold';
  button.style.transition = 'all 0.2s';

  // Position logic
  const rect = img.getBoundingClientRect();
  button.style.left = `${rect.left + window.scrollX + rect.width - 100}px`;
  button.style.top = `${rect.top + window.scrollY + 10}px`;
  
  // Append to body
  document.body.appendChild(button);

  // Remove button after a few seconds of no hover on image
  let timeout: any;
  const removeButton = () => {
    timeout = setTimeout(() => {
      button.remove();
      img.removeEventListener('mouseleave', removeButton);
    }, 2000);
  };
  
  button.addEventListener('mouseenter', () => clearTimeout(timeout));
  button.addEventListener('mouseleave', removeButton);
  img.addEventListener('mouseleave', removeButton);

  button.onclick = async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    
    button.innerText = "Extracting...";
    
    let bestImageUrl = img.src;
    const zoomAttr = img.getAttribute('data-zoom-image') || img.getAttribute('data-high-res');
    if (zoomAttr) bestImageUrl = zoomAttr;

    const title = getProductTitle();
    const details = extractFabricDetails();
    const richDescription = `${title}. ${details}`;

    const product = {
      id: crypto.randomUUID(),
      url: window.location.href,
      title: title,
      imageUrl: bestImageUrl,
      description: richDescription,
      timestamp: Date.now()
    };

    chrome.runtime.sendMessage({
      type: 'ADD_PRODUCT',
      payload: product
    }, (response: any) => {
      button.innerText = "Added!";
      setTimeout(() => button.remove(), 1500);
    });
  };
}