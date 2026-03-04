// 右键菜单功能
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'add-to-home',
    title: '添加到首页',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'add-to-library',
    title: '添加到应用库',
    contexts: ['page']
  });
});

// 处理菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-to-home' || info.menuItemId === 'add-to-library') {
    // 发送消息给 content script 或直接存储
    chrome.storage.local.get(['nuetab_ult_data'], (result) => {
      let data;
      try {
        if (result.nuetab_ult_data) {
          data = JSON.parse(result.nuetab_ult_data);
        } else {
          // 默认数据结构
          data = {
            settings: {
              gridCols: 6,
              iconRadius: 20,
              iconOpacity: 20,
              bgBlur: 0,
              widgetGap: 4,
              gridPadding: 0,
              pagePadH: 5,
              bgType: 'bing',
              bgValue: '',
              bgFit: 'cover',
              navMode: 'scroll',
              headerAlign: 'right',
              linkTarget: '_self',
              searchStyle: 'dark',
              searchRadius: 18,
              searchSuggestions: true,
              showWeather: true,
              iconSource: 'https://www.google.com/s2/favicons?domain={domain}&sz=128',
              timeColor: 'linear-gradient(to bottom, #fff, #ccc)',
              dateColor: 'rgba(255,255,255,0.8)',
              weatherColor: '#ffffff',
              weather: { city: 'Beijing', lat: 39.9, lon: 116.4 },
              currEngine: 'baidu',
              layoutOrder: ['widget-header', 'widget-search', 'widget-grid']
            },
            engines: [
              { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s', icon: '' },
              { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: '' },
              { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', icon: '' }
            ],
            categories: [
              { id: 'c_sys', name: '系统', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' },
              { id: 'c_work', name: '办公', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v6z"/></svg>' }
            ],
            shortcuts: [
              { id: 's_hist', name: '历史记录', url: 'ext://history', cat: 'c_sys', loc: 'main', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>', iconColor: '#ffbb00', svgSize: 60 },
              { id: 's_bm', name: '收藏夹', url: 'ext://bookmarks', cat: 'c_sys', loc: 'main', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>', iconColor: '#00f2ea', svgSize: 60 }
            ]
          };
        }
      } catch (e) {
        console.error('Parse error:', e);
        return;
      }

      // 创建新的快捷方式
      const newItem = {
        id: 's' + Date.now(),
        name: tab.title || 'Untitled',
        url: tab.url,
        loc: info.menuItemId === 'add-to-home' ? 'main' : 'extended',
        cat: data.categories[0]?.id || 'c_sys',
        svgSize: 60
      };

      // 检查是否已存在相同URL
      const exists = data.shortcuts.some(s => s.url === newItem.url);
      if (!exists) {
        data.shortcuts.push(newItem);
        chrome.storage.local.set({ nuetab_ult_data: JSON.stringify(data) });
        
        // 显示通知
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'NueTab',
          message: `已将 "${newItem.name}" 添加到${info.menuItemId === 'add-to-home' ? '首页' : '应用库'}`
        });
      } else {
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'NueTab',
          message: '此网站已在快捷方式中'
        });
      }
    });
  }
});
