// nammaAPI — Studio Workspace Controller

let appConfig = null;

// Application State
let activeProviderId = localStorage.getItem('namma_active_provider') || 'claude';
let activeModelId = localStorage.getItem('namma_active_model') || 'claude-3-5-sonnet-20241022';
let activeBaseUrl = localStorage.getItem('namma_active_base_url') || null;

// Persistent Local Data
let savedKeys = JSON.parse(localStorage.getItem('namma_api_keys') || '{}');
let chatMemory = JSON.parse(localStorage.getItem('namma_chat_memory') || '[]');
let pendingMessage = null;

const PROVIDER_NAMES = {
    claude: 'Anthropic Claude',
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    other: 'DeepSeek / Custom'
};

const PROVIDER_COLORS = {
    claude: '#d97706',
    gemini: '#38bdf8',
    openai: '#10b981',
    other: '#a855f7'
};

// DOM Utilities
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// Main Views
const chatViewport = $('chat-viewport');
const quietHero = $('quiet-hero');
const conversationStream = $('conversation-stream');
const chatForm = $('chat-form');
const userInput = $('user-input');
const submitBtn = $('submit-btn');

// Topbar Controls
const modelPopoverTrigger = $('model-popover-trigger');
const activeProvDot = $('active-prov-dot');
const activeModelText = $('active-model-text');
const modelDropdown = $('model-dropdown');
const modelSearchInput = $('model-search-input');
const dropdownModelsList = $('dropdown-models-list');
const memoryStatusBadge = $('memory-status-badge');
const memoryIndicatorDot = $('memory-indicator-dot');
const memoryStatusText = $('memory-status-text');

// Composer Controls
const composerModelSwitchBtn = $('composer-model-switch-btn');
const composerProvDot = $('composer-prov-dot');
const composerModelName = $('composer-model-name');
const composerContextLabel = $('composer-context-label');

// Modals
const keysModal = $('keys-modal');
const openKeysBtn = $('open-keys-btn');
const keysModalCloseBtn = $('keys-modal-close-btn');
const keysModalCancelBtn = $('keys-modal-cancel-btn');
const keysModalSaveBtn = $('keys-modal-save-btn');

const shareModal = $('share-modal');
const openShareBtn = $('open-share-btn');
const shareModalCloseBtn = $('share-modal-close-btn');
const shareModalDoneBtn = $('share-modal-done-btn');
const newChatBtn = $('new-chat-btn');

// Key Form Elements
const modalKeyInput = $('modal-key-input');
const toggleKeyMaskBtn = $('toggle-key-mask-btn');
const modalKeyProviderTitle = $('modal-key-provider-title');
const keyConfiguredBadge = $('key-configured-badge');
const portalExternalLink = $('portal-external-link');
const modalModelsList = $('modal-models-list');
const customModelBox = $('custom-model-box');
const customModelInput = $('custom-model-input');
const subPlatformBox = $('sub-platform-box');
const subPillsRow = $('sub-pills-row');
const customUrlBox = $('custom-url-box');
const customUrlInput = $('custom-url-input');

// Modal Selection Temp State
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
        console.error('Failed to load configuration:', err);
    }

    syncState(activeProviderId, activeModelId);
    renderConversation();
    updateMemoryUI();
    fetchShareInfo();
    bindEvents();
});

// ── SHARE INFORMATION ───────────────────────────────────

async function fetchShareInfo() {
    try {
        const res = await fetch('/api/share-info');
        const info = await res.json();
        if ($('public-share-input')) $('public-share-input').value = 'https://nammaapi.vercel.app';
        if (info.lan_url && $('lan-share-input')) $('lan-share-input').value = info.lan_url;
        if (info.localhost_url && $('local-share-input')) $('local-share-input').value = info.localhost_url;
    } catch (e) {
        console.warn('Share info fallback active');
    }
}

// ── STATE & MODEL SYNCHRONIZATION ───────────────────────

