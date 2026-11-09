// nammaAPI — Multi-Model AI Chat with Shared Memory

let appConfig = null;

// State
let activeProviderId = localStorage.getItem('namma_active_provider') || 'claude';
let activeModelId = localStorage.getItem('namma_active_model') || 'claude-3-5-sonnet-20241022';
let activeSubProvider = null;
let activeBaseUrl = localStorage.getItem('namma_active_base_url') || null;
let savedKeys = JSON.parse(localStorage.getItem('namma_api_keys') || '{}');
let chatMemory = JSON.parse(localStorage.getItem('namma_chat_memory') || '[]');
let pendingMessage = null;

// DOM
const $ = (s) => document.getElementById(s);
const $$ = (s) => document.querySelectorAll(s);

const configModal = $('config-modal');
const shareModal = $('share-modal');
const chatScroll = $('chat-scroll');
const emptyState = $('empty-state');
const messagesList = $('messages-list');
const chatForm = $('chat-form');
const userInput = $('user-input');
const submitBtn = $('submit-btn');
const navModelSelect = $('nav-model-select');
const memoryDot = $('memory-dot');
const memoryCounterText = $('memory-counter-text');
const dockActiveModel = $('dock-active-model');
const dockMemoryStatus = $('dock-memory-status');

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

// Modal state
let modalSelectedProvider = 'claude';
let modalSelectedModel = 'claude-3-5-sonnet-20241022';
let modalSelectedBaseUrl = null;

// ── Init ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        appConfig = data.providers;
    } catch (e) {
        console.error('Config load failed:', e);
    }

    syncProvider(activeProviderId, false);
    renderMemory();
    updateMemoryBadge();
    fetchShareInfo();
    bind();
});

async function fetchShareInfo() {
    try {
        const res = await fetch('/api/share-info');
        const info = await res.json();
        const pub = $('public-share-input');
        const lan = $('lan-share-input');
        const loc = $('local-share-input');
        if (info.public_url && pub) pub.value = info.public_url;
        if (info.lan_url && lan) lan.value = info.lan_url;
        if (info.localhost_url && loc) loc.value = info.localhost_url;
    } catch (e) {
        console.warn('Share info unavailable:', e);
    }
}

// ── Events ──────────────────────────────────────

function bind() {
    // Config modal
    $('open-config-btn').addEventListener('click', () => openModal(activeProviderId));
    $('dock-key-btn').addEventListener('click', () => openModal(activeProviderId));
    $('modal-close-btn').addEventListener('click', closeModal);
    $('modal-cancel-btn').addEventListener('click', closeModal);
    $('modal-save-btn').addEventListener('click', () => {
        saveModal();
        closeModal();
        if (pendingMessage) {
            sendMessage(pendingMessage);
            pendingMessage = null;
        }
    });
    configModal.addEventListener('click', (e) => { if (e.target === configModal) closeModal(); });

    // Share modal
    $('open-share-btn').addEventListener('click', () => { fetchShareInfo(); shareModal.classList.add('open'); });
    $('share-modal-close-btn').addEventListener('click', () => shareModal.classList.remove('open'));
    $('share-modal-done-btn').addEventListener('click', () => shareModal.classList.remove('open'));
    shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.remove('open'); });

    // Escape closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (configModal.classList.contains('open')) closeModal();
            if (shareModal.classList.contains('open')) shareModal.classList.remove('open');
        }
    });

    // Copy buttons
    $$('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = $(btn.dataset.inputId);
            if (!input) return;
            navigator.clipboard.writeText(input.value).then(() => {
                btn.textContent = 'Copied';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
            }).catch(() => {
                input.select();
                document.execCommand('copy');
                btn.textContent = 'Copied';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
            });
        });
    });

    // Provider segmented control
    $$('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => syncProvider(btn.dataset.providerId, true));
    });

    // Model dropdown
    navModelSelect.addEventListener('change', () => {
        activeModelId = navModelSelect.value;
        localStorage.setItem('namma_active_model', activeModelId);
        updateDock();
    });

    // Modal provider tabs
    $$('.tab-item').forEach(btn => {
        btn.addEventListener('click', () => setupModalFor(btn.dataset.providerId));
    });

    // Key toggle
    modalKeyToggleBtn.addEventListener('click', () => {
        modalApiKeyInput.type = modalApiKeyInput.type === 'password' ? 'text' : 'password';
    });

    // New chat
    $('new-chat-btn').addEventListener('click', () => {
        if (chatMemory.length > 0 && !confirm('Clear conversation and memory?')) return;
        chatMemory = [];
        localStorage.removeItem('namma_chat_memory');
        messagesList.innerHTML = '';
        emptyState.classList.remove('hidden');
        updateMemoryBadge();
    });

    // Suggestions
    $$('.suggestion').forEach(s => {
        s.addEventListener('click', () => {
            userInput.value = s.dataset.prompt;
            userInput.style.height = 'auto';
            submitBtn.disabled = false;
            userInput.focus();
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 140)}px`;
        submitBtn.disabled = !userInput.value.trim();
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!submitBtn.disabled) chatForm.dispatchEvent(new Event('submit'));
        }
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (text) sendMessage(text);
    });
}

// ── Modal ───────────────────────────────────────

function openModal(pid) {
    setupModalFor(pid || activeProviderId);
    configModal.classList.add('open');
}

function closeModal() {
    configModal.classList.remove('open');
}

function setupModalFor(pid) {
    modalSelectedProvider = pid;

    $$('.tab-item').forEach(b => b.classList.toggle('active', b.dataset.providerId === pid));

    if (!appConfig) return;

    const keyMap = { openai: '1', gemini: '2', claude: '3', other: '4' };
    const pData = appConfig[keyMap[pid]];

    modalKeyProviderName.textContent = pData.name;

    const existing = savedKeys[pid] || '';
    modalApiKeyInput.value = existing;
    modalKeySavedBadge.classList.toggle('hidden', !existing);

    const placeholders = { claude: 'sk-ant-api03-…', openai: 'sk-proj-…', gemini: 'AIzaSy…', other: 'sk-…' };
    modalApiKeyInput.placeholder = placeholders[pid] || 'Enter API key…';

    if (pid === 'other') {
        modalSubPlatformBox.classList.remove('hidden');
        renderSubPlatforms(pData.sub_providers);
    } else {
        modalSubPlatformBox.classList.add('hidden');
        renderModels(pData.models, pData.name);
    }
}

function renderSubPlatforms(subs) {
    modalSubPills.innerHTML = '';
    const keys = Object.keys(subs);

    keys.forEach((k, i) => {
        const sp = subs[k];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pill-btn${i === 0 ? ' active' : ''}`;
        btn.textContent = sp.name;

        btn.addEventListener('click', () => {
            $$('#modal-sub-pills .pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            modalSelectedBaseUrl = sp.base_url;

            if (sp.base_url === 'custom') {
                modalCustomUrlGroup.classList.remove('hidden');
                modalSelectedBaseUrl = modalCustomUrlInput.value.trim() || 'http://localhost:11434/v1/chat/completions';
            } else {
                modalCustomUrlGroup.classList.add('hidden');
            }

            renderModels(sp.models || [], sp.name);
        });

        modalSubPills.appendChild(btn);
    });

    if (keys.length > 0) {
        modalSelectedBaseUrl = subs[keys[0]].base_url;
        renderModels(subs[keys[0]].models || [], subs[keys[0]].name);
    }
}

