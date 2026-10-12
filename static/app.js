// nammaAPI - Multi-Model AI Hub with Cross-Model Shared Chat Memory
let appConfig = null;

// Application State
let activeProviderId = localStorage.getItem('namma_active_provider') || 'claude';
let activeModelId = localStorage.getItem('namma_active_model') || 'claude-3-5-sonnet-20241022';
let activeSubProvider = null;
let activeBaseUrl = localStorage.getItem('namma_active_base_url') || null;

// Saved API Keys in localStorage: { openai: '...', gemini: '...', claude: '...', other: '...' }
let savedKeys = JSON.parse(localStorage.getItem('namma_api_keys') || '{}');

// Chat Memory across all models: [ { role, content, model, provider, timestamp } ]
let chatMemory = JSON.parse(localStorage.getItem('namma_chat_memory') || '[]');

// DOM Elements
const configModal = document.getElementById('config-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');
const openConfigBtn = document.getElementById('open-config-btn');
const dockKeyBtn = document.getElementById('dock-key-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const openShareBtn = document.getElementById('open-share-btn');
const shareModal = document.getElementById('share-modal');
const shareModalCloseBtn = document.getElementById('share-modal-close-btn');
const shareModalDoneBtn = document.getElementById('share-modal-done-btn');
const publicShareInput = document.getElementById('public-share-input');
const lanShareInput = document.getElementById('lan-share-input');
const localShareInput = document.getElementById('local-share-input');

const navProvPills = document.querySelectorAll('.nav-prov-pill');
const navModelSelect = document.getElementById('nav-model-select');
const memoryCounterText = document.getElementById('memory-counter-text');
const dockActiveModel = document.getElementById('dock-active-model');
const navKeyLabel = document.getElementById('nav-key-label');

const modalTabBtns = document.querySelectorAll('.modal-provider-tabs .tab-btn');
const modalSubPlatformBox = document.getElementById('modal-sub-platform-box');
const modalSubPills = document.getElementById('modal-sub-pills');
const modalCustomUrlGroup = document.getElementById('modal-custom-url-group');
const modalCustomUrlInput = document.getElementById('modal-custom-url-input');
const modalModelsGrid = document.getElementById('modal-models-grid');
const modalCustomModelBox = document.getElementById('modal-custom-model-box');
const modalCustomModelInput = document.getElementById('modal-custom-model-input');
const modalApiKeyInput = document.getElementById('modal-api-key-input');
const modalKeyToggleBtn = document.getElementById('modal-key-toggle-btn');
const modalKeyProviderName = document.getElementById('modal-key-provider-name');
const modalKeySavedBadge = document.getElementById('modal-key-saved-badge');

const chatStream = document.getElementById('chat-stream');
const emptyState = document.getElementById('empty-state');
const messagesList = document.getElementById('messages-list');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');

// Pending query to send after key is configured
let pendingMessage = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        appConfig = data.providers;
    } catch (err) {
        console.error('Failed to load configuration:', err);
    }

    // Initialize UI with active provider and models
    syncActiveProvider(activeProviderId, false);
    renderSavedChatMemory();
    updateMemoryBadge();
    fetchShareInfo();
    bindEvents();
});

async function fetchShareInfo() {
    try {
        const res = await fetch('/api/share-info');
        const info = await res.json();
        if (info.public_url && publicShareInput) publicShareInput.value = info.public_url;
        if (info.lan_url && lanShareInput) lanShareInput.value = info.lan_url;
        if (info.localhost_url && localShareInput) localShareInput.value = info.localhost_url;
    } catch (err) {
        console.warn('Could not refresh share info:', err);
    }
}