function syncState(providerId, modelId) {
    activeProviderId = providerId;
    localStorage.setItem('namma_active_provider', providerId);

    if (modelId) {
        activeModelId = modelId;
        localStorage.setItem('namma_active_model', modelId);
    }

    const dotColor = PROVIDER_COLORS[providerId] || '#fff';
    const displayName = getModelName(activeModelId);

    // Update Topbar
    activeModelText.textContent = displayName;
    activeProvDot.style.backgroundColor = dotColor;

    // Update Composer Tag
    composerModelName.textContent = displayName;
    composerProvDot.style.backgroundColor = dotColor;

    buildDropdownList();
}

function getModelName(modelId) {
    if (!appConfig) return modelId;
    for (const key of Object.keys(appConfig)) {
        const p = appConfig[key];
        if (p.models) {
            const found = p.models.find(m => m.id === modelId);
            if (found) return found.name;
        }
        if (p.sub_providers) {
            for (const sKey of Object.keys(p.sub_providers)) {
                const sub = p.sub_providers[sKey];
                const found = (sub.models || []).find(m => m.id === modelId);
                if (found) return found.name;
            }
        }
    }
    return modelId;
}

// ── MODEL PICKER DROPDOWN ───────────────────────────────

function buildDropdownList(filter = '') {
    if (!appConfig || !dropdownModelsList) return;
    dropdownModelsList.innerHTML = '';
    const q = filter.toLowerCase().trim();

    const providerMap = { claude: '3', gemini: '2', openai: '1', other: '4' };

    Object.keys(providerMap).forEach(provId => {
        const pData = appConfig[providerMap[provId]];
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
            !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.desc && m.desc.toLowerCase().includes(q))
        );

        if (filtered.length === 0) return;

        const header = document.createElement('div');
        header.className = 'dropdown-section-tag';
        header.textContent = pData.name;
        dropdownModelsList.appendChild(header);

        filtered.forEach(m => {
            const row = document.createElement('div');
            const isSelected = m.id === activeModelId;
            row.className = `dropdown-row ${isSelected ? 'selected' : ''}`;
            row.innerHTML = `
                <div class="dropdown-row-main">
                    <span class="dropdown-row-name">${escapeHtml(m.name)}</span>
                    <span class="dropdown-row-desc">${escapeHtml(m.desc || m.id)}</span>
                </div>
                <span class="dropdown-row-check">✓</span>
            `;

            row.addEventListener('click', () => {
                syncState(provId, m.id);
                if (m.subUrl) {
                    activeBaseUrl = m.subUrl;
                    localStorage.setItem('namma_active_base_url', activeBaseUrl);
                }
                closeDropdown();
            });

            dropdownModelsList.appendChild(row);
        });
    });
}

function openDropdown() {
    modelDropdown.classList.remove('hidden');
    modelSearchInput.value = '';
    modelSearchInput.focus();
    buildDropdownList();
}

function closeDropdown() {
    modelDropdown.classList.add('hidden');
}

// ── MEMORY STATUS ───────────────────────────────────────

function updateMemoryUI() {
    const count = chatMemory.length;
    if (memoryStatusText) {
        memoryStatusText.textContent = count > 0 ? `${count} turn${count === 1 ? '' : 's'} shared` : 'Shared context';
    }
    if (memoryIndicatorDot) {
        memoryIndicatorDot.classList.toggle('idle', count === 0);
    }
    if (composerContextLabel) {
        composerContextLabel.textContent = count > 0 ? `${count} turns in memory` : 'Context active';
    }
}

// ── CONVERSATION STREAM ─────────────────────────────────

function renderConversation() {
    if (!chatMemory || chatMemory.length === 0) {
        quietHero.classList.remove('hidden');
        conversationStream.innerHTML = '';
        return;
    }

    quietHero.classList.add('hidden');
    conversationStream.innerHTML = '';
    chatMemory.forEach(msg => {
        appendMessage(msg.role, msg.content, msg.model, msg.provider);
    });
}