function renderModels(models) {
    modalModelsGrid.innerHTML = '';
    modalCustomModelBox.classList.add('hidden');

    models.forEach((m, i) => {
        const card = document.createElement('div');
        const isCurrent = m.id === activeModelId || i === 0;
        card.className = `model-card${isCurrent ? ' selected' : ''}`;
        card.innerHTML = `
            <div class="model-card-info">
                <strong>${esc(m.name)}</strong>
                <span>${esc(m.desc)}</span>
            </div>
            <span class="model-check">✓</span>
        `;

        if (isCurrent) modalSelectedModel = m.id;

        card.addEventListener('click', () => {
            $$('.model-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            modalSelectedModel = m.id;
            modalCustomModelBox.classList.add('hidden');
        });

        modalModelsGrid.appendChild(card);
    });

    // Custom option
    const custom = document.createElement('div');
    custom.className = 'model-card full';
    custom.innerHTML = `
        <div class="model-card-info">
            <strong>Custom model</strong>
            <span>Enter any model identifier</span>
        </div>
        <span class="model-check">✓</span>
    `;
    custom.addEventListener('click', () => {
        $$('.model-card').forEach(c => c.classList.remove('selected'));
        custom.classList.add('selected');
        modalCustomModelBox.classList.remove('hidden');
        modalSelectedModel = modalCustomModelInput.value.trim() || 'custom';
    });
    modalModelsGrid.appendChild(custom);
}

function saveModal() {
    const key = modalApiKeyInput.value.trim();
    if (key) {
        savedKeys[modalSelectedProvider] = key;
        localStorage.setItem('namma_api_keys', JSON.stringify(savedKeys));
    }

    if (modalCustomModelBox && !modalCustomModelBox.classList.contains('hidden')) {
        const v = modalCustomModelInput.value.trim();
        if (v) modalSelectedModel = v;
    }

    activeModelId = modalSelectedModel;
    localStorage.setItem('namma_active_model', activeModelId);

    if (modalSelectedBaseUrl) {
        activeBaseUrl = modalSelectedBaseUrl;
        localStorage.setItem('namma_active_base_url', activeBaseUrl);
    }

    syncProvider(modalSelectedProvider, false);
}

// ── Provider Sync ───────────────────────────────

function syncProvider(pid, autoFirst = false) {
    activeProviderId = pid;
    localStorage.setItem('namma_active_provider', pid);

    $$('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.providerId === pid));

    if (!appConfig) return;

    const keyMap = { openai: '1', gemini: '2', claude: '3', other: '4' };
    const pData = appConfig[keyMap[pid]];

    navModelSelect.innerHTML = '';
    let models = [];

    if (pid === 'other') {
        const sub = pData.sub_providers['1'];
        activeSubProvider = sub;
        activeBaseUrl = sub.base_url;
        models = sub.models || [];
    } else {
        models = pData.models || [];
    }

    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        navModelSelect.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom…';
    navModelSelect.appendChild(customOpt);

    const hasModel = models.some(m => m.id === activeModelId);
    if (autoFirst || !hasModel) {
        activeModelId = models.length > 0 ? models[0].id : 'custom';
        localStorage.setItem('namma_active_model', activeModelId);
    }
    navModelSelect.value = activeModelId;

    updateDock();
    updateKeyIndicator();
}

function updateDock() {
    dockActiveModel.textContent = activeModelId;
}

function updateKeyIndicator() {
    const btn = $('open-config-btn');
    const key = savedKeys[activeProviderId];
    btn.classList.toggle('has-key', !!(key && key.trim()));
}

function updateMemoryBadge() {
    const n = chatMemory.length;
    memoryCounterText.textContent = `${n} msg${n === 1 ? '' : 's'}`;
    memoryDot.classList.toggle('active', n > 0);
    dockMemoryStatus.textContent = n > 0 ? `${n} messages` : 'shared';
}

// ── Chat ────────────────────────────────────────

function renderMemory() {
    if (!chatMemory || chatMemory.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    messagesList.innerHTML = '';
    chatMemory.forEach(m => addBubble(m.role, m.content, m.model, m.provider));
}

async function sendMessage(text) {
    const key = savedKeys[activeProviderId];
    if (!key || !key.trim()) {
        pendingMessage = text;
        openModal(activeProviderId);
        return;
    }

    emptyState.classList.add('hidden');
    userInput.value = '';
    userInput.style.height = 'auto';
    submitBtn.disabled = true;

    // User message
    chatMemory.push({ role: 'user', content: text, model: null, provider: null, timestamp: Date.now() });
    addBubble('user', text);
    localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
    updateMemoryBadge();

    // Thinking indicator
    const thinking = addThinking();

    const apiMessages = chatMemory.map(m => ({ role: m.role, content: m.content }));

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider_id: activeProviderId,
                model_id: activeModelId,
                api_key: key,
                base_url: activeBaseUrl,
                messages: apiMessages
            })
        });

        const data = await res.json();
        thinking.remove();

        if (res.ok && data.success) {
            chatMemory.push({ role: 'assistant', content: data.reply, model: activeModelId, provider: activeProviderId, timestamp: Date.now() });
            addBubble('assistant', data.reply, activeModelId, activeProviderId);
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryBadge();
        } else {
            addError(data.error || 'Failed to get a response.');
            chatMemory.pop();
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryBadge();
        }
    } catch (err) {
        thinking.remove();
        addError(`Network error: ${err.message}`);
        chatMemory.pop();
        localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
        updateMemoryBadge();
    } finally {
        submitBtn.disabled = !userInput.value.trim();
        userInput.focus();
    }
}