// --- EVENT HANDLERS ---
function bindEvents() {
    // Modal open & close
    openConfigBtn.addEventListener('click', () => openModal(activeProviderId));
    dockKeyBtn.addEventListener('click', () => openModal(activeProviderId));

    // ALWAYS close modal when 'X' or 'Cancel' is clicked
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);

    // Backdrop click closes modal
    configModal.addEventListener('click', (e) => {
        if (e.target === configModal) closeModal();
    });

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && configModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Navbar provider pills
    navProvPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const pid = pill.dataset.providerId;
            syncActiveProvider(pid, true);
        });
    });

    // Share Modal open & close
    if (openShareBtn) {
        openShareBtn.addEventListener('click', () => {
            fetchShareInfo();
            shareModal.classList.add('active');
        });
    }

    if (shareModalCloseBtn) {
        shareModalCloseBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    }

    if (shareModalDoneBtn) {
        shareModalDoneBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    }

    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) shareModal.classList.remove('active');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (shareModal && shareModal.classList.contains('active')) {
                shareModal.classList.remove('active');
            }
        }
    });

    // Share link copy buttons
    document.querySelectorAll('.channel-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.dataset.inputId;
            const inputEl = document.getElementById(inputId);
            if (inputEl) {
                inputEl.select();
                navigator.clipboard.writeText(inputEl.value).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('copied');
                    }, 2000);
                }).catch(() => {
                    document.execCommand('copy');
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                        btn.classList.remove('copied');
                    }, 2000);
                });
            }
        });
    });

    // Navbar model dropdown change
    navModelSelect.addEventListener('change', () => {
        activeModelId = navModelSelect.value;
        localStorage.setItem('namma_active_model', activeModelId);
        updateDockMeta();
    });

    // Modal provider tab change
    modalTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pid = btn.dataset.providerId;
            setupModalForProvider(pid);
        });
    });

    // Modal key visibility toggle
    modalKeyToggleBtn.addEventListener('click', () => {
        const isPass = modalApiKeyInput.type === 'password';
        modalApiKeyInput.type = isPass ? 'text' : 'password';
    });

    // Modal Save & Apply button
    modalSaveBtn.addEventListener('click', () => {
        saveModalSettings();
        closeModal();
        if (pendingMessage) {
            sendMessage(pendingMessage);
            pendingMessage = null;
        }
    });

    // New Chat / Clear Memory
    newChatBtn.addEventListener('click', () => {
        if (chatMemory.length > 0 && !confirm('Start a new chat? Shared memory for this conversation will be cleared.')) {
            return;
        }
        chatMemory = [];
        localStorage.removeItem('namma_chat_memory');
        messagesList.innerHTML = '';
        emptyState.classList.remove('hidden');
        updateMemoryBadge();
    });

    // Suggestion chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            userInput.value = prompt;
            userInput.style.height = 'auto';
            submitBtn.disabled = false;
            userInput.focus();
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Input auto-expand & send
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 140)}px`;
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
        if (!text) return;
        sendMessage(text);
    });
}

function openModal(providerId) {
    setupModalForProvider(providerId || activeProviderId);
    configModal.classList.add('active');
}

function closeModal() {
    configModal.classList.remove('active');
}

// --- PROVIDER & MODEL SYNCHRONIZATION ---
function syncActiveProvider(pid, autoSelectFirstModel = false) {
    activeProviderId = pid;
    localStorage.setItem('namma_active_provider', pid);

    // Update navbar provider pills
    navProvPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.providerId === pid);
    });

    if (!appConfig) return;

    const keyMap = { "openai": "1", "gemini": "2", "claude": "3", "other": "4" };
    const pData = appConfig[keyMap[pid]];

    // Populate navbar model dropdown
    navModelSelect.innerHTML = '';
    let models = [];

    if (pid === 'other') {
        const sub = pData.sub_providers["1"]; // Default to DeepSeek
        activeSubProvider = sub;
        activeBaseUrl = sub.base_url;
        models = sub.models || [];
    } else {
        models = pData.models || [];
    }

    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.id})`;
        navModelSelect.appendChild(opt);
    });

    // Add Custom Model option
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '✏️ Custom Model...';
    navModelSelect.appendChild(customOpt);

    // Set active model
    const hasModel = models.some(m => m.id === activeModelId);
    if (autoSelectFirstModel || !hasModel) {
        activeModelId = models.length > 0 ? models[0].id : 'custom';
        localStorage.setItem('namma_active_model', activeModelId);
    }
    navModelSelect.value = activeModelId;

    updateDockMeta();
    updateKeyNavBadge();
}

function updateDockMeta() {
    dockActiveModel.textContent = activeModelId;
}

function updateKeyNavBadge() {
    const key = savedKeys[activeProviderId];
    if (key && key.trim()) {
        navKeyLabel.textContent = 'Key: Configured';
        navKeyLabel.parentElement.classList.add('configured');
    } else {
        navKeyLabel.textContent = 'Add API Key';
        navKeyLabel.parentElement.classList.remove('configured');
    }
}

