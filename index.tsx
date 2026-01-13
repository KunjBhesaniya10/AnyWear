import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill Chrome API for Web Browser Preview
// This allows the app to run in a standard browser environment by mocking chrome.storage.local with localStorage
if (typeof window !== 'undefined' && (!window.chrome || !window.chrome.storage)) {
  console.log('Polyfilling Chrome Extension API for web preview...');
  
  (window as any).chrome = {
    ...(window.chrome || {}),
    storage: {
      local: {
        get: (keys: string | string[] | null) => {
          return new Promise((resolve) => {
            const data: any = {};
            if (keys === null) {
              // Get all
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) {
                  try {
                    data[k] = JSON.parse(localStorage.getItem(k) || 'null');
                  } catch (e) {}
                }
              }
            } else {
              const keyList = Array.isArray(keys) ? keys : [keys];
              keyList.forEach((k) => {
                const item = localStorage.getItem(k);
                if (item) {
                  try {
                    data[k] = JSON.parse(item);
                  } catch (e) {}
                }
              });
            }
            resolve(data);
          });
        },
        set: (items: any) => {
          return new Promise((resolve) => {
            Object.entries(items).forEach(([key, value]) => {
              localStorage.setItem(key, JSON.stringify(value));
            });
            resolve(undefined);
          });
        },
        remove: (keys: string | string[]) => {
          return new Promise((resolve) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach((k) => localStorage.removeItem(k));
            resolve(undefined);
          });
        }
      }
    },
    runtime: {
      onMessage: {
        addListener: () => {},
        removeListener: () => {}
      },
      sendMessage: (_: any, cb?: any) => {
        if (cb) cb();
      }
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);