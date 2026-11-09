// nammaAPI — Studio Application Logic & Multi-Model Coordinator

let appConfig = null;

// Application State
let activeProviderId = localStorage.getItem('namma_active_provider') || 'claude';
let activeModelId = localStorage.getItem('namma_active_model') || 'claude-3-5-sonnet-20241022';
let activeSubProvider = null;
let activeBaseUrl = localStorage.getItem('namma_active_base_url') || null;

// Saved Keys & Chat Memory
let savedKeys = JSON.parse(localStorage.getItem('namma_api_keys') || '{}');
let chatMemory = JSON.parse(localStorage.getItem('namma_chat_memory') || '[]');
let pendingMessage = null;

// SVGs for Providers
const PROVIDER_SVGS = {
    claude: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"></path><path d="M9 21h6"></path></svg>`,
    gemini: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    openai: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`,
    other: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
};

const PROVIDER_LABELS = {
    claude: "Anthropic Claude",
    gemini: "Google Gemini",
    openai: "OpenAI",
    other: "DeepSeek / Custom"
};

// DOM Elements
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// Main View & Sidebar
const sidebar = $('sidebar');
const sidebarCloseBtn = $('sidebar-close-btn');
const sidebarOpenBtn = $('sidebar-open-btn');
const newChatBtn = $('new-chat-btn');
const chatFeed = $('chat-feed');
const heroEmptyState = $('hero-empty-state');
const messagesContainer = $('messages-container');
const chatForm = $('chat-form');
const userInput = $('user-input');
const submitBtn = $('submit-btn');
const charCounter = $('char-counter');

// Header & Navigation
const headerModelDropdownBtn = $('header-model-dropdown-btn');
const headerModelLabel = $('header-model-label');
const headerProvIcon = $('header-prov-icon');
const modelMenuPopover = $('model-menu-popover');
const modelSearchInput = $('model-search-input');
const popoverModelsList = $('popover-models-list');
const headerMemoryText = $('header-memory-text');
const navShareBtn = $('nav-share-btn');
const navKeyBtn = $('nav-key-btn');
const navKeyText = $('nav-key-text');

// Sidebar Cards
const sidebarModelName = $('sidebar-model-name');
const sidebarModelMeta = $('sidebar-model-meta');
const sidebarProvIcon = $('sidebar-prov-icon');
const sidebarSwitchModelBtn = $('sidebar-switch-model-btn');
const sidebarMemoryCount = $('sidebar-memory-count');
const sidebarMemoryDot = $('sidebar-memory-dot');
const sidebarClearMemoryBtn = $('sidebar-clear-memory-btn');
const dockModelToggleBtn = $('dock-model-toggle-btn');
const dockModelLabel = $('dock-model-label');
const dockProvIconSm = $('dock-prov-icon-sm');

// Modals
const configModal = $('config-modal');
const modalCloseBtn = $('modal-close-btn');
const modalCancelBtn = $('modal-cancel-btn');
const modalSaveBtn = $('modal-save-btn');
const openConfigBtn = $('open-config-btn');
const shareModal = $('share-modal');
const openShareBtn = $('open-share-btn');
const shareModalCloseBtn = $('share-modal-close-btn');
const shareModalDoneBtn = $('share-modal-done-btn');

// Modal Elements
const modalApiKeyInput = $('modal-api-key-input');
const modalKeyToggleBtn = $('modal-key-toggle-btn');
const modalKeyProviderName = $('modal-key-provider-name');
const modalKeySavedBadge = $('modal-key-saved-badge');
const modalModelsGrid = $('modal-models-grid');
const modalCustomModelBox = $('modal-custom-model-box');
const modalCustomModelInput = $('modal-custom-model-input');
const modalSubPlatformBox = $('modal-sub-platform-box');
const modalSubPills = $('modal-sub-pills');
const modalCustomUrlGroup = $('modal-custom-url-group');
const modalCustomUrlInput = $('modal-custom-url-input');
const providerPortalLink = $('provider-portal-link');

// Modal selection state
let modalSelectedProvider = 'claude';
let modalSelectedModel = 'claude-3-5-sonnet-20241022';
let modalSelectedBaseUrl = null;

// ── INITIALIZATION ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        appConfig = data.providers;
    } catch (err) {
        console.error('Failed to load server config:', err);
    }

    initSidebarState();
    buildPopoverModelsList();
    syncProviderState(activeProviderId, activeModelId);
    renderChatMemory();
    updateMemoryBadges();
    updateKeyBadges();
    fetchShareInfo();
    bindEvents();
});

// ── SIDEBAR & SHORTCUTS ─────────────────────────────────

function initSidebarState() {
    const isCollapsed = localStorage.getItem('namma_sidebar_collapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('namma_sidebar_collapsed', sidebar.classList.contains('collapsed'));
}

// ── SHARE INFO ──────────────────────────────────────────

async function fetchShareInfo() {
    try {
        const res = await fetch('/api/share-info');
        const info = await res.json();
        if (info.public_url && $('public-share-input')) $('public-share-input').value = info.public_url;
        if (info.lan_url && $('lan-share-input')) $('lan-share-input').value = info.lan_url;
        if (info.localhost_url && $('local-share-input')) $('local-share-input').value = info.localhost_url;
    } catch (e) {
        console.warn('Share info unavailable:', e);
    }
}

// ── PROVIDER & MODEL SYNCHRONIZATION ────────────────────

function syncProviderState(providerId, modelId) {
    activeProviderId = providerId;
    localStorage.setItem('namma_active_provider', providerId);

    if (modelId) {
        activeModelId = modelId;
        localStorage.setItem('namma_active_model', modelId);
    }

    const provSvg = PROVIDER_SVGS[providerId] || PROVIDER_SVGS.other;
    const provName = PROVIDER_LABELS[providerId] || "AI Model";

    // Update Header Pill
    headerModelLabel.textContent = getModelDisplayName(activeModelId);
    headerProvIcon.innerHTML = provSvg;

    // Update Sidebar Active Card
    sidebarModelName.textContent = getModelDisplayName(activeModelId);
    sidebarModelMeta.textContent = `${provName} · Active`;
    sidebarProvIcon.innerHTML = provSvg;

    // Update Dock Pill
    dockModelLabel.textContent = getModelDisplayName(activeModelId);
    dockProvIconSm.innerHTML = provSvg;

    updateKeyBadges();
    buildPopoverModelsList();
}

function getModelDisplayName(modelId) {
    if (!appConfig) return modelId;
    for (const key of Object.keys(appConfig)) {
        const p = appConfig[key];
        if (p.models) {
            const found = p.models.find(m => m.id === modelId);
            if (found) return found.name;
        }
        if (p.sub_providers) {
            for (const subKey of Object.keys(p.sub_providers)) {
                const sp = p.sub_providers[subKey];
                const found = (sp.models || []).find(m => m.id === modelId);
                if (found) return found.name;
            }
        }
    }
    return modelId;
}

// ── CUSTOM MODEL SELECTION POPOVER ──────────────────────

function buildPopoverModelsList(filterQuery = '') {
    if (!appConfig || !popoverModelsList) return;
    popoverModelsList.innerHTML = '';

    const query = filterQuery.toLowerCase().trim();
    const keyMap = { "claude": "3", "gemini": "2", "openai": "1", "other": "4" };

    Object.keys(keyMap).forEach(provId => {
        const pData = appConfig[keyMap[provId]];
        if (!pData) return;

        let models = [];
        if (provId === 'other') {
            for (const sKey of Object.keys(pData.sub_providers || {})) {
                const sub = pData.sub_providers[sKey];
                (sub.models || []).forEach(m => models.push({ ...m, subName: sub.name, subUrl: sub.base_url }));
            }
        } else {
            models = pData.models || [];
        }

        const filtered = models.filter(m => 
            !query || m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query) || (m.desc && m.desc.toLowerCase().includes(query))
        );

        if (filtered.length === 0) return;

        // Group Header
        const header = document.createElement('div');
        header.className = 'popover-group-header';
        header.textContent = pData.name;
        popoverModelsList.appendChild(header);

        // Model Rows
        filtered.forEach(m => {
            const item = document.createElement('div');
            const isActive = m.id === activeModelId;
            item.className = `popover-model-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div class="popover-item-left">
                    <span class="popover-item-name">
                        <span>${escapeHtml(m.name)}</span>
                        ${m.desc && m.desc.includes('Flagship') ? '<span class="popover-badge">Flagship</span>' : ''}
                        ${m.desc && m.desc.includes('Fast') ? '<span class="popover-badge">Fast</span>' : ''}
                        ${m.desc && m.desc.includes('Reasoning') ? '<span class="popover-badge">Reasoning</span>' : ''}
                    </span>
                    <span class="popover-item-desc">${escapeHtml(m.desc || m.id)}</span>
                </div>
                <span class="popover-item-check">✓</span>
            `;

            item.addEventListener('click', () => {
                syncProviderState(provId, m.id);
                if (m.subUrl) {
                    activeBaseUrl = m.subUrl;
                    localStorage.setItem('namma_active_base_url', activeBaseUrl);
                }
                closeModelPopover();
            });

            popoverModelsList.appendChild(item);
        });
    });
}

function openModelPopover() {
    modelMenuPopover.classList.remove('hidden');
    modelSearchInput.value = '';
    modelSearchInput.focus();
    buildPopoverModelsList();
}

function closeModelPopover() {
    modelMenuPopover.classList.add('hidden');
}

// ── KEY STATUS & MEMORY COUNTERS ────────────────────────

function updateKeyBadges() {
    const key = savedKeys[activeProviderId];
    const isConfigured = !!(key && key.trim());

    if (navKeyText) {
        navKeyText.textContent = isConfigured ? "Keys ✓" : "Setup Keys";
    }

    // Sidebar indicators
    const provs = ['claude', 'gemini', 'openai', 'other'];
    provs.forEach(p => {
        const pKey = savedKeys[p];
        const dot = $(`dot-${p}`);
        const link = $(`link-key-${p}`);
        const hasKey = !!(pKey && pKey.trim());
        if (dot) dot.classList.toggle('ready', hasKey);
        if (link) link.textContent = hasKey ? "Ready ✓" : "Setup";
    });
}

function updateMemoryBadges() {
    const count = chatMemory.length;
    const text = `Shared Memory: ${count} msg${count === 1 ? '' : 's'}`;
    if (headerMemoryText) headerMemoryText.textContent = text;
    if (sidebarMemoryCount) sidebarMemoryCount.textContent = `${count} turn${count === 1 ? '' : 's'}`;
    if (sidebarMemoryDot) sidebarMemoryDot.classList.toggle('idle', count === 0);
}

// ── CHAT & MESSAGES ─────────────────────────────────────

function renderChatMemory() {
    if (!chatMemory || chatMemory.length === 0) {
        heroEmptyState.classList.remove('hidden');
        messagesContainer.innerHTML = '';
        return;
    }

    heroEmptyState.classList.add('hidden');
    messagesContainer.innerHTML = '';
    chatMemory.forEach(msg => {
        appendMessageTurn(msg.role, msg.content, msg.model, msg.provider);
    });
}

async function sendMessage(text) {
    const key = savedKeys[activeProviderId];

    if (!key || !key.trim()) {
        pendingMessage = text;
        openConfigModal(activeProviderId);
        return;
    }

    heroEmptyState.classList.add('hidden');
    userInput.value = '';
    userInput.style.height = 'auto';
    charCounter.textContent = '0 chars';
    submitBtn.disabled = true;

    // 1. Append User Message
    const userMsg = {
        role: 'user',
        content: text,
        model: null,
        provider: null,
        timestamp: Date.now()
    };
    appendMessageTurn('user', text);
    chatMemory.push(userMsg);
    localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
    updateMemoryBadges();

    // 2. Append Thinking Indicator
    const thinkingTurn = appendThinkingIndicator();
    const startTime = Date.now();

    // 3. Prepare full cross-model chat payload
    const apiMessages = chatMemory.map(m => ({
        role: m.role,
        content: m.content
    }));

    try {
        const payload = {
            provider_id: activeProviderId,
            model_id: activeModelId,
            api_key: key,
            base_url: activeBaseUrl,
            messages: apiMessages
        };

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        thinkingTurn.remove();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (res.ok && data.success) {
            const aiMsg = {
                role: 'assistant',
                content: data.reply,
                model: activeModelId,
                provider: activeProviderId,
                timestamp: Date.now()
            };
            appendMessageTurn('assistant', data.reply, activeModelId, activeProviderId, `${elapsed}s`);
            chatMemory.push(aiMsg);
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryBadges();
        } else {
            const errorText = data.error || 'The model provider failed to return a response.';
            appendErrorTurn(errorText);
            chatMemory.pop(); // Remove rejected user turn
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryBadges();
        }
    } catch (err) {
        thinkingTurn.remove();
        appendErrorTurn(`Network error: ${err.message}`);
        chatMemory.pop();
        localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
        updateMemoryBadges();
    } finally {
        submitBtn.disabled = !userInput.value.trim();
        userInput.focus();
    }
}

function appendMessageTurn(role, content, modelId = null, providerId = null, latency = null) {
    const turn = document.createElement('div');
    turn.className = `msg-turn ${role}`;

    if (role === 'user') {
        turn.innerHTML = `
            <div class="user-message-card">${escapeHtml(content)}</div>
        `;
    } else {
        const parsed = marked.parse(content);
        const provLabel = PROVIDER_LABELS[providerId] || 'AI Model';
        const modelLabel = modelId ? `${provLabel} · ${modelId}` : 'nammaAPI';
        const latencyHtml = latency ? `<span class="ai-latency">⚡ ${latency}</span>` : '';

        turn.innerHTML = `
            <div class="ai-message-card">
                <div class="ai-card-header">
                    <div class="ai-header-left">
                        <span class="ai-provider-badge">${escapeHtml(provLabel)}</span>
                        <span class="ai-model-tag">· ${escapeHtml(modelId || '')}</span>
                    </div>
                    <div class="ai-header-actions">
                        ${latencyHtml}
                        <button type="button" class="btn-subtle btn-copy-turn" title="Copy response">Copy</button>
                    </div>
                </div>
                <div class="ai-card-body">${parsed}</div>
            </div>
        `;

        // Copy button action
        const copyBtn = turn.querySelector('.btn-copy-turn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => copyBtn.textContent = 'Copy', 1800);
                });
            });
        }

        // Code block syntax highlighting
        turn.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    messagesContainer.appendChild(turn);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    return turn;
}

function appendThinkingIndicator() {
    const turn = document.createElement('div');
    turn.className = 'msg-turn assistant';
    turn.innerHTML = `
        <div class="ai-message-card">
            <div class="thinking-card">
                <div class="spinner"></div>
                <span>${escapeHtml(getModelDisplayName(activeModelId))} is thinking with shared context...</span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(turn);
    chatFeed.scrollTop = chatFeed.scrollHeight;
    return turn;
}

