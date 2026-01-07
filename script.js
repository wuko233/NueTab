/**
 * 资产管理器
 */
class AssetManager {
    constructor() {
        this.dbName = 'NueTabDB'; this.storeName = 'assets'; this.db = null;
        this.init();
    }
    async init() {
        try {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = e => { if(!e.target.result.objectStoreNames.contains(this.storeName)) e.target.result.createObjectStore(this.storeName); };
            req.onsuccess = e => { this.db = e.target.result; };
        } catch(e) {}
    }
    loadImg(imgEl, url, letterEl) {
        if (!url || !imgEl) return;
        if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) {
            imgEl.src = url; imgEl.style.display = 'block';
            if(letterEl) letterEl.style.display = 'none';
            return;
        }
        if(letterEl) letterEl.style.display = 'flex'; imgEl.style.display = 'none';
        const applySrc = (src) => {
            imgEl.src = src;
            imgEl.onload = () => { if(letterEl) letterEl.style.display = 'none'; imgEl.style.display='block'; };
            imgEl.onerror = () => { imgEl.style.display = 'none'; if(letterEl) letterEl.style.display = 'flex'; };
        };
        if(url.startsWith('data:') || url.startsWith('http')) applySrc(url);
    }
    async clear() {
        if(!this.db) return;
        this.db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).clear();
        alert('缓存已清理'); this.updateStat();
    }
    updateStat() {
        if(!this.db) return;
        const req = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).count();
        req.onsuccess = () => { const el = document.getElementById('cache-stat'); if(el) el.innerText = `${req.result} 个项目`; };
    }
}
const assetManager = new AssetManager();