async function sendMessage(text) {
    const key = savedKeys[activeProviderId];

    if (!key || !key.trim()) {
        pendingMessage = text;
        openKeysModal(activeProviderId);
        return;
    }

    quietHero.classList.add('hidden');
    userInput.value = '';
    userInput.style.height = 'auto';
    submitBtn.disabled = true;

    // 1. Add User Turn
    const userTurn = {
        role: 'user',
        content: text,
        model: null,
        provider: null,
        timestamp: Date.now()
    };
    appendMessage('user', text);
    chatMemory.push(userTurn);
    localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
    updateMemoryUI();

    // 2. Add Thinking Turn
    const thinkingRow = appendThinking();

    // 3. Prepare Multi-turn API history
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
        thinkingRow.remove();

        if (res.ok && data.success) {
            const assistantTurn = {
                role: 'assistant',
                content: data.reply,
                model: activeModelId,
                provider: activeProviderId,
                timestamp: Date.now()
            };
            appendMessage('assistant', data.reply, activeModelId, activeProviderId);
            chatMemory.push(assistantTurn);
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryUI();
        } else {
            const err = data.error || 'The provider returned an error.';
            appendError(err);
            chatMemory.pop();
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryUI();
        }
    } catch (err) {
        thinkingRow.remove();
        appendError(`Network connection error: ${err.message}`);
        chatMemory.pop();
        localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
        updateMemoryUI();
    } finally {
        submitBtn.disabled = !userInput.value.trim();
        userInput.focus();
    }
}

function appendMessage(role, content, modelId = null, providerId = null) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    if (role === 'user') {
        row.innerHTML = `<div class="user-bubble-box">${escapeHtml(content)}</div>`;
    } else {
        const parsed = marked.parse(content);
        const provLabel = PROVIDER_NAMES[providerId] || 'AI Model';
        const modelLabel = modelId ? `${provLabel} · ${modelId}` : 'nammaAPI';

        row.innerHTML = `
            <div class="ai-entry">
                <div class="ai-meta-bar">
                    <span class="ai-meta-author">${escapeHtml(modelLabel)}</span>
                    <div class="ai-meta-actions">
                        <button type="button" class="btn-mini-copy" title="Copy text">Copy</button>
                    </div>
                </div>
                <div class="ai-text-body">${parsed}</div>
            </div>
        `;

        const copyBtn = row.querySelector('.btn-mini-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyBtn.textContent = 'Copied';
                    setTimeout(() => copyBtn.textContent = 'Copy', 1600);
                });
            });
        }

        row.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }

    conversationStream.appendChild(row);
    chatViewport.scrollTop = chatViewport.scrollHeight;
    return row;
}

function appendThinking() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `
        <div class="ai-entry">
            <div class="ai-thinking-row">
                <span class="pulse-dot"></span>
                <span>Thinking with shared memory...</span>
            </div>
        </div>
    `;
    conversationStream.appendChild(row);
    chatViewport.scrollTop = chatViewport.scrollHeight;
    return row;
}

function appendError(errorMsg) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `
        <div class="ai-entry">
            <div class="ai-error-box">
                <span class="ai-error-title">Request unsuccessful</span>
                <span class="ai-error-desc">${escapeHtml(errorMsg)}</span>
                <button type="button" class="ai-error-btn" onclick="openKeysModal('${activeProviderId}')">Update ${activeProviderId.toUpperCase()} API key</button>
            </div>
        </div>
    `;
    conversationStream.appendChild(row);
    chatViewport.scrollTop = chatViewport.scrollHeight;
}

// ── KEYS CONFIGURATION MODAL ────────────────────────────

function openKeysModal(providerId) {
    setupKeysModalFor(providerId || activeProviderId);
    keysModal.classList.add('active');
}