function updateMemoryBadge() {
    const count = chatMemory.length;
    memoryCounterText.textContent = `Memory: Shared (${count} msg${count === 1 ? '' : 's'})`;
    const dot = document.querySelector('.memory-dot');
    if (dot) {
        dot.classList.toggle('has-memory', count > 0);
    }
}

// --- MODAL CONFIGURATION SETUP ---
let modalSelectedProvider = 'claude';
let modalSelectedModel = 'claude-3-5-sonnet-20241022';
let modalSelectedBaseUrl = null;

function setupModalForProvider(pid) {
    modalSelectedProvider = pid;

    // Tabs
    modalTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.providerId === pid);
    });

    if (!appConfig) return;

    const keyMap = { "openai": "1", "gemini": "2", "claude": "3", "other": "4" };
    const pData = appConfig[keyMap[pid]];

    modalKeyProviderName.textContent = pData.name;

    // API Key field
    const existingKey = savedKeys[pid] || '';
    modalApiKeyInput.value = existingKey;

    const placeholders = {
        "claude": "sk-ant-api03-...",
        "openai": "sk-proj-...",
        "gemini": "AIzaSy...",
        "other": "sk-..."
    };
    modalApiKeyInput.placeholder = placeholders[pid] || "Enter API key...";
    modalKeySavedBadge.classList.toggle('hidden', !existingKey);

    // Models list
    if (pid === 'other') {
        modalSubPlatformBox.classList.remove('hidden');
        renderModalSubPlatforms(pData.sub_providers);
    } else {
        modalSubPlatformBox.classList.add('hidden');
        renderModalModels(pData.models, pData.name);
    }
}

function renderModalSubPlatforms(subProviders) {
    modalSubPills.innerHTML = '';
    const keys = Object.keys(subProviders);

    keys.forEach((k, idx) => {
        const sp = subProviders[k];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `sub-pill ${idx === 0 ? 'active' : ''}`;
        btn.textContent = sp.name;

        btn.addEventListener('click', () => {
            document.querySelectorAll('#modal-sub-pills .sub-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            modalSelectedBaseUrl = sp.base_url;

            if (sp.base_url === 'custom') {
                modalCustomUrlGroup.classList.remove('hidden');
                modalSelectedBaseUrl = modalCustomUrlInput.value.trim() || 'http://localhost:11434/v1/chat/completions';
            } else {
                modalCustomUrlGroup.classList.add('hidden');
            }

            renderModalModels(sp.models || [], sp.name);
        });

        modalSubPills.appendChild(btn);
    });

    if (keys.length > 0) {
        modalSelectedBaseUrl = subProviders[keys[0]].base_url;
        renderModalModels(subProviders[keys[0]].models || [], subProviders[keys[0]].name);
    }
}

function renderModalModels(models, providerName) {
    modalModelsGrid.innerHTML = '';
    modalCustomModelBox.classList.add('hidden');

    models.forEach((m, idx) => {
        const item = document.createElement('div');
        const isCurrent = m.id === activeModelId || idx === 0;
        item.className = `modal-model-card ${isCurrent ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="card-meta">
                <strong>${m.name}</strong>
                <span>${m.desc}</span>
            </div>
            <div class="check-circle">✓</div>
        `;

        if (isCurrent) {
            modalSelectedModel = m.id;
        }

        item.addEventListener('click', () => {
            document.querySelectorAll('.modal-model-card').forEach(c => c.classList.remove('selected'));
            item.classList.add('selected');
            modalSelectedModel = m.id;
            modalCustomModelBox.classList.add('hidden');
        });

        modalModelsGrid.appendChild(item);
    });

    // Custom model card
    const customItem = document.createElement('div');
    customItem.className = 'modal-model-card full-span';
    customItem.innerHTML = `
        <div class="card-meta">
            <strong>Custom Model</strong>
            <span>Enter any specific model identifier</span>
        </div>
        <div class="check-circle">✓</div>
    `;

    customItem.addEventListener('click', () => {
        document.querySelectorAll('.modal-model-card').forEach(c => c.classList.remove('selected'));
        customItem.classList.add('selected');
        modalCustomModelBox.classList.remove('hidden');
        modalSelectedModel = modalCustomModelInput.value.trim() || 'custom';
    });

    modalModelsGrid.appendChild(customItem);
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

    syncActiveProvider(modalSelectedProvider, false);
}

// --- CHAT & PERSISTENT SHARED MEMORY ---
function renderSavedChatMemory() {
    if (!chatMemory || chatMemory.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    messagesList.innerHTML = '';

    chatMemory.forEach(msg => {
        appendMessageBubble(msg.role, msg.content, msg.model, msg.provider);
    });
}

async function sendMessage(text) {
    const key = savedKeys[activeProviderId];

    // Check if key is available
    if (!key || !key.trim()) {
        pendingMessage = text;
        openModal(activeProviderId);
        return;
    }

    emptyState.classList.add('hidden');
    userInput.value = '';
    userInput.style.height = 'auto';
    submitBtn.disabled = true;

    // 1. Append User Message
    const userMsgObj = {
        role: 'user',
        content: text,
        model: null,
        provider: null,
        timestamp: Date.now()
    };
    appendMessageBubble('user', text);
    chatMemory.push(userMsgObj);
    localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
    updateMemoryBadge();

    // 2. Append Thinking Row
    const thinkingRow = appendThinkingBubble();

    // 3. Prepare payload with full cross-model chat memory!
    // Format message history for standard AI client
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
            const aiMsgObj = {
                role: 'assistant',
                content: data.reply,
                model: activeModelId,
                provider: activeProviderId,
                timestamp: Date.now()
            };
            appendMessageBubble('assistant', data.reply, activeModelId, activeProviderId);
            chatMemory.push(aiMsgObj);
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryBadge();
        } else {
            const errorMsg = data.error || 'Failed to receive response from provider.';
            appendErrorBubble(errorMsg);
            // Remove user message from memory if request failed
            chatMemory.pop();
            localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
            updateMemoryBadge();
        }
    } catch (err) {
        thinkingRow.remove();
        appendErrorBubble(`Network error: ${err.message}`);
        chatMemory.pop();
        localStorage.setItem('namma_chat_memory', JSON.stringify(chatMemory));
        updateMemoryBadge();
    } finally {
        submitBtn.disabled = !userInput.value.trim();
        userInput.focus();
    }
}

