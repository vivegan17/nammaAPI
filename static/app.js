// nammaAPI — Studio Workspace Controller with Official Logos & Effort Controls

let appConfig = null;

// Application State
let activeProviderId = localStorage.getItem('namma_active_provider') || 'claude';
let activeModelId = localStorage.getItem('namma_active_model') || 'claude-3-7-sonnet-20250219';
let activeEffort = localStorage.getItem('namma_active_effort') || 'medium'; // none, low, medium, high, max
let activeBaseUrl = localStorage.getItem('namma_active_base_url') || null;

// Persistent Local Data
let savedKeys = JSON.parse(localStorage.getItem('namma_api_keys') || '{}');
let chatMemory = JSON.parse(localStorage.getItem('namma_chat_memory') || '[]');
let pendingMessage = null;

// ── OFFICIAL PROVIDER SVG LOGOS ─────────────────────────
const PROVIDER_LOGOS = {
    claude: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13.8 3L8.6 21H11.5L16.7 3H13.8Z" fill="#D97706"/><path d="M4 10.6L19 14.8L19.8 12L4.8 7.8L4 10.6Z" fill="#D97706"/><path d="M7.8 19.8L16.2 4.2L13.7 2.8L5.3 18.4L7.8 19.8Z" fill="#D97706"/></svg>`,
    openai: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 9.5c-.14-.84-.52-1.63-1.1-2.26a5.57 5.57 0 0 0-4.04-1.93c-.4-.73-.97-1.34-1.66-1.78a5.5 5.5 0 0 0-5.6-.27 5.48 5.48 0 0 0-2.3 2.15 5.57 5.57 0 0 0-3.32 1.34 5.54 5.54 0 0 0-1.8 3.39c-.74.37-1.36.94-1.8 1.65a5.52 5.52 0 0 0-.32 4.97 5.57 5.57 0 0 0 1.93 2.38 5.5 5.5 0 0 0 1.66 4.7 5.53 5.53 0 0 0 5.6.27 5.5 5.5 0 0 0 2.3-2.15 5.55 5.55 0 0 0 3.32-1.34c.73-.59 1.3-1.34 1.66-2.2.73-.37 1.35-.94 1.8-1.65a5.52 5.52 0 0 0 .32-4.97c-.37-.7-.93-1.3-1.66-1.74zm-8.8 11.23a3.8 3.8 0 0 1-2.22-.7l1.73-1a2.1 2.1 0 0 0 1.05-.18 2.08 2.08 0 0 0 .78-.71l2.45-4.24a.8.8 0 0 1 .4-.35.8.8 0 0 1 .53-.05l1.7.46a3.83 3.83 0 0 1-6.42 6.77zm-7.6-3.87a3.8 3.8 0 0 1-.3-2.31l1.73 1a2.1 2.1 0 0 0 1.06.63 2.08 2.08 0 0 0 1.06 0l4.9-1.31a.8.8 0 0 1 .52.05.8.8 0 0 1 .35.4l-.46 1.7a3.83 3.83 0 0 1-8.86-.16zm-1.18-8.2c.45-.66 1.07-1.18 1.8-1.5l-.02 2a2.1 2.1 0 0 0-.02 1.06 2.08 2.08 0 0 0 .28 1.03l2.45 4.24a.8.8 0 0 1 .05.53.8.8 0 0 1-.26.43l-1.46.96a3.83 3.83 0 0 1-2.82-8.75zm12.3 2.04l-4.9 1.31a.8.8 0 0 1-.52-.05.8.8 0 0 1-.35-.4l.46-1.7a3.83 3.83 0 0 1 8.86.16 3.8 3.8 0 0 1 .3 2.31l-1.73-1a2.1 2.1 0 0 0-1.06-.63 2.08 2.08 0 0 0-1.06 0zm2.25 4.25c-.45.66-1.07 1.18-1.8 1.5l.02-2a2.1 2.1 0 0 0 .02-1.06 2.08 2.08 0 0 0-.28-1.03l-2.45-4.24a.8.8 0 0 1-.05-.53.8.8 0 0 1 .26-.43l1.46-.96a3.83 3.83 0 0 1 2.82 8.75z"/></svg>`,
    gemini: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#38BDF8"/><path d="M12 5.5L13.8 10.2L18.5 12L13.8 13.8L12 18.5L10.2 13.8L5.5 12L10.2 10.2L12 5.5Z" fill="#818CF8"/></svg>`,
    deepseek: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 13.5C3 8.8 6.8 5 11.5 5C16.2 5 20 8.8 20 13.5C20 17 17.5 19.9 14.2 20.6L12 21.5L9.8 20.6C6.5 19.9 4 17 4 13.5H3Z" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="11" r="1.5" fill="#38BDF8"/><path d="M13 14C13 14 15 13 16 11" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/><path d="M19 10C21 8.5 22 6.5 22 5" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    grok: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    perplexity: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2V22M4 7L20 17M20 7L4 17" stroke="#2DD4BF" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="#2DD4BF" stroke-width="2"/></svg>`,
    llama: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 6C4.24 6 2 8.24 2 11C2 13.76 4.24 16 7 16C9.28 16 11.2 14.48 11.8 12.38C12.2 12.38 12.6 12.38 13 12.38C13.6 14.48 15.52 16 17.8 16C20.56 16 22.8 13.76 22.8 11C22.8 8.24 20.56 6 17.8 6C15.52 6 13.6 7.52 13 9.62C12.6 9.62 12.2 9.62 11.8 9.62C11.2 7.52 9.28 6 7 6Z" stroke="#3B82F6" stroke-width="2.2" stroke-linecap="round"/></svg>`,
    qwen: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" stroke="#A855F7" stroke-width="2" stroke-linejoin="round"/><path d="M12 6L17.2 9V15L12 18L6.8 15V9L12 6Z" fill="#A855F7"/></svg>`,
    cursor: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="#E4E4E7" stroke-width="2" stroke-linejoin="round"/><path d="M12 2V22M3 7L21 17M21 7L3 17" stroke="#E4E4E7" stroke-width="1.5"/></svg>`,
    notebooklm: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#60A5FA" stroke-width="2"/><path d="M8 8H16M8 12H16M8 16H13" stroke="#60A5FA" stroke-width="2" stroke-linecap="round"/></svg>`,
    other: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#A1A1AA" stroke-width="2"/><path d="M7 10L10 13L7 16M13 16H17" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round"/></svg>`
};

