// popup.js - Extension popup logic

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');

  // Get current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    // Add to home
    document.getElementById('add-home').addEventListener('click', () => {
      addShortcut(tab, 'main');
    });

    // Add to library
    document.getElementById('add-library').addEventListener('click', () => {
      addShortcut(tab, 'extended');
    });

    // Open new tab
    document.getElementById('open-newtab').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('nuetab.html') });
      window.close();
    });
  });

  function addShortcut(tab, location) {
    const url = tab.url;
    const title = tab.title || 'Untitled';

    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      showStatus('无法添加此页面', 'error');
      return;
    }

    // 创建快捷方式对象
    const newItem = {
      id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: title,
      url: url,
      loc: location,
      cat: 'c_sys',
      svgSize: 60
    };

    // 发送消息给 background
    chrome.runtime.sendMessage({
      action: 'addShortcut',
      shortcut: newItem,
      location: location
    }, (response) => {
      if (response && response.success) {
        showStatus(`已添加到${location === 'main' ? '首页' : '应用库'}`, 'success');
      } else {
        showStatus('添加成功（请刷新新标签页查看）', 'success');
      }
    });
  }

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }, 2000);
  }
});