function closeKeysModal() {
    keysModal.classList.remove('active');
}

function setupKeysModalFor(pid) {
    modalSelectedProvider = pid;

    $$('.prov-choice-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.providerId === pid);
    });

    if (!appConfig) return;

    const providerMap = { claude: '3', gemini: '2', openai: '1', other: '4' };
    const pData = appConfig[providerMap[pid]];

    modalKeyProviderTitle.textContent = pData.name;

    const portals = {
        claude: 'https://console.anthropic.com/',
        openai: 'https://platform.openai.com/api-keys',
        gemini: 'https://aistudio.google.com/app/apikey',
        other: 'https://platform.deepseek.com/'
    };
    if (portalExternalLink) {
        portalExternalLink.href = portals[pid] || 'https://platform.deepseek.com/';
        portalExternalLink.textContent = `Get key from ${pData.name} console ↗`;
    }

    const existingKey = savedKeys[pid] || '';
    modalKeyInput.value = existingKey;
    keyConfiguredBadge.classList.toggle('hidden', !existingKey);

    const placeholders = {
        claude: 'sk-ant-api03-...',
        openai: 'sk-proj-...',
        gemini: 'AIzaSy...',
        other: 'sk-...'
    };
    modalKeyInput.placeholder = placeholders[pid] || 'Enter API key...';

    if (pid === 'other') {
        subPlatformBox.classList.remove('hidden');
        renderSubPlatforms(pData.sub_providers);
    } else {
        subPlatformBox.classList.add('hidden');
        renderSheetModels(pData.models || []);
    }
}

function renderSubPlatforms(subProviders) {
    subPillsRow.innerHTML = '';
    const keys = Object.keys(subProviders || {});

    keys.forEach((k, idx) => {
        const sp = subProviders[k];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `sub-plat-tag ${idx === 0 ? 'active' : ''}`;
        btn.textContent = sp.name;

        btn.addEventListener('click', () => {
            $$('#sub-pills-row .sub-plat-tag').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            modalSelectedBaseUrl = sp.base_url;

            if (sp.base_url === 'custom') {
                customUrlBox.classList.remove('hidden');
                modalSelectedBaseUrl = customUrlInput.value.trim() || 'http://localhost:11434/v1/chat/completions';
            } else {
                customUrlBox.classList.add('hidden');
            }

            renderSheetModels(sp.models || []);
        });

        subPillsRow.appendChild(btn);
    });

    if (keys.length > 0) {
        modalSelectedBaseUrl = subProviders[keys[0]].base_url;
        renderSheetModels(subProviders[keys[0]].models || []);
    }
}

function renderSheetModels(models) {
    modalModelsList.innerHTML = '';
    customModelBox.classList.add('hidden');

    models.forEach((m, idx) => {
        const tile = document.createElement('div');
        const isCurrent = m.id === activeModelId || idx === 0;
        tile.className = `sheet-model-tile ${isCurrent ? 'active' : ''}`;
        tile.innerHTML = `
            <div class="sheet-model-main">
                <span class="sheet-model-name">${escapeHtml(m.name)}</span>
                <span class="sheet-model-desc">${escapeHtml(m.desc || m.id)}</span>
            </div>
            <span class="sheet-model-check">✓</span>
        `;

        if (isCurrent) modalSelectedModel = m.id;

        tile.addEventListener('click', () => {
            $$('.sheet-model-tile').forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            modalSelectedModel = m.id;
            customModelBox.classList.add('hidden');
        });

        modalModelsList.appendChild(tile);
    });

    // Custom model tile
    const customTile = document.createElement('div');
    customTile.className = 'sheet-model-tile full';
    customTile.innerHTML = `
        <div class="sheet-model-main">
            <span class="sheet-model-name">Custom Model</span>
            <span class="sheet-model-desc">Enter any model identifier</span>
        </div>
        <span class="sheet-model-check">✓</span>
    `;

    customTile.addEventListener('click', () => {
        $$('.sheet-model-tile').forEach(t => t.classList.remove('active'));
        customTile.classList.add('active');
        customModelBox.classList.remove('hidden');
        modalSelectedModel = customModelInput.value.trim() || 'custom';
    });

    modalModelsList.appendChild(customTile);
}