function appendErrorTurn(errorMsg) {
    const turn = document.createElement('div');
    turn.className = 'msg-turn assistant';
    turn.innerHTML = `
        <div class="ai-message-card error-card">
            <span class="error-title">API Request Failed</span>
            <p class="error-desc">${escapeHtml(errorMsg)}</p>
            <button type="button" class="error-action-btn" onclick="openConfigModal('${activeProviderId}')">
                Update ${activeProviderId.toUpperCase()} API Key
            </button>
        </div>
    `;
    messagesContainer.appendChild(turn);
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

// ── CONFIG MODAL ────────────────────────────────────────

function openConfigModal(providerId) {
    setupModalForProvider(providerId || activeProviderId);
    configModal.classList.add('active');
}

function closeConfigModal() {
    configModal.classList.remove('active');
}

function setupModalForProvider(pid) {
    modalSelectedProvider = pid;

    // Tabs
    $$('.prov-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.providerId === pid);
    });

    if (!appConfig) return;

    const keyMap = { "claude": "3", "gemini": "2", "openai": "1", "other": "4" };
    const pData = appConfig[keyMap[pid]];

    modalKeyProviderName.textContent = pData.name;

    const portals = {
        claude: "https://console.anthropic.com/",
        openai: "https://platform.openai.com/api-keys",
        gemini: "https://aistudio.google.com/app/apikey",
        other: "https://platform.deepseek.com/"
    };
    if (providerPortalLink) {
        providerPortalLink.href = portals[pid] || "https://platform.deepseek.com/";
        providerPortalLink.textContent = `${pData.name} Console ↗`;
    }

    const existingKey = savedKeys[pid] || '';
    modalApiKeyInput.value = existingKey;
    modalKeySavedBadge.classList.toggle('hidden', !existingKey);

    const placeholders = {
        claude: "sk-ant-api03-...",
        openai: "sk-proj-...",
        gemini: "AIzaSy...",
        other: "sk-..."
    };
    modalApiKeyInput.placeholder = placeholders[pid] || "Enter API key...";

    if (pid === 'other') {
        modalSubPlatformBox.classList.remove('hidden');
        renderModalSubPlatforms(pData.sub_providers);
    } else {
        modalSubPlatformBox.classList.add('hidden');
        renderModalModels(pData.models || []);
    }
}

