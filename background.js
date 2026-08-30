// background.js - Service Worker

const DEFAULT_STORAGE_DATA = () => ({
  settings: {},
  engines: [
    { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s', icon: '' },
    { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: '' },
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', icon: '' }
  ],
  categories: [
    { id: 'c_sys', name: '系统', icon: '<svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg>' }
  ],
  shortcuts: [],
  _savedAt: 0
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addShortcut' && message.shortcut) {
    // 广播给所有 NueTab 标签页
    chrome.tabs.query({ url: chrome.runtime.getURL('nuetab.html') }, (tabs) => {
      tabs.forEach(tab => {
        const p = chrome.tabs.sendMessage(tab.id, {
          action: 'addShortcut',
          shortcut: message.shortcut,
          location: message.location
        });
        if (p && p.catch) p.catch(() => {});
      });
    });

    // 写入 chrome.storage（保留完整数据结构，新标签页启动时会按时间戳同步）
    chrome.storage.local.get(['nuetab_ult_data'], (result) => {
      let data;
      try {
        data = result.nuetab_ult_data ? JSON.parse(result.nuetab_ult_data) : null;
      } catch (e) { data = null; }
      if (!data || typeof data !== 'object' || !Array.isArray(data.shortcuts)) data = DEFAULT_STORAGE_DATA();
      if (!Array.isArray(data.categories) || !data.categories.length) data.categories = DEFAULT_STORAGE_DATA().categories;
      if (!Array.isArray(data.engines) || !data.engines.length) data.engines = DEFAULT_STORAGE_DATA().engines;
      if (!data.settings || typeof data.settings !== 'object') data.settings = {};

      const exists = data.shortcuts.some(s => s && s.url === message.shortcut.url);
      if (!exists) {
        data.shortcuts.push(message.shortcut);
        data._savedAt = Date.now();
        chrome.storage.local.set({ nuetab_ult_data: JSON.stringify(data) });
      }
    });

    sendResponse({ success: true });
  }
  return true;
});