function saveKeySettings() {
    const key = modalKeyInput.value.trim();
    if (key) {
        savedKeys[modalSelectedProvider] = key;
        localStorage.setItem('namma_api_keys', JSON.stringify(savedKeys));
    }

    if (customModelBox && !customModelBox.classList.contains('hidden')) {
        const val = customModelInput.value.trim();
        if (val) modalSelectedModel = val;
    }

    activeModelId = modalSelectedModel;
    localStorage.setItem('namma_active_model', activeModelId);

    if (modalSelectedBaseUrl) {
        activeBaseUrl = modalSelectedBaseUrl;
        localStorage.setItem('namma_active_base_url', activeBaseUrl);
    }

    syncState(modalSelectedProvider, activeModelId);
}

// ── BIND EVENT LISTENERS ────────────────────────────────

function bindEvents() {
    // Topbar Dropdown
    modelPopoverTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modelDropdown.classList.contains('hidden')) {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    composerModelSwitchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDropdown();
    });

    modelSearchInput.addEventListener('input', (e) => {
        buildDropdownList(e.target.value);
    });

    document.addEventListener('click', (e) => {
        if (!modelDropdown.contains(e.target) && !modelPopoverTrigger.contains(e.target) && !composerModelSwitchBtn.contains(e.target)) {
            closeDropdown();
        }
    });

    // Starter Suggestions
    $$('.suggestion-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const prompt = tile.dataset.prompt;
            userInput.value = prompt;
            userInput.style.height = 'auto';
            submitBtn.disabled = false;
            userInput.focus();
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Input auto-grow and submit
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 160)}px`;
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

    // Reset / New Chat
    newChatBtn.addEventListener('click', resetChat);

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            resetChat();
        }
    });

    // Keys Modal
    openKeysBtn.addEventListener('click', () => openKeysModal(activeProviderId));
    keysModalCloseBtn.addEventListener('click', closeKeysModal);
    keysModalCancelBtn.addEventListener('click', closeKeysModal);
    keysModal.addEventListener('click', (e) => {
        if (e.target === keysModal) closeKeysModal();
    });

    keysModalSaveBtn.addEventListener('click', () => {
        saveKeySettings();
        closeKeysModal();
        if (pendingMessage) {
            sendMessage(pendingMessage);
            pendingMessage = null;
        }
    });

    $$('.prov-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setupKeysModalFor(btn.dataset.providerId);
        });
    });

    toggleKeyMaskBtn.addEventListener('click', () => {
        modalKeyInput.type = modalKeyInput.type === 'password' ? 'text' : 'password';
    });

    // Share Modal
    openShareBtn.addEventListener('click', () => {
        fetchShareInfo();
        shareModal.classList.add('active');
    });
    shareModalCloseBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    shareModalDoneBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) shareModal.classList.remove('active');
    });

    $$('.btn-copy-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = $(btn.dataset.inputId);
            if (input) {
                navigator.clipboard.writeText(input.value).then(() => {
                    const orig = btn.textContent;
                    btn.textContent = 'Copied';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = orig;
                        btn.classList.remove('copied');
                    }, 1600);
                });
            }
        });
    });

    // Escape closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeKeysModal();
            shareModal.classList.remove('active');
            closeDropdown();
        }
    });
}

function resetChat() {
    if (chatMemory.length > 0 && !confirm('Start a new conversation? Shared memory will be cleared.')) {
        return;
    }
    chatMemory = [];
    localStorage.removeItem('namma_chat_memory');
    conversationStream.innerHTML = '';
    quietHero.classList.remove('hidden');
    updateMemoryUI();
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