function renderModalSubPlatforms(subProviders) {
    modalSubPills.innerHTML = '';
    const keys = Object.keys(subProviders || {});

    keys.forEach((k, idx) => {
        const sp = subProviders[k];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `sub-plat-pill ${idx === 0 ? 'active' : ''}`;
        btn.textContent = sp.name;

        btn.addEventListener('click', () => {
            $$('#modal-sub-pills .sub-plat-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            modalSelectedBaseUrl = sp.base_url;

            if (sp.base_url === 'custom') {
                modalCustomUrlGroup.classList.remove('hidden');
                modalSelectedBaseUrl = modalCustomUrlInput.value.trim() || 'http://localhost:11434/v1/chat/completions';
            } else {
                modalCustomUrlGroup.classList.add('hidden');
            }

            renderModalModels(sp.models || []);
        });

        modalSubPills.appendChild(btn);
    });

    if (keys.length > 0) {
        modalSelectedBaseUrl = subProviders[keys[0]].base_url;
        renderModalModels(subProviders[keys[0]].models || []);
    }
}

function renderModalModels(models) {
    modalModelsGrid.innerHTML = '';
    modalCustomModelBox.classList.add('hidden');

    models.forEach((m, idx) => {
        const tile = document.createElement('div');
        const isCurrent = m.id === activeModelId || idx === 0;
        tile.className = `modal-model-tile ${isCurrent ? 'selected' : ''}`;
        tile.innerHTML = `
            <div class="tile-meta">
                <span class="tile-title">${escapeHtml(m.name)}</span>
                <span class="tile-sub">${escapeHtml(m.desc || m.id)}</span>
            </div>
            <span class="tile-check">✓</span>
        `;

        if (isCurrent) modalSelectedModel = m.id;

        tile.addEventListener('click', () => {
            $$('.modal-model-tile').forEach(t => t.classList.remove('selected'));
            tile.classList.add('selected');
            modalSelectedModel = m.id;
            modalCustomModelBox.classList.add('hidden');
        });

        modalModelsGrid.appendChild(tile);
    });

    // Custom Model Option
    const customTile = document.createElement('div');
    customTile.className = 'modal-model-tile full-width';
    customTile.innerHTML = `
        <div class="tile-meta">
            <span class="tile-title">Custom Model Identifier</span>
            <span class="tile-sub">Input any specific model tag manually</span>
        </div>
        <span class="tile-check">✓</span>
    `;

    customTile.addEventListener('click', () => {
        $$('.modal-model-tile').forEach(t => t.classList.remove('selected'));
        customTile.classList.add('selected');
        modalCustomModelBox.classList.remove('hidden');
        modalSelectedModel = modalCustomModelInput.value.trim() || 'custom';
    });

    modalModelsGrid.appendChild(customTile);
}

function saveModalSettings() {
    const key = modalApiKeyInput.value.trim();
    if (key) {
        savedKeys[modalSelectedProvider] = key;
        localStorage.setItem('namma_api_keys', JSON.stringify(savedKeys));
    }

    if (modalCustomModelBox && !modalCustomModelBox.classList.contains('hidden')) {
        const customVal = modalCustomModelInput.value.trim();
        if (customVal) modalSelectedModel = customVal;
    }

    activeModelId = modalSelectedModel;
    localStorage.setItem('namma_active_model', activeModelId);

    if (modalSelectedBaseUrl) {
        activeBaseUrl = modalSelectedBaseUrl;
        localStorage.setItem('namma_active_base_url', activeBaseUrl);
    }

    syncProviderState(modalSelectedProvider, activeModelId);
}

// ── BIND EVENT LISTENERS ────────────────────────────────

function bindEvents() {
    // Sidebar Toggles
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', toggleSidebar);
    if (sidebarOpenBtn) sidebarOpenBtn.addEventListener('click', toggleSidebar);

    // New Conversation
    newChatBtn.addEventListener('click', resetConversation);

    // Global Shortcut: ⌘K or Ctrl+K for New Conversation
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            resetConversation();
        }
    });

    // Model Dropdown Popover
    headerModelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modelMenuPopover.classList.contains('hidden')) {
            openModelPopover();
        } else {
            closeModelPopover();
        }
    });

    if (sidebarSwitchModelBtn) {
        sidebarSwitchModelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openConfigModal(activeProviderId);
        });
    }

    if (dockModelToggleBtn) {
        dockModelToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModelPopover();
        });
    }

    // Search filter inside model popover
    modelSearchInput.addEventListener('input', (e) => {
        buildPopoverModelsList(e.target.value);
    });

    // Close popover on outside click
    document.addEventListener('click', (e) => {
        if (!modelMenuPopover.contains(e.target) && !headerModelDropdownBtn.contains(e.target) && !dockModelToggleBtn.contains(e.target)) {
            closeModelPopover();
        }
    });

    // Clear Memory
    sidebarClearMemoryBtn.addEventListener('click', () => {
        if (chatMemory.length === 0) return;
        if (confirm('Clear shared memory for this conversation?')) {
            chatMemory = [];
            localStorage.removeItem('namma_chat_memory');
            messagesContainer.innerHTML = '';
            heroEmptyState.classList.remove('hidden');
            updateMemoryBadges();
        }
    });

    // Capability Prompt Cards
    $$('.prompt-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            userInput.value = prompt;
            userInput.style.height = 'auto';
            charCounter.textContent = `${prompt.length} chars`;
            submitBtn.disabled = false;
            userInput.focus();
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Textarea input sizing & counter
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 160)}px`;
        const len = userInput.value.length;
        charCounter.textContent = `${len} char${len === 1 ? '' : 's'}`;
        submitBtn.disabled = !userInput.value.trim();
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!submitBtn.disabled) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (text) sendMessage(text);
    });

    // Config Modal
    openConfigBtn.addEventListener('click', () => openConfigModal(activeProviderId));
    navKeyBtn.addEventListener('click', () => openConfigModal(activeProviderId));
    modalCloseBtn.addEventListener('click', closeConfigModal);
    modalCancelBtn.addEventListener('click', closeConfigModal);
    configModal.addEventListener('click', (e) => {
        if (e.target === configModal) closeConfigModal();
    });

    modalSaveBtn.addEventListener('click', () => {
        saveModalSettings();
        closeConfigModal();
        if (pendingMessage) {
            sendMessage(pendingMessage);
            pendingMessage = null;
        }
    });

    $$('.prov-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            setupModalForProvider(tab.dataset.providerId);
        });
    });

    $$('.prov-config-link').forEach(link => {
        link.addEventListener('click', () => {
            openConfigModal(link.dataset.openProvider);
        });
    });

    modalKeyToggleBtn.addEventListener('click', () => {
        const isPass = modalApiKeyInput.type === 'password';
        modalApiKeyInput.type = isPass ? 'text' : 'password';
    });

    // Share Modal
    openShareBtn.addEventListener('click', () => {
        fetchShareInfo();
        shareModal.classList.add('active');
    });
    navShareBtn.addEventListener('click', () => {
        fetchShareInfo();
        shareModal.classList.add('active');
    });
    shareModalCloseBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    shareModalDoneBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) shareModal.classList.remove('active');
    });

    // Copy Buttons in Share Modal
    $$('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = $(btn.dataset.inputId);
            if (input) {
                navigator.clipboard.writeText(input.value).then(() => {
                    const orig = btn.textContent;
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = orig;
                        btn.classList.remove('copied');
                    }, 1800);
                });
            }
        });
    });

    // Escape closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeConfigModal();
            shareModal.classList.remove('active');
            closeModelPopover();
        }
    });
}

function resetConversation() {
    if (chatMemory.length > 0 && !confirm('Start a new conversation? Memory for this thread will be reset.')) {
        return;
    }
    chatMemory = [];
    localStorage.removeItem('namma_chat_memory');
    messagesContainer.innerHTML = '';
    heroEmptyState.classList.remove('hidden');
    updateMemoryBadges();
    userInput.focus();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