// DOM Elements
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// Navigation & Model Menu
const modelPopoverTrigger = $('model-popover-trigger');
const headerLogoBox = $('header-logo-box');
const headerModelName = $('header-model-name');
const headerEffortTag = $('header-effort-tag');
const modelMenuPanel = $('model-menu-panel');
const providerRail = $('provider-rail');
const modelFilterInput = $('model-filter-input');
const menuContentScroll = $('menu-content-scroll');
const featuredModelsList = $('featured-models-list');
const effortTriggerRow = $('effort-trigger-row');
const currentEffortLabel = $('current-effort-label');
const moreModelsRow = $('more-models-row');
const moreModelsCount = $('more-models-count');
const effortSubmenu = $('effort-submenu');
const effortBackBtn = $('effort-back-btn');
const legacyModelsSubmenu = $('legacy-models-submenu');
const legacyBackBtn = $('legacy-back-btn');
const legacyModelsList = $('legacy-models-list');
const legacySubmenuTitle = $('legacy-submenu-title');

// Composer Elements
const composerModelBtn = $('composer-model-btn');
const composerLogoBox = $('composer-logo-box');
const composerModelTitle = $('composer-model-title');
const composerEffortChip = $('composer-effort-chip');
const heroProviderLogo = $('hero-provider-logo');

// Main Views
const chatViewport = $('chat-viewport');
const editorialHero = $('editorial-hero');
const messagesContainer = $('messages-container');
const chatForm = $('chat-form');
const userInput = $('user-input');
const submitBtn = $('submit-btn');

// Topbar Utility Buttons
const memoryPill = $('memory-pill');
const memoryDot = $('memory-dot');
const memoryCountLabel = $('memory-count-label');
const openShareBtn = $('open-share-btn');
const openKeysBtn = $('open-keys-btn');
const newChatBtn = $('new-chat-btn');