function addBubble(role, content, modelId = null, providerId = null) {
    const row = document.createElement('div');
    row.className = `msg-row ${role}`;

    if (role === 'user') {
        row.innerHTML = `<div class="user-bubble">${esc(content)}</div>`;
    } else {
        const parsed = marked.parse(content);
        const labels = { claude: 'Claude', gemini: 'Gemini', openai: 'OpenAI', other: 'Model' };
        const label = modelId ? `${labels[providerId] || 'AI'} · ${modelId}` : 'nammaAPI';

        row.innerHTML = `
            <div class="ai-col">
                <span class="msg-meta">${esc(label)}</span>
                <div class="ai-bubble">${parsed}</div>
            </div>
        `;
        row.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }

    messagesList.appendChild(row);
    chatScroll.scrollTop = chatScroll.scrollHeight;
    return row;
}

function addThinking() {
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.innerHTML = `
        <div class="ai-col">
            <span class="msg-meta">${esc(activeModelId)}</span>
            <div class="ai-bubble thinking-bubble">
                <span class="pulsing">Thinking…</span>
            </div>
        </div>
    `;
    messagesList.appendChild(row);
    chatScroll.scrollTop = chatScroll.scrollHeight;
    return row;
}

function addError(msg) {
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.innerHTML = `
        <div class="ai-col">
            <div class="ai-bubble error-bubble">
                <div class="error-label">Request failed</div>
                <div class="error-detail">${esc(msg)}</div>
                <button type="button" class="error-action" onclick="openModal('${activeProviderId}')">Update API key</button>
            </div>
        </div>
    `;
    messagesList.appendChild(row);
    chatScroll.scrollTop = chatScroll.scrollHeight;
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
