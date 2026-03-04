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
      chrome.tabs.create({ url: 'nuetab.html' });
      window.close();
    });
  });

  function addShortcut(tab, location) {
    const url = tab.url;
    const title = tab.title || 'Untitled';

    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      showStatus('无法添加此页面', 'error');
      return;
    }

    chrome.storage.local.get(['nuetab_ult_data'], (result) => {
      let data;
      try {
        if (result.nuetab_ult_data) {
          data = JSON.parse(result.nuetab_ult_data);
        } else {
          // Default structure
          data = {
            categories: [
              { id: 'c_sys', name: '系统', icon: '<svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg>' },
              { id: 'c_work', name: '办公', icon: '<svg viewBox="0 0 24 24" fill="#fff"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>' }
            ],
            shortcuts: []
          };
        }
      } catch (e) {
        console.error('Parse error:', e);
        showStatus('数据读取失败', 'error');
        return;
      }

      // Check if exists
      const exists = data.shortcuts.some(s => s.url === url);
      if (exists) {
        showStatus('此网站已存在', 'error');
        return;
      }

      // Create new shortcut
      const newItem = {
        id: 's' + Date.now(),
        name: title,
        url: url,
        loc: location,
        cat: data.categories[0]?.id || 'c_sys',
        svgSize: 60
      };

      data.shortcuts.push(newItem);
      chrome.storage.local.set({ nuetab_ult_data: JSON.stringify(data) }, () => {
        showStatus(`已添加到${location === 'main' ? '首页' : '应用库'}`, 'success');
      });
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