// Modals
const keysModal = $('keys-modal');
const keysModalCloseBtn = $('keys-modal-close-btn');
const keysModalCancelBtn = $('keys-modal-cancel-btn');
const keysModalSaveBtn = $('keys-modal-save-btn');
const keysProviderGrid = $('keys-provider-grid');
const keysModelsList = $('keys-models-list');
const modalKeyInput = $('modal-key-input');
const toggleKeyMaskBtn = $('toggle-key-mask-btn');
const modalKeyProviderTitle = $('modal-key-provider-title');
const keySavedBadge = $('key-saved-badge');
const portalExternalLink = $('portal-external-link');
const customModelRow = $('custom-model-row');
const customModelInput = $('custom-model-input');

const shareModal = $('share-modal');
const shareModalCloseBtn = $('share-modal-close-btn');
const shareModalDoneBtn = $('share-modal-done-btn');

// Temporary Modal Selection
let modalSelectedProvider = 'claude';
let modalSelectedModel = 'claude-3-7-sonnet-20250219';
let railSelectedProvider = activeProviderId;

// ── INITIALIZATION ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        appConfig = data.providers;
    } catch (err) {
        console.error('Failed to load model registry:', err);
    }

    syncActiveState(activeProviderId, activeModelId, activeEffort);
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
        console.warn('Share info fallback');
    }
}

// ── STATE & MODEL SYNCHRONIZATION ───────────────────────

function syncActiveState(providerId, modelId, effort) {
    activeProviderId = providerId;
    localStorage.setItem('namma_active_provider', providerId);

    if (modelId) {
        activeModelId = modelId;
        localStorage.setItem('namma_active_model', modelId);
    }

    if (effort) {
        activeEffort = effort;
        localStorage.setItem('namma_active_effort', effort);
    }

    const logoSvg = PROVIDER_LOGOS[providerId] || PROVIDER_LOGOS.other;
    const modelName = getModelDisplayName(activeModelId);
    const effortCapitalized = activeEffort.charAt(0).toUpperCase() + activeEffort.slice(1);

    // Update Topbar
    headerLogoBox.innerHTML = logoSvg;
    headerModelName.textContent = modelName;
    headerEffortTag.textContent = effortCapitalized;
    currentEffortLabel.textContent = effortCapitalized;

    // Update Composer
    composerLogoBox.innerHTML = logoSvg;
    composerModelTitle.textContent = modelName;
    composerEffortChip.textContent = effortCapitalized;

    // Update Hero Emblem
    if (heroProviderLogo) {
        heroProviderLogo.innerHTML = logoSvg;
    }

    buildProviderRail();
    buildModelListing(activeProviderId);
}

function getModelDisplayName(modelId) {
    if (!appConfig) return modelId;
    for (const key of Object.keys(appConfig)) {
        const p = appConfig[key];
        if (p.models) {
            const found = p.models.find(m => m.id === modelId);
            if (found) return found.name;
        }
    }
    return modelId;
}

// ── MODEL POPOVER MENU BUILDER ──────────────────────────

function buildProviderRail() {
    if (!appConfig || !providerRail) return;
    providerRail.innerHTML = '';

    Object.keys(appConfig).forEach(provId => {
        const p = appConfig[provId];
        const item = document.createElement('div');
        const isActive = provId === railSelectedProvider;
        item.className = `rail-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <span class="rail-icon">${PROVIDER_LOGOS[provId] || PROVIDER_LOGOS.other}</span>
            <span class="rail-name">${escapeHtml(p.name.replace('Anthropic ', '').replace('Google ', '').replace('Meta ', '').replace('Alibaba ', ''))}</span>
        `;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            railSelectedProvider = provId;
            $$('.rail-item').forEach(r => r.classList.remove('active'));
            item.classList.add('active');
            closeSubmenus();
            buildModelListing(provId);
        });

        providerRail.appendChild(item);
    });
}