const DEFAULT_DATA = {
    settings: {
        gridCols: 6, iconRadius: 20, iconOpacity: 20, bgBlur: 0, 
        widgetGap: 4, gridPadding: 0, pagePadH: 5,
        bgType: 'bing', bgValue: '', bgFit: 'cover',
        navMode: 'scroll', headerAlign: 'right', linkTarget: '_self',
        searchStyle: 'dark', searchRadius: 18, 
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
        { id: 'c_work', name: '办公', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>' }
    ],
    shortcuts: [
        { id: 's_hist', name: '历史记录', url: 'ext://history', cat: 'c_sys', loc: 'main', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>', iconColor: '#ffbb00', svgSize: 60 },
        { id: 's_bm', name: '收藏夹', url: 'ext://bookmarks', cat: 'c_sys', loc: 'main', icon: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>', iconColor: '#00f2ea', svgSize: 60 }
    ]
};

class NueTab {
    constructor() {
        this.loadData();
        this.state = { 
            catFilter: this.data.categories[0]?.id || 'all', 
            dragSrc: null, 
            dragType: null,
            widgetDragSrc: null, 
            sidebarOpen: false,
            ctxData: null 
        };
        try { this.init(); } catch (e) { console.error(e); }
    }
    loadData() {
        try {
            const raw = localStorage.getItem('nuetab_ult_data');
            if (raw) {
                this.data = JSON.parse(raw);
                const def = DEFAULT_DATA.settings;
                for(let k in def) if(this.data.settings[k] === undefined) this.data.settings[k] = def[k];
            } else { this.data = JSON.parse(JSON.stringify(DEFAULT_DATA)); }
        } catch (e) { this.data = JSON.parse(JSON.stringify(DEFAULT_DATA)); }
    }
    async init() {
        this.renderLayout();
        await this.applyTheme();
        this.setupEvents();
    }
    save() { localStorage.setItem('nuetab_ult_data', JSON.stringify(this.data)); }

    getIconUrl(pageUrl) {
        if(!pageUrl || pageUrl.startsWith('ext://')) return null;
        try {
            const domain = new URL(pageUrl).hostname;
            const pattern = this.data.settings.iconSource || DEFAULT_DATA.settings.iconSource;
            return pattern.replace('{domain}', domain);
        } catch(e) { return null; }
    }

    renderLayout() {
        const root = document.getElementById('layout-root');
        root.innerHTML = '';
        const order = this.data.settings.layoutOrder || DEFAULT_DATA.settings.layoutOrder;
        
        order.forEach(widgetId => {
            const div = document.createElement('div');
            div.className = 'widget-block'; div.id = widgetId;
            div.draggable = document.body.classList.contains('layout-editing');

            if(widgetId === 'widget-header') {
                const align = this.data.settings.headerAlign;
                const weatherStyle = this.data.settings.showWeather ? '' : 'display:none;';
                div.innerHTML = `
                    <header class="header-content align-${align}">
                        <div class="time-widget" id="clock">00:00</div>
                        <div style="display:flex; flex-direction:column; align-items:${align === 'split' ? 'flex-end' : 'inherit'}">
                            <div class="date-widget" id="date">Loading...</div>
                            <div class="weather-widget" id="weather" style="${weatherStyle}"><span>定位中...</span></div>
                        </div>
                    </header>`;
                const w = div.querySelector('#weather'); if(w) w.onclick = () => this.openSettingsTab('tab-general');

            } else if(widgetId === 'widget-search') {
                div.innerHTML = `
                    <div class="search-wrapper">
                        <div class="search-container">
                            <div class="engine-select" id="engine-select-btn">
                                <img id="curr-engine-icon" src="" onerror="this.style.display='none'">
                                <div class="engine-dropdown" id="engine-drop"></div>
                            </div>
                            <input type="text" class="search-input" id="search-input" placeholder="Search..." autocomplete="off">
                        </div>
                        <div class="suggestions-box" id="suggestions-box"></div>
                    </div>`;
            } else if(widgetId === 'widget-grid') {
                div.innerHTML = `<div class="shortcut-grid" id="main-grid"></div>`;
            }
            div.addEventListener('dragstart', (e) => {
                if(!document.body.classList.contains('layout-editing')) { e.preventDefault(); return; }
                this.state.widgetDragSrc = div; e.dataTransfer.effectAllowed = 'move';
            });
            div.addEventListener('dragover', (e) => {
                if(!document.body.classList.contains('layout-editing')) return;
                e.preventDefault();
                if(this.state.widgetDragSrc && this.state.widgetDragSrc !== div) {
                    const mid = div.getBoundingClientRect().top + div.offsetHeight/2;
                    if(e.clientY > mid) root.insertBefore(this.state.widgetDragSrc, div.nextSibling);
                    else root.insertBefore(this.state.widgetDragSrc, div);
                }
            });
            div.addEventListener('dragend', () => {
                this.data.settings.layoutOrder = Array.from(root.children).map(el=>el.id);
                this.save();
            });
            root.appendChild(div);
        });
        this.bindSearchEvents(); this.updateClockDate(); 
        if(this.data.settings.showWeather) this.getWeather(); 
        this.renderShortcuts();
    }

    renderShortcuts() {
        const grid = document.getElementById('main-grid'); if(!grid) return;
        grid.innerHTML = '';
        const frag = document.createDocumentFragment();
        this.data.shortcuts.filter(i => i.loc === 'main' || i.loc === 'both').forEach(item => {
            const el = document.createElement('div');
            el.className = 'shortcut-item'; el.draggable = true; el.dataset.id = item.id;
            let iconHtml = '';
            if (item.icon && item.icon.startsWith('<svg')) {
                let svgContent = item.icon;
                if(item.iconColor) svgContent = svgContent.replace('<svg', `<svg style="fill:${item.iconColor}; stroke:${item.iconColor}"`);
                iconHtml = `<div class="icon-box">${svgContent}</div>`;
            } else {
                const letter = item.name ? item.name[0].toUpperCase() : '?';
                iconHtml = `<div class="icon-box"><div class="icon-letter">${letter}</div><img alt="" /></div>`;
            }
            el.innerHTML = `${iconHtml}<div class="item-title">${item.name}</div>`;
            const svgEl = el.querySelector('svg');
            if(svgEl) {
                const size = item.svgSize || 60; 
                svgEl.style.width = size + '%'; svgEl.style.height = size + '%';
            }
            if(!item.icon || !item.icon.startsWith('<svg')) {
                const img = el.querySelector('img'); const letter = el.querySelector('.icon-letter');
                if(item.icon) assetManager.loadImg(img, item.icon, letter);
                else {
                    const autoUrl = this.getIconUrl(item.url);
                    if(autoUrl) assetManager.loadImg(img, autoUrl, letter);
                    else if(letter) letter.style.display = 'flex';
                }
            }
            // Drag Start: Show Trash
            el.addEventListener('dragstart', (e) => { 
                e.stopPropagation(); 
                this.state.dragSrc = el; 
                this.state.dragType = 'item'; 
                el.classList.add('dragging'); 
                document.getElementById('trash-zone').classList.add('active');
            });
            // Drag End: Hide Trash
            el.addEventListener('dragend', (e) => { 
                e.stopPropagation(); 
                el.classList.remove('dragging'); 
                document.getElementById('trash-zone').classList.remove('active');
            });
            el.addEventListener('dragover', e => e.preventDefault());
            el.addEventListener('drop', e => {
                e.stopPropagation();
                if(this.state.dragType !== 'item') return;
                const target = e.target.closest('.shortcut-item');
                if(target && target !== this.state.dragSrc) this.reorder(this.state.dragSrc.dataset.id, target.dataset.id);
            });
            el.onclick = () => this.handleShortcutClick(item);
            el.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); this.openEditModal(item.id); };
            frag.appendChild(el);
        });
        grid.appendChild(frag);
        this.renderExtendedTabs(); this.renderExtendedList();
    }
    handleShortcutClick(item) {
        if(item.url === 'ext://history') this.openSidebar('history');
        else if(item.url === 'ext://bookmarks') this.openSidebar('bookmarks');
        else this.openLink(item.url);
    }
    renderExtendedTabs() {
        const tabs = document.getElementById('category-tabs'); if(!tabs) return; tabs.innerHTML = '';
        const allBtn = document.createElement('div');
        allBtn.className = `cat-btn ${this.state.catFilter === 'all' ? 'active' : ''}`;
        allBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg> <span>全部</span>`;
        allBtn.onclick = () => { this.state.catFilter = 'all'; this.renderExtendedTabs(); this.renderExtendedList(); };
        tabs.appendChild(allBtn);

        this.data.categories.forEach((cat, idx) => {
            const btn = document.createElement('div');
            btn.className = `cat-btn ${this.state.catFilter === cat.id ? 'active' : ''}`;
            btn.draggable = true;
            let iconHtml = cat.icon.startsWith('<svg') ? cat.icon : `<img src="${cat.icon || ''}" onerror="this.style.display='none'">`;
            btn.innerHTML = `${iconHtml} <span>${cat.name}</span>`;
            btn.onclick = () => { this.state.catFilter = cat.id; this.renderExtendedTabs(); this.renderExtendedList(); };
            btn.oncontextmenu = (e) => { e.preventDefault(); this.openCatEdit(cat.id); };
            btn.addEventListener('dragstart', (e) => { e.stopPropagation(); this.state.dragType = 'cat'; this.state.dragSrc = idx; });
            btn.addEventListener('dragover', (e) => { e.preventDefault(); btn.classList.add('drag-over'); });
            btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
            btn.addEventListener('drop', (e) => {
                e.stopPropagation(); e.preventDefault();
                btn.classList.remove('drag-over');
                if (this.state.dragType === 'cat') {
                    const fromIdx = this.state.dragSrc; const toIdx = idx;
                    if (fromIdx !== toIdx) {
                        const [moved] = this.data.categories.splice(fromIdx, 1);
                        this.data.categories.splice(toIdx, 0, moved);
                        this.save(); this.renderExtendedTabs();
                        if (this.state.catFilter !== 'all') this.renderExtendedList();
                    }
                } else if (this.state.dragType === 'item') {
                    const itemEl = this.state.dragSrc;
                    if(itemEl && itemEl.dataset.id) this.moveItemToCategory(itemEl.dataset.id, cat.id);
                }
            });
            tabs.appendChild(btn);
        });
    }
    moveItemToCategory(itemId, catId) {
        const item = this.data.shortcuts.find(i => i.id === itemId);
        if (item) {
            item.cat = catId;
            if (item.loc === 'main') item.loc = 'both'; 
            this.save(); this.renderShortcuts();
        }
    }
    renderExtendedList() {
        const container = document.getElementById('extended-list'); if(!container) return; container.innerHTML = '';
        if (this.state.catFilter === 'all') {
            this.data.categories.forEach(cat => {
                const items = this.data.shortcuts.filter(i => (i.loc === 'extended' || i.loc === 'both') && i.cat === cat.id);
                if (items.length > 0) {
                    const title = document.createElement('div'); title.className = 'drawer-section-title'; title.innerText = cat.name; container.appendChild(title);
                    const grid = document.createElement('div'); grid.className = 'ext-grid';
                    this.appendItemsToGrid(grid, items); container.appendChild(grid);
                }
            });
        } else {
            const grid = document.createElement('div'); grid.className = 'ext-grid';
            const items = this.data.shortcuts.filter(i => (i.loc === 'extended' || i.loc === 'both') && i.cat === this.state.catFilter);
            this.appendItemsToGrid(grid, items); container.appendChild(grid);
        }
    }
    appendItemsToGrid(gridEl, items) {
        const frag = document.createDocumentFragment();
        items.forEach(item => {
            const a = document.createElement('a'); a.className = 'mini-card'; a.draggable = true;
            a.dataset.id = item.id;
            a.onclick = () => this.handleShortcutClick(item);
            let iconHtml = `<img alt="" style="display:none">`;
            if(item.icon && item.icon.startsWith('<svg')) {
                let svg = item.icon; if(item.iconColor) svg = svg.replace('<svg', `<svg style="fill:${item.iconColor}"`); iconHtml = svg;
            }
            a.innerHTML = `${iconHtml} <span>${item.name}</span>`;
            if(!item.icon || !item.icon.startsWith('<svg')) {
                const img = a.querySelector('img'); const url = item.icon || this.getIconUrl(item.url);
                if(url) assetManager.loadImg(img, url);
            }
            a.oncontextmenu = e => { e.preventDefault(); this.openEditModal(item.id); };
            // Drag Start: Show Trash
            a.addEventListener('dragstart', (e) => { 
                e.stopPropagation(); 
                this.state.dragSrc = a; 
                this.state.dragType = 'item'; 
                a.classList.add('dragging'); 
                document.getElementById('trash-zone').classList.add('active');
            });
            // Drag End: Hide Trash
            a.addEventListener('dragend', (e) => { 
                e.stopPropagation(); 
                a.classList.remove('dragging'); 
                document.getElementById('trash-zone').classList.remove('active');
            });
            frag.appendChild(a);
        });
        gridEl.appendChild(frag);
    }
    handleTrashDrop(e) {
        e.preventDefault();
        const el = this.state.dragSrc;
        if(el && el.dataset.id && this.state.dragType === 'item') {
            if(confirm('确定删除此快捷方式吗？')) {
                const id = el.dataset.id;
                const idx = this.data.shortcuts.findIndex(s => s.id === id);
                if(idx > -1) {
                    this.data.shortcuts.splice(idx, 1);
                    this.save();
                    this.renderShortcuts();
                    this.renderExtendedList(); // Update list if deleted from there
                }
            }
        }
        document.getElementById('trash-zone').classList.remove('active');
        document.getElementById('trash-zone').classList.remove('hover');
    }
    openSidebar(mode) {
        document.getElementById('right-sidebar').classList.add('open');
        document.getElementById('sidebar-overlay').classList.add('active');
        this.state.sidebarOpen = true;
        this.renderSidebarNav(mode);
    }
    closeSidebar() {
        document.getElementById('right-sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
        document.getElementById('sidebar-ctx-menu').classList.remove('active');
        this.state.sidebarOpen = false;
    }
    renderSidebarNav(activeMode) {
        const navList = document.getElementById('sidebar-nav-list'); navList.innerHTML = '';
        const createNavItem = (text, iconSvg, mode) => {
            const div = document.createElement('div');
            div.className = `nav-item ${activeMode === mode ? 'active' : ''}`;
            div.innerHTML = `${iconSvg} ${text}`;
            div.onclick = () => { this.renderSidebarNav(mode); if(mode==='history') this.loadHistoryContent(); else if(mode==='bookmarks') this.loadBookmarksContent('0'); };
            return div;
        };
        const histIcon = `<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`;
        const bmIcon = `<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
        navList.appendChild(createNavItem('历史记录', histIcon, 'history'));
        navList.appendChild(createNavItem('收藏夹', bmIcon, 'bookmarks'));
        if(chrome && chrome.bookmarks) {
            chrome.bookmarks.getSubTree('0', (nodes) => {
                const root = nodes[0];
                const renderFolders = (node, depth) => {
                    node.children.forEach(child => {
                        if(!child.url) { 
                            const div = document.createElement('div');
                            div.className = 'nav-item'; div.style.paddingLeft = (20 + depth * 15) + 'px';
                            div.innerHTML = `<svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> ${child.title}`;
                            div.onclick = () => { document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); div.classList.add('active'); this.loadBookmarksContent(child.id); };
                            navList.appendChild(div);
                        }
                    });
                };
                root.children.forEach(c => renderFolders(c, 0));
            });
        }
        if(activeMode === 'history') this.loadHistoryContent();
        if(activeMode === 'bookmarks') this.loadBookmarksContent('0');
    }

    openSidebarCtx(e, data) {
        e.preventDefault(); e.stopPropagation();
        this.state.ctxData = data;
        const menu = document.getElementById('sidebar-ctx-menu');
        let x = e.clientX, y = e.clientY;
        if(x + 160 > window.innerWidth) x = window.innerWidth - 170;
        if(y + 120 > window.innerHeight) y = window.innerHeight - 130;
        menu.style.left = x + 'px'; menu.style.top = y + 'px';
        menu.classList.add('active');
    }
    handleCtxAdd(targetLoc) {
        const data = this.state.ctxData;
        if(!data || !data.url) return;
        const newItem = {
            id: 's' + Date.now(),
            name: data.title,
            url: data.url,
            loc: targetLoc, 
            cat: (this.state.catFilter === 'all' ? this.data.categories[0]?.id : this.state.catFilter), 
            svgSize: 60
        };
        this.data.shortcuts.push(newItem);
        this.save();
        if(targetLoc === 'main' || targetLoc === 'both') this.renderShortcuts();
        if(targetLoc === 'extended' || targetLoc === 'both') this.renderExtendedList();
        document.getElementById('sidebar-ctx-menu').classList.remove('active');
    }
    handleCtxDel() {
        const data = this.state.ctxData;
        if(!data) return;
        if(data.type === 'history') {
            if(chrome && chrome.history) chrome.history.deleteUrl({url: data.url}, () => this.loadHistoryContent());
        } else if(data.type === 'bookmark') {
            if(chrome && chrome.bookmarks) chrome.bookmarks.remove(data.id, () => this.loadBookmarksContent(data.parentId || '0'));
        }
        document.getElementById('sidebar-ctx-menu').classList.remove('active');
    }

    loadHistoryContent() {
        document.getElementById('sidebar-content-title').innerText = '最近访问';
        document.getElementById('sidebar-crumb').style.display = 'none';
        const list = document.getElementById('sidebar-content-list'); list.innerHTML = 'Loading...';
        if(chrome && chrome.history) {
            chrome.history.search({text: '', maxResults: 100}, (results) => {
                list.innerHTML = '';
                results.forEach(h => {
                    const row = document.createElement('div'); row.className = 'list-item-row'; 
                    row.onclick = () => this.openLink(h.url);
                    row.oncontextmenu = (e) => this.openSidebarCtx(e, { type: 'history', url: h.url, title: h.title });
                    const time = new Date(h.lastVisitTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                    row.innerHTML = `<div class="list-item-icon"><img alt="" /></div><div class="list-item-content"><div class="list-item-title">${h.title || h.url}</div><div class="list-item-meta">${new URL(h.url).hostname} • ${time}</div></div>`;
                    const icon = this.getIconUrl(h.url);
                    if(icon) assetManager.loadImg(row.querySelector('img'), icon);
                    list.appendChild(row);
                });
            });
        }
    }
    loadBookmarksContent(folderId) {
        document.getElementById('sidebar-content-title').innerText = '收藏夹';
        const list = document.getElementById('sidebar-content-list');
        const crumb = document.getElementById('sidebar-crumb'); crumb.style.display = 'flex'; list.innerHTML = 'Loading...';
        if(chrome && chrome.bookmarks) {
            chrome.bookmarks.getSubTree(folderId, (nodes) => {
                const node = nodes[0];
                this.updateBreadcrumb(node);
                list.innerHTML = '';
                if(node.children.length === 0) list.innerHTML = '<div style="padding:20px;color:var(--theme-subtext);text-align:center">空文件夹</div>';
                node.children.forEach(bm => {
                    const row = document.createElement('div'); row.className = 'list-item-row';
                    if(bm.url) {
                        row.innerHTML = `<div class="list-item-icon"><img alt=""></div><div class="list-item-content"><div class="list-item-title">${bm.title}</div><div class="list-item-meta">${bm.url}</div></div>`;
                        const icon = this.getIconUrl(bm.url);
                        if(icon) assetManager.loadImg(row.querySelector('img'), icon);
                        row.onclick = () => this.openLink(bm.url);
                        row.oncontextmenu = (e) => this.openSidebarCtx(e, { type: 'bookmark', id: bm.id, url: bm.url, title: bm.title, parentId: folderId });
                    } else {
                        row.innerHTML = `<div class="list-item-icon"><svg viewBox="0 0 24 24" style="fill:#ffd700"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></div><div class="list-item-content"><div class="list-item-title">${bm.title}</div><div class="list-item-meta">文件夹</div></div>`;
                        row.onclick = () => this.loadBookmarksContent(bm.id);
                        row.oncontextmenu = (e) => e.preventDefault(); 
                    }
                    list.appendChild(row);
                });
            });
        }
    }
    updateBreadcrumb(node) {
        const crumb = document.getElementById('sidebar-crumb'); crumb.innerHTML = '';
        if(node.parentId) {
             const backBtn = document.createElement('span'); backBtn.className = 'crumb-item'; 
             backBtn.innerText = '⬅ 返回'; backBtn.onclick = () => this.loadBookmarksContent(node.parentId);
             crumb.appendChild(backBtn);
             const sep = document.createElement('span'); sep.innerText = ' | '; sep.style.opacity='0.5'; crumb.appendChild(sep);
        }
        const curr = document.createElement('span'); curr.innerText = node.title || '根目录'; crumb.appendChild(curr);
    }
    openLink(url) { window.open(url, this.data.settings.linkTarget || '_self'); }

    openSettingsTab(tabId) {
        document.getElementById('modal-settings').classList.add('active');
        this.renderEngineList(); assetManager.updateStat();
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        const menuId = {'tab-general': 'menu-gen', 'tab-layout': 'menu-lay', 'tab-style': 'menu-sty', 'tab-engines': 'menu-eng', 'tab-data': 'menu-dat', 'tab-about': 'menu-abo'}[tabId];
        if(menuId) document.getElementById(menuId).classList.add('active');
        const tab = document.getElementById(tabId);
        if(tab) { tab.classList.add('active'); document.getElementById('settings-title').innerText = tab.dataset.title; }
    }
    applyTheme() {
        const s = this.data.settings; const r = document.documentElement;
        let tBg, tText, tSub, tBord, tInp, tShadow, tBlur, tHover;
        if (s.searchStyle === 'light') {
            tBg = 'rgba(255, 255, 255, 0.9)'; tText = '#000000'; tSub = '#666666'; tBord = 'rgba(0, 0, 0, 0.1)'; tInp = 'rgba(0, 0, 0, 0.05)'; tHover = 'rgba(0, 0, 0, 0.08)'; tShadow = '0 10px 40px rgba(0,0,0,0.1)'; tBlur = 'blur(0px)';
        } else if (s.searchStyle === 'glass') {
            tBg = 'rgba(30, 30, 30, 0.3)'; tText = '#ffffff'; tSub = 'rgba(255,255,255,0.7)'; tBord = 'rgba(255, 255, 255, 0.1)'; tInp = 'rgba(255, 255, 255, 0.05)'; tHover = 'rgba(255, 255, 255, 0.15)'; tShadow = '0 10px 40px rgba(0,0,0,0.3)'; tBlur = 'blur(20px)';
        } else { 
            tBg = 'rgba(22, 22, 22, 0.95)'; tText = '#ffffff'; tSub = '#aaaaaa'; tBord = 'rgba(255, 255, 255, 0.08)'; tInp = 'rgba(255, 255, 255, 0.04)'; tHover = 'rgba(255, 255, 255, 0.08)'; tShadow = '0 10px 50px rgba(0,0,0,0.5)'; tBlur = 'blur(0px)';
        }
        r.style.setProperty('--theme-bg', tBg); r.style.setProperty('--theme-text', tText); r.style.setProperty('--theme-subtext', tSub); r.style.setProperty('--theme-border', tBord); r.style.setProperty('--theme-input-bg', tInp); r.style.setProperty('--theme-hover', tHover); r.style.setProperty('--theme-shadow', tShadow); r.style.setProperty('--theme-backdrop', tBlur);

        r.style.setProperty('--grid-cols', s.gridCols); r.style.setProperty('--icon-opacity', s.iconOpacity / 100); r.style.setProperty('--bg-blur', s.bgBlur + 'px'); r.style.setProperty('--widget-gap', s.widgetGap + 'vh'); r.style.setProperty('--grid-padding', s.gridPadding + 'px'); r.style.setProperty('--page-pad-h', s.pagePadH + 'vw'); r.style.setProperty('--time-color', s.timeColor); r.style.setProperty('--date-color', s.dateColor); r.style.setProperty('--weather-color', s.weatherColor); r.style.setProperty('--search-radius', s.searchRadius + 'px'); r.style.setProperty('--icon-radius', s.iconRadius + 'px');

        ['bg-type','bg-fit','nav-mode','header-align','search-style','link-target','icon-source-pattern'].forEach(k => {
             const el = document.getElementById(k); 
             let key = k.replace(/-(\w)/g, (a,b)=>b.toUpperCase());
             if(k==='icon-source-pattern') key='iconSource';
             if(el) el.value = s[key] || '';
        });
        const sugToggle = document.getElementById('search-sug'); if(sugToggle) sugToggle.checked = s.searchSuggestions;
        const weatherToggle = document.getElementById('weather-show-toggle'); if(weatherToggle) weatherToggle.checked = s.showWeather !== false;

        ['col-time','col-date','col-weather'].forEach(k => { const el = document.getElementById(k); if(el) el.value = s[k.replace('col-','').replace(/(\w)/,(a)=>a.toUpperCase())+'Color']; });
        const bg = document.getElementById('bg-layer'); const vid = document.getElementById('video-bg');
        if(bg && vid) {
            vid.style.display = 'none'; bg.style.backgroundImage = 'none'; bg.style.background = '#050505'; bg.style.backgroundSize = s.bgFit === 'repeat' ? 'auto' : s.bgFit;
            if(s.bgType === 'color') bg.style.background = s.bgValue || '#111';
            else if(s.bgType === 'image' && s.bgValue) bg.style.backgroundImage = `url('${s.bgValue}')`;
            else if(s.bgType === 'bing') bg.style.backgroundImage = `url('https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN')`;
            else if(s.bgType === 'video' && s.bgValue) { vid.src = s.bgValue; vid.style.display = 'block'; }
        }
    }
    updateSetting(k, v) { this.data.settings[k] = v; this.save(); if(k==='headerAlign' || k==='showWeather') this.renderLayout(); else this.applyTheme(); }
    updateClockDate() { const d = new Date(); const t = document.getElementById('clock'); const dt = document.getElementById('date'); if(t) t.innerText = d.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}); if(dt) dt.innerText = d.toLocaleDateString('zh-CN', {month:'long',day:'numeric',weekday:'long'}); }
    
    setupEvents() {
        document.getElementById('bottom-trigger').onclick = () => document.getElementById('drawer-extended').classList.add('open');
        document.getElementById('close-drawer-ext').onclick = () => document.getElementById('drawer-extended').classList.remove('open');
        document.getElementById('btn-add').onclick = () => this.openEditModal(null);
        document.getElementById('btn-settings').onclick = () => this.openSettingsTab('tab-general');
        const closeModals = (e) => {
            if(e.target.classList.contains('modal')) e.target.classList.remove('active');
            if(e.target.id === 'sidebar-overlay') this.closeSidebar();
            if(!e.target.closest('.ctx-menu') && !e.target.closest('.list-item-row')) document.getElementById('sidebar-ctx-menu').classList.remove('active');
        };
        window.onclick = closeModals;
        document.getElementById('close-settings').onclick = () => document.getElementById('modal-settings').classList.remove('active');
        document.getElementById('close-sidebar').onclick = () => this.closeSidebar();
        document.querySelectorAll('.sidebar-item').forEach(item => { item.onclick = () => { const tabId = item.dataset.tab; this.openSettingsTab(tabId); }; });

        const bind = (id, prop) => { const el = document.getElementById(id); if(el) el.onchange = (e) => this.updateSetting(prop, e.target.value); };
        const bindInput = (id, prop) => { const el = document.getElementById(id); if(el) el.oninput = (e) => this.updateSetting(prop, e.target.value); };
        
        bind('link-target', 'linkTarget'); bind('nav-mode', 'navMode'); bind('header-align', 'headerAlign');
        bind('bg-type', 'bgType'); bind('bg-fit', 'bgFit'); bindInput('bg-blur', 'bgBlur');
        bindInput('page-pad-h', 'pagePadH'); bindInput('widget-gap', 'widgetGap'); bindInput('grid-padding', 'gridPadding'); bindInput('grid-cols', 'gridCols');
        bind('search-style', 'searchStyle'); bindInput('search-radius', 'searchRadius'); bindInput('icon-radius', 'iconRadius'); bindInput('icon-opacity', 'iconOpacity');
        bind('icon-source-pattern', 'iconSource');

        const sugCheck = document.getElementById('search-sug'); if(sugCheck) sugCheck.onchange = (e) => this.updateSetting('searchSuggestions', e.target.checked);
        const wthCheck = document.getElementById('weather-show-toggle'); if(wthCheck) wthCheck.onchange = (e) => this.updateSetting('showWeather', e.target.checked);

        const bindColor = (txtId, pickId, prop) => {
            const txt = document.getElementById(txtId); const pick = document.getElementById(pickId);
            if(txt) txt.onchange = (e) => this.updateSetting(prop, e.target.value);
            if(pick) pick.onchange = (e) => { if(txt) txt.value = e.target.value; this.updateSetting(prop, e.target.value); };
        };
        bindColor('col-time', 'picker-time', 'timeColor'); bindColor('col-date', 'picker-date', 'dateColor'); bindColor('col-weather', 'picker-weather', 'weatherColor');

        const layoutTog = document.getElementById('layout-edit-toggle'); if(layoutTog) layoutTog.onchange = (e) => this.toggleLayoutEdit(e.target.checked);
        const cityBtn = document.getElementById('btn-search-city'); if(cityBtn) cityBtn.onclick = () => this.searchCity();
        const catsBtn = document.getElementById('btn-manage-cats'); if(catsBtn) catsBtn.onclick = () => { document.getElementById('modal-cats').classList.add('active'); this.renderCatList(); };
        const bgVal = document.getElementById('bg-value'); if(bgVal) bgVal.onchange = (e) => this.updateSetting('bgValue', e.target.value);
        
        const handleUpload = (fileId, textId, isBg) => {
            const file = document.getElementById(fileId).files[0]; if(!file) return;
            const r = new FileReader();
            r.onload = (e) => {
                document.getElementById(textId).value = e.target.result;
                if(isBg) { this.data.settings.bgValue = e.target.result; this.save(); this.applyTheme(); }
            };
            r.readAsDataURL(file);
        };
        const upBg = document.getElementById('btn-upload-bg'); if(upBg) upBg.onclick = () => document.getElementById('bg-file').click();
        const bgF = document.getElementById('bg-file'); if(bgF) bgF.onchange = () => handleUpload('bg-file', 'bg-value', true);
        const upIc = document.getElementById('btn-upload-icon'); if(upIc) upIc.onclick = () => document.getElementById('icon-file').click();
        const icF = document.getElementById('icon-file'); if(icF) icF.onchange = () => handleUpload('icon-file', 'item-icon', false);

        document.getElementById('btn-close-shortcut').onclick = () => document.getElementById('modal-shortcut').classList.remove('active');
        document.getElementById('btn-save-shortcut').onclick = () => this.saveShortcut();
        document.getElementById('picker-svg-color').onchange = (e) => document.getElementById('item-svg-color').value = e.target.value;
        document.getElementById('btn-add-engine').onclick = () => this.openEngineEdit(null);
        document.getElementById('btn-close-engine').onclick = () => document.getElementById('modal-engine').classList.remove('active');
        document.getElementById('btn-save-engine').onclick = () => this.saveEngine();
        document.getElementById('btn-clear-cache').onclick = () => assetManager.clear();
        document.getElementById('btn-reset').onclick = () => { if(confirm('重置?')) { localStorage.removeItem('nuetab_ult_data'); location.reload(); }};
        document.getElementById('btn-export').onclick = () => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(this.data)],{type:'application/json'})); a.download='backup.json'; a.click(); };

        /* -----------------------------------------------------
           FIXED SEARCH SUGGESTIONS: Extract only the 's' array
           ----------------------------------------------------- */
        const inp = document.getElementById('search-input');
        if(inp) {
            let timer;
            inp.addEventListener('input', () => {
                if(!this.data.settings.searchSuggestions) return; 
                clearTimeout(timer);
                timer = setTimeout(() => {
                    const val = inp.value;
                    if(!val) return document.getElementById('suggestions-box').classList.remove('active');
                    
                    fetch(`https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(val)}&cb=callback`, {
                        headers: {
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'Content-Type': 'application/json; charset=utf-8'
                        }
                    })
                    .then(r => r.text())
                    .then(text => {
                        try {
                            // 处理JSONP响应
                            const jsonMatch = text.match(/callback\((\{.*\})\)/);
                            if(jsonMatch) {
                                const data = JSON.parse(jsonMatch[1]);
                                if(data.g && Array.isArray(data.g)) {
                                    const suggestions = data.g.map(item => item.q);
                                    this.sugg({ s: suggestions });
                                }
                            }
                        } catch(e) {
                            console.error('解析失败:', e);
                        }
                    })
                    .catch(err => {
                        console.error('请求失败:', err);
                    });
                }, 200);
            });
            inp.addEventListener('keydown', e => {
                if(e.key === 'Enter') {
                    const eng = this.data.engines.find(x => x.id === this.data.settings.currEngine);
                    window.open(eng.url.replace('%s', encodeURIComponent(inp.value)), this.data.settings.linkTarget || '_self');
                }
            });
        }

        window.addEventListener('wheel', e => {
            if(this.data.settings.navMode !== 'scroll') return;
            if(document.querySelector('.modal.active') || this.state.sidebarOpen) return;
            const ext = document.getElementById('drawer-extended');
            if(!ext.classList.contains('open') && e.deltaY > 50) ext.classList.add('open');
            else if(ext.classList.contains('open') && e.deltaY < -50 && document.querySelector('.drawer-body').scrollTop === 0) ext.classList.remove('open');
        });
        
        document.getElementById('ctx-add-home').onclick = () => this.handleCtxAdd('main');
        document.getElementById('ctx-add-lib').onclick = () => this.handleCtxAdd('extended');
        document.getElementById('ctx-delete').onclick = () => this.handleCtxDel();

        const trash = document.getElementById('trash-zone');
        trash.addEventListener('dragover', e => { e.preventDefault(); trash.classList.add('hover'); });
        trash.addEventListener('dragleave', () => trash.classList.remove('hover')); // Fixed semicolon issue
        trash.addEventListener('drop', e => this.handleTrashDrop(e));

        this.startClock();
    }
    
    bindSearchEvents() {
        const btn = document.getElementById('engine-select-btn');
        if(btn) {
            btn.onclick = (e) => { e.stopPropagation(); document.getElementById('engine-drop').classList.toggle('show'); };
            btn.oncontextmenu = (e) => { e.preventDefault(); this.openEngineEdit(this.data.settings.currEngine); };
        }
        document.addEventListener('click', e => {
            if(!e.target.closest('.engine-select')) document.getElementById('engine-drop')?.classList.remove('show');
            if(!e.target.closest('.search-container')) document.getElementById('suggestions-box')?.classList.remove('active');
        });
        this.updateEngineIcon(); this.renderEngineDrop();
    }
    updateEngineIcon() {
        const eng = this.data.engines.find(e => e.id === this.data.settings.currEngine) || this.data.engines[0];
        const icon = document.getElementById('curr-engine-icon');
        if(icon) { icon.style.display='block'; let iconUrl = eng.icon; if(!iconUrl) iconUrl = this.getIconUrl(eng.url.split('?')[0]); if(iconUrl) assetManager.loadImg(icon, iconUrl); }
    }
    renderEngineDrop() {
        const drop = document.getElementById('engine-drop'); if(!drop) return; drop.innerHTML = '';
        this.data.engines.forEach(eng => {
            const div = document.createElement('div'); div.className = 'engine-item';
            div.innerHTML = `<img alt="" style="display:none"> ${eng.name}`;
            const img = div.querySelector('img'); let iconUrl = eng.icon; if(!iconUrl) iconUrl = this.getIconUrl(eng.url.split('?')[0]); if(iconUrl) assetManager.loadImg(img, iconUrl);
            div.onclick = (e) => { e.stopPropagation(); this.data.settings.currEngine = eng.id; this.save(); this.updateEngineIcon(); drop.classList.remove('show'); };
            div.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); this.openEngineEdit(eng.id); };
            drop.appendChild(div);
        });
    }
    sugg(d) {
        const b = document.getElementById('suggestions-box'); if(!b) return; b.innerHTML = '';
        if(d.s && d.s.length) {
            const frag = document.createDocumentFragment();
            d.s.slice(0,6).forEach(t => {
                const div = document.createElement('div'); div.className = 'suggestion-item'; div.innerText = t;
                div.onclick = () => { document.getElementById('search-input').value = t; const eng = this.data.engines.find(x => x.id === this.data.settings.currEngine); window.open(eng.url.replace('%s', encodeURIComponent(t)), this.data.settings.linkTarget || '_self'); };
                frag.appendChild(div);
            });
            b.appendChild(frag); b.classList.add('active');
        } else b.classList.remove('active');
    }
    startClock() { this.updateClockDate(); setInterval(() => this.updateClockDate(), 1000); }
    toggleLayoutEdit(enabled) { document.body.classList.toggle('layout-editing', enabled); document.querySelectorAll('.widget-block').forEach(el => el.draggable = enabled); }
    searchCity() {
        const q = document.getElementById('city-search').value; if(!q) return;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=zh&format=json`)
            .then(r=>r.json()).then(d => {
                if(d.results) { const c = d.results[0]; this.data.settings.weather = { city: c.name, lat: c.latitude, lon: c.longitude }; this.save(); this.getWeather(); } else alert('未找到');
            });
    }
    getWeather() {
        const { lat, lon, city } = this.data.settings.weather;
        document.getElementById('curr-city-lbl').innerText = city;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
            .then(r => r.json()).then(d => {
                const el = document.getElementById('weather');
                if(el) {
                    const t = Math.round(d.current_weather.temperature); const c = d.current_weather.weathercode;
                    let i = '☀️'; if(c>3) i='☁️'; if(c>45) i='🌧️'; if(c>71) i='❄️';
                    el.innerHTML = `${i} ${t}°C <span style="opacity:0.6;margin-left:5px">${city}</span>`;
                }
            });
    }

    openEditModal(id) {
        const item = this.data.shortcuts.find(i=>i.id===id);
        const cats = document.getElementById('item-cat'); cats.innerHTML = ''; 
        this.data.categories.forEach(c => cats.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        document.getElementById('edit-id').value = item ? item.id : '';
        document.getElementById('item-name').value = item ? item.name : '';
        document.getElementById('item-url').value = item ? item.url : '';
        document.getElementById('item-icon').value = item ? item.icon : '';
        document.getElementById('item-svg-color').value = item ? (item.iconColor || '') : '';
        document.getElementById('item-svg-size').value = item ? (item.svgSize || 60) : 60;
        
        const loc = item ? item.loc : 'main';
        document.getElementById('chk-loc-main').checked = (loc === 'main' || loc === 'both');
        document.getElementById('chk-loc-ext').checked = (loc === 'extended' || loc === 'both');

        if(item) document.getElementById('item-cat').value = item.cat;
        document.getElementById('modal-shortcut').classList.add('active');
    }
    saveShortcut() {
        const id = document.getElementById('edit-id').value;
        const mainChk = document.getElementById('chk-loc-main').checked;
        const extChk = document.getElementById('chk-loc-ext').checked;
        let locVal = 'main';
        if(mainChk && extChk) locVal = 'both';
        else if(extChk) locVal = 'extended';
        else locVal = 'main'; 

        const item = {
            id: id || 's'+Date.now(),
            name: document.getElementById('item-name').value,
            url: document.getElementById('item-url').value,
            icon: document.getElementById('item-icon').value,
            iconColor: document.getElementById('item-svg-color').value,
            svgSize: document.getElementById('item-svg-size').value,
            cat: document.getElementById('item-cat').value,
            loc: locVal
        };
        if(!item.url) return;
        if(!item.url.startsWith('http') && !item.url.startsWith('ext://')) item.url = 'https://'+item.url;
        if(id) { const i = this.data.shortcuts.findIndex(x=>x.id===id); if(i > -1) this.data.shortcuts[i] = item; } else { this.data.shortcuts.push(item); }
        this.save(); this.renderShortcuts(); document.getElementById('modal-shortcut').classList.remove('active');
    }
    reorder(sid, tid) {
        const arr = this.data.shortcuts; const s = arr.findIndex(x=>x.id===sid); const t = arr.findIndex(x=>x.id===tid);
        if(s > -1 && t > -1) { const [mv] = arr.splice(s, 1); arr.splice(t, 0, mv); this.save(); this.renderShortcuts(); }
    }
    renderCatList() {
        const list = document.getElementById('cat-list-editor'); list.innerHTML = '';
        this.data.categories.forEach((c, idx) => {
            const d = document.createElement('div'); d.className = 'list-row';
            let iconDisplay = c.icon.startsWith('<svg') ? c.icon : `<img src="${c.icon}">`;
            d.innerHTML = `<div class="list-info">${iconDisplay} <span>${c.name}</span></div><div><button class="btn btn-secondary">编辑</button> <button class="btn btn-danger">×</button></div>`;
            d.querySelector('.btn-secondary').onclick = () => this.openCatEdit(c.id);
            d.querySelector('.btn-danger').onclick = () => this.delCat(idx);
            list.appendChild(d);
        });
        document.getElementById('btn-close-cats').onclick = () => document.getElementById('modal-cats').classList.remove('active');
        document.getElementById('btn-add-cat').onclick = () => this.openCatEdit(null);
    }
    openCatEdit(id) {
        document.getElementById('modal-cats').classList.remove('active'); document.getElementById('modal-cat-edit').classList.add('active');
        const cat = id ? this.data.categories.find(c=>c.id===id) : null;
        document.getElementById('cat-edit-id').value = cat ? cat.id : '';
        document.getElementById('cat-edit-name').value = cat ? cat.name : '';
        document.getElementById('cat-edit-icon').value = cat ? cat.icon : '';
        document.getElementById('btn-save-cat').onclick = () => this.saveCat();
    }
    saveCat() {
        const id = document.getElementById('cat-edit-id').value; const name = document.getElementById('cat-edit-name').value;
        const icon = document.getElementById('cat-edit-icon').value || '<svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg>';
        if(id) { const idx = this.data.categories.findIndex(c=>c.id===id); if(idx > -1) this.data.categories[idx] = { id, name, icon }; } else { this.data.categories.push({ id: 'c'+Date.now(), name, icon }); }
        this.save(); document.getElementById('modal-cat-edit').classList.remove('active'); this.renderCatList(); document.getElementById('modal-cats').classList.add('active'); this.renderExtendedTabs();
    }
    delCat(i) { if(confirm('删除此分类?')) { this.data.categories.splice(i,1); this.save(); this.renderCatList(); this.renderExtendedTabs(); } }
    openEngineEdit(id) {
        document.getElementById('modal-engine').classList.add('active');
        const e = id ? this.data.engines.find(x => x.id === id) : null;
        document.getElementById('eng-id').value = e ? e.id : '';
        document.getElementById('eng-name').value = e ? e.name : '';
        document.getElementById('eng-url').value = e ? e.url : '';
        document.getElementById('eng-icon').value = e ? e.icon : '';
    }
    saveEngine() {
        const id = document.getElementById('eng-id').value;
        const obj = { id: id || 'eng'+Date.now(), name: document.getElementById('eng-name').value, url: document.getElementById('eng-url').value, icon: document.getElementById('eng-icon').value };
        if(id) { const i = this.data.engines.findIndex(x=>x.id===id); this.data.engines[i] = obj; } else this.data.engines.push(obj);
        this.save(); this.bindSearchEvents(); document.getElementById('modal-engine').classList.remove('active'); this.renderEngineList();
    }
    renderEngineList() {
        const list = document.getElementById('engine-list-editor'); list.innerHTML = '';
        this.data.engines.forEach((e, idx) => {
            const div = document.createElement('div'); div.className = 'list-row';
            div.innerHTML = `<div class="list-info"><img alt="" style="display:none"><span>${e.name}</span></div><div><button class="btn btn-secondary">编辑</button> <button class="btn btn-danger">×</button></div>`;
            const img = div.querySelector('img'); let iconUrl = e.icon; if(!iconUrl) iconUrl = this.getIconUrl(e.url.split('?')[0]); if(iconUrl) assetManager.loadImg(img, iconUrl);
            div.querySelector('.btn-secondary').onclick = () => this.openEngineEdit(e.id);
            div.querySelector('.btn-danger').onclick = () => this.delEngine(idx);
            list.appendChild(div);
        });
    }
    delEngine(idx) { this.data.engines.splice(idx, 1); this.save(); this.renderEngineList(); this.bindSearchEvents(); }
}

window.app = new NueTab();