function appendMessageBubble(role, content, modelId = null, providerId = null) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    if (role === 'user') {
        row.innerHTML = `
            <div class="user-bubble">${escapeHtml(content)}</div>
        `;
    } else {
        const parsed = marked.parse(content);
        const provIcons = { claude: '🧠 Claude', gemini: '✨ Gemini', openai: '⚡ OpenAI', other: '🚀 Model' };
        const provTag = provIcons[providerId] || 'AI';
        const modelLabel = modelId ? `${provTag} · ${modelId}` : 'nammaAPI';

        row.innerHTML = `
            <div class="ai-avatar">AI</div>
            <div class="ai-bubble-container">
                <div class="model-badge-tag">${escapeHtml(modelLabel)}</div>
                <div class="ai-bubble">${parsed}</div>
            </div>
        `;

        // Highlight code blocks
        row.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }

    messagesList.appendChild(row);
    chatStream.scrollTop = chatStream.scrollHeight;
    return row;
}

function appendThinkingBubble() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `
        <div class="ai-avatar">AI</div>
        <div class="ai-bubble-container">
            <div class="model-badge-tag">${escapeHtml(activeModelId)}</div>
            <div class="ai-bubble thinking-bubble">
                <span class="pulsing-text">Thinking with shared memory context...</span>
            </div>
        </div>
    `;
    messagesList.appendChild(row);
    chatStream.scrollTop = chatStream.scrollHeight;
    return row;
}

function appendErrorBubble(errMsg) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `
        <div class="ai-avatar error-avatar">!</div>
        <div class="ai-bubble-container">
            <div class="ai-bubble error-bubble">
                <strong>API Request Failed</strong>
                <p>${escapeHtml(errMsg)}</p>
                <button type="button" class="error-action-btn" onclick="openModal('${activeProviderId}')">
                    Update ${activeProviderId.toUpperCase()} API Key
                </button>
            </div>
        </div>
    `;
    messagesList.appendChild(row);
    chatStream.scrollTop = chatStream.scrollHeight;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
