// background.js - Service Worker

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addShortcut') {
    // 广播给所有 NueTab 标签页
    chrome.tabs.query({ url: chrome.runtime.getURL('nuetab.html') }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'addShortcut',
          shortcut: message.shortcut,
          location: message.location
        });
      });
    });
    
    // 同时也保存到 chrome.storage 作为备份
    chrome.storage.local.get(['nuetab_ult_data'], (result) => {
      let data;
      try {
        data = result.nuetab_ult_data ? JSON.parse(result.nuetab_ult_data) : null;
        if (!data) {
          data = {
            categories: [
              { id: 'c_sys', name: '系统', icon: '<svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg>' }
            ],
            shortcuts: []
          };
        }
        
        // 检查是否存在
        const exists = data.shortcuts.some(s => s.url === message.shortcut.url);
        if (!exists) {
          data.shortcuts.push(message.shortcut);
          chrome.storage.local.set({ nuetab_ult_data: JSON.stringify(data) });
        }
      } catch (e) {
        console.error('Error saving:', e);
      }
    });
    
    sendResponse({ success: true });
  }
  return true;
});