function buildModelListing(providerId, searchQuery = '') {
    if (!appConfig) return;
    const p = appConfig[providerId];
    if (!p) return;

    featuredModelsList.innerHTML = '';
    const q = searchQuery.toLowerCase().trim();

    const featuredModels = (p.models || []).filter(m => !m.category || m.category === 'featured');
    const legacyModels = (p.models || []).filter(m => m.category === 'legacy');

    // Update more models count badge
    if (moreModelsCount) {
        moreModelsCount.textContent = `${legacyModels.length} models`;
    }

    const filtered = (q ? p.models : featuredModels).filter(m =>
        !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.desc && m.desc.toLowerCase().includes(q))
    );

    filtered.forEach(m => {
        const card = document.createElement('div');
        const isSelected = m.id === activeModelId;
        card.className = `featured-model-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="f-model-meta">
                <div class="f-model-name-row">
                    <span class="f-model-title">${escapeHtml(m.name)}</span>
                    ${m.badge ? `<span class="f-badge">${escapeHtml(m.badge)}</span>` : ''}
                </div>
                <span class="f-model-desc">${escapeHtml(m.desc || m.id)}</span>
            </div>
            <span class="f-model-check">✓</span>
        `;

        card.addEventListener('click', () => {
            syncActiveState(providerId, m.id, activeEffort);
            closeModelPopover();
        });

        featuredModelsList.appendChild(card);
    });

    // Populate Legacy Models Submenu List
    buildLegacySubmenu(providerId, legacyModels);
}

function buildLegacySubmenu(providerId, legacyModels) {
    if (!legacyModelsList) return;
    legacyModelsList.innerHTML = '';
    const p = appConfig[providerId];
    if (legacySubmenuTitle) legacySubmenuTitle.textContent = `${p.name} (All Versions)`;

    legacyModels.forEach(m => {
        const item = document.createElement('div');
        const isSelected = m.id === activeModelId;
        item.className = `submenu-item ${isSelected ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="sub-item-meta">
                <span class="sub-item-title">${escapeHtml(m.name)}</span>
                <span class="sub-item-desc">${escapeHtml(m.desc || m.id)}</span>
            </div>
            <span class="sub-check">✓</span>
        `;

        item.addEventListener('click', () => {
            syncActiveState(providerId, m.id, activeEffort);
            closeModelPopover();
        });

        legacyModelsList.appendChild(item);
    });
}

function closeSubmenus() {
    effortSubmenu.classList.add('hidden');
    legacyModelsSubmenu.classList.add('hidden');
    menuContentScroll.classList.remove('hidden');
}

function openModelPopover() {
    modelMenuPanel.classList.remove('hidden');
    railSelectedProvider = activeProviderId;
    buildProviderRail();
    buildModelListing(activeProviderId);
    closeSubmenus();
    modelFilterInput.value = '';
    modelFilterInput.focus();
}

function closeModelPopover() {
    modelMenuPanel.classList.add('hidden');
    closeSubmenus();
}

// ── MEMORY STATUS ───────────────────────────────────────

function updateMemoryUI() {
    const count = chatMemory.length;
    if (memoryCountLabel) {
        memoryCountLabel.textContent = count > 0 ? `${count} turn${count === 1 ? '' : 's'} shared` : 'Shared memory';
    }
    if (memoryDot) {
        memoryDot.classList.toggle('idle', count === 0);
    }
}

// ── CONVERSATION STREAM ─────────────────────────────────

function renderConversation() {
    if (!chatMemory || chatMemory.length === 0) {
        editorialHero.classList.remove('hidden');
        messagesContainer.innerHTML = '';
        return;
    }

    editorialHero.classList.add('hidden');
    messagesContainer.innerHTML = '';
    chatMemory.forEach(msg => {
        appendMessageTurn(msg.role, msg.content, msg.model, msg.provider);
    });
}

async function sendMessage(text) {
    const key = savedKeys[activeProviderId];

    if (!key || !key.trim()) {
        pendingMessage = text;
        openKeysModal(activeProviderId);
        return;
    }

    editorialHero.classList.add('hidden');
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
    appendMessageTurn('user', text);
    chatMemory.push(userTurn);
    localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
    updateMemoryUI();

    // 2. Add Thinking Indicator
    const thinkingRow = appendThinkingRow();

    // 3. Multi-turn payload
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
            effort: activeEffort,
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
            appendMessageTurn('assistant', data.reply, activeModelId, activeProviderId);
            chatMemory.push(assistantTurn);
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryUI();
        } else {
            const err = data.error || 'The model provider failed to return a response.';
            appendErrorRow(err);
            chatMemory.pop();
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryUI();
        }
    } catch (err) {
        thinkingRow.remove();
        appendErrorRow(`Network connection error: ${err.message}`);
        chatMemory.pop();
        localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
        updateMemoryUI();
    } finally {
        submitBtn.disabled = !userInput.value.trim();
        userInput.focus();
    }
}

function appendMessageTurn(role, content, modelId = null, providerId = null) {
    const turn = document.createElement('div');
    turn.className = `message-turn ${role}`;

    if (role === 'user') {
        turn.innerHTML = `<div class="user-message-bubble">${escapeHtml(content)}</div>`;
    } else {
        const parsed = marked.parse(content);
        const provName = appConfig && appConfig[providerId] ? appConfig[providerId].name : 'AI Model';
        const modelLabel = modelId ? `${provName} · ${modelId}` : 'nammaAPI';
        const logo = PROVIDER_LOGOS[providerId] || PROVIDER_LOGOS.other;

        turn.innerHTML = `
            <div class="assistant-wrapper">
                <div class="assistant-meta-header">
                    <div class="assistant-identity">
                        <span>${logo}</span>
                        <span>${escapeHtml(modelLabel)}</span>
                    </div>
                    <div class="assistant-actions">
                        <button type="button" class="copy-text-btn" title="Copy text">Copy</button>
                    </div>
                </div>
                <div class="assistant-text-content">${parsed}</div>
            </div>
        `;

        const copyBtn = turn.querySelector('.copy-text-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyBtn.textContent = 'Copied';
                    setTimeout(() => copyBtn.textContent = 'Copy', 1600);
                });
            });
        }

        turn.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }

    messagesContainer.appendChild(turn);
    chatViewport.scrollTop = chatViewport.scrollHeight;
    return turn;
}

function appendThinkingRow() {
    const turn = document.createElement('div');
    turn.className = 'message-turn assistant';
    turn.innerHTML = `
        <div class="assistant-wrapper">
            <div class="thinking-box">
                <span class="thinking-pulse-dot"></span>
                <span>${escapeHtml(getModelDisplayName(activeModelId))} is thinking (${activeEffort} effort)...</span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(turn);
    chatViewport.scrollTop = chatViewport.scrollHeight;
    return turn;
}

function appendErrorRow(errorMsg) {
    const turn = document.createElement('div');
    turn.className = 'message-turn assistant';
    turn.innerHTML = `
        <div class="assistant-wrapper">
            <div class="error-box">
                <span class="error-title">Request unsuccessful</span>
                <span class="error-desc">${escapeHtml(errorMsg)}</span>
                <button type="button" class="error-retry-btn" onclick="openKeysModal('${activeProviderId}')">Configure ${activeProviderId.toUpperCase()} API key</button>
            </div>
        </div>
    `;
    messagesContainer.appendChild(turn);
    chatViewport.scrollTop = chatViewport.scrollHeight;
}

// ── KEYS CONFIGURATION MODAL ────────────────────────────

function openKeysModal(providerId) {
    setupKeysModal(providerId || activeProviderId);
    keysModal.classList.add('active');
}

function closeKeysModal() {
    keysModal.classList.remove('active');
}

function setupKeysModal(pid) {
    modalSelectedProvider = pid;
    if (!appConfig) return;

    // Build provider tabs with official logos
    keysProviderGrid.innerHTML = '';
    Object.keys(appConfig).forEach(k => {
        const p = appConfig[k];
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `keys-prov-chip ${k === pid ? 'active' : ''}`;
        chip.innerHTML = `
            <span>${PROVIDER_LOGOS[k] || PROVIDER_LOGOS.other}</span>
            <span>${escapeHtml(p.name.replace('Anthropic ', '').replace('Google ', '').replace('Meta ', '').replace('Alibaba ', ''))}</span>
        `;
        chip.addEventListener('click', () => {
            setupKeysModal(k);
        });
        keysProviderGrid.appendChild(chip);
    });

    const pData = appConfig[pid];
    modalKeyProviderTitle.textContent = pData.name;
    if (portalExternalLink) {
        portalExternalLink.href = pData.portal_url || 'https://console.anthropic.com/';
        portalExternalLink.textContent = `Get key from ${pData.name} console ↗`;
    }

    const existingKey = savedKeys[pid] || '';
    modalKeyInput.value = existingKey;
    keySavedBadge.classList.toggle('hidden', !existingKey);

    // Populate models list in keys modal
    keysModelsList.innerHTML = '';
    (pData.models || []).forEach((m, idx) => {
        const card = document.createElement('div');
        const isCurrent = m.id === activeModelId || idx === 0;
        card.className = `keys-model-card ${isCurrent ? 'active' : ''}`;
        card.innerHTML = `
            <span class="km-title">${escapeHtml(m.name)}</span>
            <span class="km-check">✓</span>
        `;
        if (isCurrent) modalSelectedModel = m.id;

        card.addEventListener('click', () => {
            $$('.keys-model-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            modalSelectedModel = m.id;
        });
        keysModelsList.appendChild(card);
    });
}

function saveKeysSettings() {
    const key = modalKeyInput.value.trim();
    if (key) {
        savedKeys[modalSelectedProvider] = key;
        localStorage.setItem('namma_api_keys', JSON.stringify(savedKeys));
    }

    activeModelId = modalSelectedModel;
    localStorage.setItem('namma_active_model', activeModelId);

    syncActiveState(modalSelectedProvider, activeModelId, activeEffort);
}

// ── BIND EVENT LISTENERS ────────────────────────────────

function bindEvents() {
    // Popover Trigger
    modelPopoverTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modelMenuPanel.classList.contains('hidden')) {
            openModelPopover();
        } else {
            closeModelPopover();
        }
    });

    composerModelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModelPopover();
    });

    // Search filter inside popover
    modelFilterInput.addEventListener('input', (e) => {
        buildModelListing(railSelectedProvider, e.target.value);
    });

    // Submenu Triggers
    effortTriggerRow.addEventListener('click', (e) => {
        e.stopPropagation();
        menuContentScroll.classList.add('hidden');
        effortSubmenu.classList.remove('hidden');
    });

    effortBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSubmenus();
    });

    // Effort selection
    $$('.submenu-item[data-effort]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const eff = item.dataset.effort;
            $$('.submenu-item[data-effort]').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            activeEffort = eff;
            localStorage.setItem('namma_active_effort', eff);
            syncActiveState(activeProviderId, activeModelId, activeEffort);
            closeModelPopover();
        });
    });

    moreModelsRow.addEventListener('click', (e) => {
        e.stopPropagation();
        menuContentScroll.classList.add('hidden');
        legacyModelsSubmenu.classList.remove('hidden');
    });

    legacyBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSubmenus();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!modelMenuPanel.contains(e.target) && !modelPopoverTrigger.contains(e.target) && !composerModelBtn.contains(e.target)) {
            closeModelPopover();
        }
    });

    // Prompt Chips
    $$('.chip-item').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            userInput.value = prompt;
            userInput.style.height = 'auto';
            submitBtn.disabled = false;
            userInput.focus();
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Input auto-grow & send
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

    // New conversation
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
        saveKeysSettings();
        closeKeysModal();
        if (pendingMessage) {
            sendMessage(pendingMessage);
            pendingMessage = null;
        }
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

    $$('.btn-copy').forEach(btn => {
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

    // Escape closes popover & modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModelPopover();
            closeKeysModal();
            shareModal.classList.remove('active');
        }
    });
}

function resetChat() {
    if (chatMemory.length > 0 && !confirm('Start a new conversation? Shared memory will be cleared.')) {
        return;
    }
    chatMemory = [];
    localStorage.removeItem('namma_chat_memory');
    messagesContainer.innerHTML = '';
    editorialHero.classList.remove('hidden');
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
