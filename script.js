// 状態管理
let contractStatus = 'negotiating'; // negotiating, editing, locked, awaiting_my_signer, my_signer_signed, concluded
let isAgreed = false;

// ロール管理（交渉者 or 署名者）
let currentUserRole = 'member'; // 'member' (交渉者) | 'signer' (署名者)

// ============================================
// マルチ署名者データモデル
// ============================================
const PARTY_LABELS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'];
const SIGNER_COLORS = ['#4361ee', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

let signers = [
    { id: 'signer_1', party: '甲', name: '佐藤 一郎', company: '株式会社ABC',
      type: 'self', email: '', method: 'text', allowForward: true,
      stampPlacement: null, placedStampEl: null, color: '#4361ee',
      signatureData: null, signedAt: null },
    { id: 'signer_2', party: '乙', name: '田中 太郎', company: '株式会社XYZ',
      type: 'send', email: 'tanaka@xyz.co.jp', method: 'text', allowForward: true,
      stampPlacement: null, placedStampEl: null, color: '#e74c3c',
      signatureData: null, signedAt: null }
];

let activeDragSignerId = null;
let activeConfigSignerId = 'signer_1';
let nextSignerId = 3;
let signingFlow = 'relay'; // 'relay' (順次署名) | 'parallel' (一括送信)

// 署名者ヘルパー関数
function getSignerById(id) { return signers.find(s => s.id === id); }
function getSignerIndex(id) { return signers.findIndex(s => s.id === id); }
function getNextPartyLabel() { return PARTY_LABELS[signers.length] || '第' + (signers.length + 1); }
function getSignerColor(index) { return SIGNER_COLORS[index % SIGNER_COLORS.length]; }
function generateSignerId() { return 'signer_' + (nextSignerId++); }

// 後方互換: 旧コードが参照する可能性のある変数
let signingData = { mySignature: null, partnerSignature: null, mySignedAt: null, partnerSignedAt: null };
let forwardingData = { mySignerName: null, mySignerEmail: null, mySignerCompany: null, myForwardedAt: null, message: null, signMethod: null };
let selectedText = '';
let currentCommentThread = null;
let compareMode = false;
let selectedVersions = [];

// ウィザード状態管理
let wizardCurrentStep = 1;
let wizardFiles = [];
let wizardInviteEmails = []; // { email: string }[]

// 署名スタンプ ドラッグ&ドロップ（マルチ署名者: 個別配置はsigners[]内で管理）
let isDraggingStamp = false;
let isRepositioning = false;

// デモ用コメントデータ
const commentThreads = {
    1: {
        reference: '金48万円',
        comments: [
            { name: '田中太郎', avatar: '田', avatarClass: 'avatar-them', time: '1月28日 10:30', text: '当初45万円でご提案いただいていましたが、48万円への増額は可能でしょうか？' },
            { name: 'あなた', avatar: '佐', avatarClass: 'avatar-me', time: '1月28日 11:20', text: '承知しました。48万円で問題ございません。修正いたします。' }
        ]
    },
    2: {
        reference: '毎月末日締め、翌月末日払い',
        comments: [
            { name: '田中太郎', avatar: '田', avatarClass: 'avatar-them', time: '1月28日 14:00', text: '弊社の経理処理の都合上、この支払いサイクルでお願いできると助かります。' }
        ]
    },
    3: {
        reference: '本契約終了後3年間',
        comments: [
            { name: 'あなた', avatar: '佐', avatarClass: 'avatar-me', time: '1月29日 09:15', text: '秘密保持期間は3年間で設定しております。業界標準的な期間ですが、ご要望があれば調整可能です。' }
        ]
    }
};

// メインタブ切り替え
function switchMainTab(tabId) {
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.main-tab').classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// 契約書サブタブ切り替え
function switchContractSubtab(subtabId) {
    document.querySelectorAll('.contract-subtab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    if (subtabId === 'individual-a') {
        alert('個別契約(案件A)を表示します。');
    }
}

// 新しい契約を追加
function addNewContract() {
    const contractName = prompt('新しい契約の名前を入力してください\n(例: 個別契約(案件C)、保守契約 など)');
    if (contractName) {
        const subtabs = document.querySelector('.contract-subtabs');
        const addBtn = document.querySelector('.add-contract-subtab');

        const newTab = document.createElement('button');
        newTab.className = 'contract-subtab';
        newTab.innerHTML = `<span class="material-symbols-outlined icon-xs">description</span> ${contractName}`;
        newTab.onclick = function() { switchContractSubtab('new'); };

        subtabs.insertBefore(newTab, addBtn);
        alert(`「${contractName}」を作成しました!`);
    }
}

// アップロードモーダル
function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('uploadModal').classList.remove('active');
    }
}

// ドラッグ&ドロップ処理
function handleDragOver(event) {
    event.preventDefault();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(event) {
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        closeUploadModal();
        // 差分確認モーダルを開く
        setTimeout(() => {
            openDiffModal();
        }, 300);
    } else {
        alert('Wordファイル(.docx, .doc)を選択してください。');
    }
}

// 差分確認モーダル
function openDiffModal() {
    document.getElementById('diffModal').classList.add('active');
}

function closeDiffModal(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('diffModal').classList.remove('active');
    }
}

function applyChanges() {
    closeDiffModal();
    alert('変更を反映しました!');
}

// Wordダウンロード
function downloadWord() {
    alert('契約書をWordファイルとしてダウンロードします。\n\n(実際のアプリではファイルのダウンロードが開始されます)');
}

// ============================================
// 電子署名機能
// ============================================

// ヘッダーボタンクリック — ロールに応じて分岐
function handleSignButtonClick() {
    if (currentUserRole === 'signer') {
        openSignPage();   // 署名者用の独立ページを開く
    } else {
        openSigningCeremony();     // 編集者用フルスクリーン設定モーダル
    }
}

// ヘッダーボタンの表示をロールに応じて更新
function updateSignButtonForRole() {
    const signBtn = document.getElementById('signBtn');
    if (!signBtn) return;

    if (currentUserRole === 'signer') {
        signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">draw</span> 署名する';
    } else {
        signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">draw</span> 署名手続き・設定';
    }
}

// ============================================
// Step 2: 署名者リスト管理
// ============================================

function switchSigningFlow(flow) {
    signingFlow = flow;
    renderSignerCards();
}

function renderSignerCards() {
    const container = document.getElementById('signerList');
    if (!container) return;
    container.innerHTML = '';

    // 送付スタイル切替UI
    const flowSelector = document.createElement('div');
    flowSelector.className = 'signing-flow-selector';
    flowSelector.innerHTML = `
        <div class="signing-flow-label">署名の流れ</div>
        <div class="signing-flow-options">
            <button class="signing-flow-card ${signingFlow === 'relay' ? 'active' : ''}" onclick="switchSigningFlow('relay')">
                <div class="flow-card-visual">
                    <span class="flow-dot" style="background:#4361ee;">甲</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-dot" style="background:#e74c3c;">乙</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-dot" style="background:#2ecc71;">丙</span>
                </div>
                <div class="flow-card-title">順番に署名</div>
                <div class="flow-card-desc">前の人が署名してから次の人へ</div>
            </button>
            <button class="signing-flow-card ${signingFlow === 'parallel' ? 'active' : ''}" onclick="switchSigningFlow('parallel')">
                <div class="flow-card-visual">
                    <span class="flow-dot" style="background:#4361ee;">甲</span>
                    <span class="flow-dot" style="background:#e74c3c;">乙</span>
                    <span class="flow-dot" style="background:#2ecc71;">丙</span>
                </div>
                <div class="flow-card-title">一斉に署名</div>
                <div class="flow-card-desc">全員に同時に送付</div>
            </button>
        </div>
    `;
    container.appendChild(flowSelector);

    signers.forEach((signer, index) => {
        const card = document.createElement('div');
        card.className = 'signer-card';
        card.dataset.signerId = signer.id;
        card.style.borderLeftColor = signer.color;

        const typeChecked = (t) => signer.type === t ? 'checked' : '';
        const emailDisplay = signer.type === 'send' ? 'block' : 'none';
        const canRemove = signers.length > 1;

        const orderBadge = signingFlow === 'relay'
            ? `<div class="signer-order-badge" style="background: ${signer.color};">${index + 1}</div>`
            : '';

        card.innerHTML = `
            <div class="signer-card-header">
                ${orderBadge}
                <div class="signer-party-badge" style="background: ${signer.color};">${signer.party}</div>
                <div class="signer-card-info">
                    <input type="text" class="signer-name-input" value="${escapeHtml(signer.name)}"
                           onchange="updateSignerField('${signer.id}', 'name', this.value)">
                    <input type="text" class="signer-company-input" value="${escapeHtml(signer.company)}"
                           onchange="updateSignerField('${signer.id}', 'company', this.value)">
                </div>
                ${canRemove ? `<button class="signer-remove-btn" onclick="removeSigner('${signer.id}')" title="削除">
                    <span class="material-symbols-outlined icon-sm">close</span>
                </button>` : ''}
            </div>
            <div class="signer-card-body">
                <div class="signer-type-selector">
                    <label class="signer-type-option">
                        <input type="radio" name="signerType_${signer.id}" value="self" ${typeChecked('self')}
                               onchange="updateSignerType('${signer.id}', 'self')">
                        <span class="signer-type-label"><span class="material-symbols-outlined icon-xs">draw</span> 自分で署名</span>
                    </label>
                    <label class="signer-type-option">
                        <input type="radio" name="signerType_${signer.id}" value="send" ${typeChecked('send')}
                               onchange="updateSignerType('${signer.id}', 'send')">
                        <span class="signer-type-label"><span class="material-symbols-outlined icon-xs">send</span> 送付</span>
                    </label>
                </div>
                <div class="signer-email-row" id="signerEmail_${signer.id}" style="display:${emailDisplay};">
                    <input type="email" class="signer-email-input" placeholder="メールアドレス"
                           value="${escapeHtml(signer.email)}" onchange="updateSignerField('${signer.id}', 'email', this.value)">
                    <label class="signer-forward-option">
                        <input type="checkbox" ${signer.allowForward ? 'checked' : ''}
                               onchange="updateSignerField('${signer.id}', 'allowForward', this.checked)">
                        <span>受信者による署名者の転送を許可する</span>
                    </label>
                </div>
            </div>
        `;
        container.appendChild(card);

        // リレー形式: カード間に矢印コネクターを挿入
        if (signingFlow === 'relay' && index < signers.length - 1) {
            const connector = document.createElement('div');
            connector.className = 'signer-relay-connector';
            connector.innerHTML = '<span class="material-symbols-outlined">arrow_downward</span>';
            container.appendChild(connector);
        }
    });

    validateStep2();
}

function addSigner() {
    const id = generateSignerId();
    const index = signers.length;
    signers.push({
        id: id,
        party: getNextPartyLabel(),
        name: '',
        company: '',
        type: 'send',
        email: '',
        method: 'text',
        allowForward: true,
        stampPlacement: null,
        placedStampEl: null,
        color: getSignerColor(index),
        signatureData: null,
        signedAt: null
    });
    renderSignerCards();
    // 新しいカードにフォーカス
    setTimeout(() => {
        const input = document.querySelector(`.signer-card[data-signer-id="${id}"] .signer-name-input`);
        if (input) input.focus();
    }, 100);
}

function removeSigner(id) {
    if (signers.length <= 1) return;
    const signer = getSignerById(id);
    // 配置済みスタンプも削除
    if (signer && signer.placedStampEl) {
        signer.placedStampEl.remove();
    }
    signers = signers.filter(s => s.id !== id);
    // パーティラベルと色を再割り当て
    signers.forEach((s, i) => {
        s.party = PARTY_LABELS[i] || '第' + (i + 1);
        s.color = getSignerColor(i);
    });
    renderSignerCards();
}

function updateSignerField(id, field, value) {
    const signer = getSignerById(id);
    if (signer) signer[field] = value;
    validateStep2();
}

function updateSignerType(id, type) {
    const signer = getSignerById(id);
    if (!signer) return;
    signer.type = type;
    const emailRow = document.getElementById('signerEmail_' + id);
    if (emailRow) emailRow.style.display = type === 'send' ? 'block' : 'none';
    validateStep2();
}

function validateStep2() {
    const btn = document.getElementById('step2NextBtn');
    if (!btn) return;
    const allValid = signers.every(s => {
        if (!s.name.trim() || !s.company.trim()) return false;
        if (s.type === 'send' && !s.email.trim()) return false;
        return true;
    });
    btn.disabled = !allValid;
}

// ============================================
// Step 3: 署名者設定アコーディオン
// ============================================

function renderSignerConfigSections() {
    const container = document.getElementById('signerConfigList');
    if (!container) return;
    container.innerHTML = '';

    signers.forEach((signer, index) => {
        const section = document.createElement('div');
        section.className = 'signer-config-section' + (index === 0 ? ' expanded' : '');
        section.dataset.signerId = signer.id;
        section.style.borderLeftColor = signer.color;

        const typeBadgeClass = signer.type === 'self' ? 'self' : 'send';
        const typeLabel = signer.type === 'self' ? '自分で署名' : '送付';
        const isPlaced = signer.stampPlacement !== null;
        const statusHtml = isPlaced
            ? '<span class="material-symbols-outlined" style="color: #16a34a;">check_circle</span>'
            : '<span class="material-symbols-outlined" style="color: #d1d5db;">radio_button_unchecked</span>';

        const methodActive = (m) => signer.method === m ? 'active' : '';

        // 自分で署名する場合のみ署名入力エリアを表示
        const selfSignArea = signer.type === 'self' ? `
            <div class="step3-self-sign-divider"></div>
            <div class="signer-self-sign-area" id="signerSelfSign_${signer.id}">
                <div class="self-sign-input" id="selfSignInput_${signer.id}_text" ${signer.method !== 'text' ? 'style="display:none;"' : ''}>
                    <label class="sign-input-label">氏名を入力</label>
                    <input type="text" class="sign-text-input" id="selfSignName_${signer.id}"
                           value="${escapeHtml(signer.name)}" oninput="updateSignerPreview('${signer.id}')">
                    <div class="sign-preview-label">プレビュー</div>
                    <div class="typed-signature-preview" id="selfSignPreview_${signer.id}">${escapeHtml(signer.name)}</div>
                </div>
                <div class="self-sign-input" id="selfSignInput_${signer.id}_stamp" style="display:${signer.method === 'stamp' ? 'block' : 'none'};">
                    <label class="sign-input-label">姓を入力して印影を生成</label>
                    <input type="text" class="sign-text-input" id="selfSignSeal_${signer.id}"
                           value="${escapeHtml(signer.name.split(/[\s　]/)[0])}" oninput="updateSignerSealPreview('${signer.id}')">
                    <div class="sign-preview-label">プレビュー</div>
                    <div class="seal-generator-preview" id="selfSignSealPrev_${signer.id}">
                        <span class="seal-text">${escapeHtml(signer.name.split(/[\s　]/)[0])}</span>
                    </div>
                </div>
                <label class="signing-confirm-label" style="margin-top: 16px;">
                    <input type="checkbox" id="selfSignConfirm_${signer.id}" onchange="updateStep3ExecuteBtn()">
                    <span>契約書の内容を確認し、署名に同意します</span>
                </label>
            </div>
        ` : '';

        section.innerHTML = `
            <div class="signer-config-header" onclick="toggleSignerConfig('${signer.id}')">
                <div class="signer-config-badge" style="background: ${signer.color};">${signer.party}</div>
                <div class="signer-config-name">${escapeHtml(signer.name)}</div>
                <div class="signer-config-type-badge ${typeBadgeClass}">${typeLabel}</div>
                <div class="signer-config-status" id="signerStatus_${signer.id}">${statusHtml}</div>
                <span class="material-symbols-outlined signer-config-arrow">expand_more</span>
            </div>
            <div class="signer-config-body" id="signerConfigBody_${signer.id}">
                <div class="sign-method-tabs">
                    <button class="sign-method-tab ${methodActive('text')}" data-method="text"
                            onclick="switchSignerMethod('${signer.id}', 'text')">
                        <span class="material-symbols-outlined icon-sm">signature</span> テキスト署名
                    </button>
                    <button class="sign-method-tab ${methodActive('stamp')}" data-method="stamp"
                            onclick="switchSignerMethod('${signer.id}', 'stamp')">
                        <span class="material-symbols-outlined icon-sm">token</span> 印影
                    </button>
                </div>

                <div class="signing-stamp-drag-section">
                    <div class="signing-stamp-drag-label">署名位置を指定</div>
                    <div class="signing-stamp-handle" id="stampHandle_${signer.id}" style="display:${isPlaced ? 'none' : 'flex'};">
                        <div class="stamp-handle-grip">
                            <span class="material-symbols-outlined">drag_indicator</span>
                        </div>
                        <div class="stamp-handle-preview" id="stampPreview_${signer.id}">
                            ${getStampPreviewHtmlForSigner(signer)}
                        </div>
                        <div class="stamp-handle-text">ドラッグして配置</div>
                    </div>
                    <div class="signing-stamp-placed-note" id="stampPlaced_${signer.id}" style="display:${isPlaced ? 'flex' : 'none'};">
                        <span class="material-symbols-outlined icon-sm">check_circle</span>
                        署名位置を設定しました
                        <button class="stamp-reset-btn" onclick="removeSignerStamp('${signer.id}')">リセット</button>
                    </div>
                </div>

                ${selfSignArea}
            </div>
        `;
        container.appendChild(section);
    });

}

function toggleSignerConfig(signerId) {
    const section = document.querySelector(`.signer-config-section[data-signer-id="${signerId}"]`);
    if (!section) return;
    section.classList.toggle('expanded');

    if (section.classList.contains('expanded')) {
        activeConfigSignerId = signerId;
    }
}

function switchSignerMethod(signerId, method) {
    const signer = getSignerById(signerId);
    if (!signer) return;
    signer.method = method;

    // タブUI切替
    const body = document.getElementById('signerConfigBody_' + signerId);
    if (body) {
        body.querySelectorAll('.sign-method-tab').forEach(t => t.classList.remove('active'));
        const tab = body.querySelector(`.sign-method-tab[data-method="${method}"]`);
        if (tab) tab.classList.add('active');
    }

    // 署名入力切替（self署名者のみ）
    if (signer.type === 'self') {
        ['text', 'stamp'].forEach(m => {
            const el = document.getElementById(`selfSignInput_${signerId}_${m}`);
            if (el) el.style.display = m === method ? 'block' : 'none';
        });
    }

    // スタンプハンドルのプレビュー更新
    const preview = document.getElementById('stampPreview_' + signerId);
    if (preview) preview.innerHTML = getStampPreviewHtmlForSigner(signer);

    // 配置済みスタンプも更新
    if (signer.placedStampEl) {
        const content = signer.placedStampEl.querySelector('.placed-stamp-content');
        if (content) content.innerHTML = getStampPreviewHtmlForSigner(signer);
    }

    updateStep3ExecuteBtn();
}

// 署名者プレビュー更新
function updateSignerPreview(signerId) {
    const input = document.getElementById('selfSignName_' + signerId);
    const preview = document.getElementById('selfSignPreview_' + signerId);
    if (input && preview) {
        preview.textContent = input.value || '名前を入力';
        preview.classList.toggle('placeholder', !input.value);
    }
    updateStep3ExecuteBtn();
}

function updateSignerSealPreview(signerId) {
    const input = document.getElementById('selfSignSeal_' + signerId);
    const preview = document.getElementById('selfSignSealPrev_' + signerId);
    if (!input || !preview) return;
    const name = input.value.trim();
    if (!name) {
        preview.innerHTML = '<span class="seal-placeholder">姓を入力</span>';
    } else {
        const lastName = name.split(/[\s　]/)[0];
        preview.innerHTML = `<span class="seal-text">${escapeHtml(lastName)}</span>`;
    }
    updateStep3ExecuteBtn();
}

// Canvas操作（署名者ID版）
let signerCanvases = {}; // { signerId: { canvas, ctx, drawing } }

function initSignerCanvas(signerId) {
    const canvas = document.getElementById('selfSignCanvas_' + signerId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 160;

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    signerCanvases[signerId] = { canvas, ctx, drawing: false };

    canvas.onmousedown = (e) => { signerCanvases[signerId].drawing = true; ctx.beginPath(); const r = canvas.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); };
    canvas.onmousemove = (e) => { if (!signerCanvases[signerId].drawing) return; const r = canvas.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); };
    canvas.onmouseup = canvas.onmouseleave = () => { signerCanvases[signerId].drawing = false; updateStep3ExecuteBtn(); };
    canvas.ontouchstart = (e) => { e.preventDefault(); const t = e.touches[0]; canvas.onmousedown({ clientX: t.clientX, clientY: t.clientY }); };
    canvas.ontouchmove = (e) => { e.preventDefault(); const t = e.touches[0]; canvas.onmousemove({ clientX: t.clientX, clientY: t.clientY }); };
    canvas.ontouchend = () => { signerCanvases[signerId].drawing = false; updateStep3ExecuteBtn(); };
}

function clearSignerCanvas(signerId) {
    const c = signerCanvases[signerId];
    if (c) c.ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
    updateStep3ExecuteBtn();
}

function isSignerCanvasEmpty(signerId) {
    const c = signerCanvases[signerId];
    if (!c) return true;
    const data = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return false;
    }
    return true;
}

// Step 3実行ボタンの有効/無効
function updateStep3ExecuteBtn() {
    const btn = document.getElementById('step3ExecuteBtn');
    if (!btn) return;

    const allReady = signers.every(signer => {
        // 全署名者: スタンプ配置必須
        if (!signer.stampPlacement) return false;
        // self署名者: 署名入力 + チェックボックス
        if (signer.type === 'self') {
            const cb = document.getElementById('selfSignConfirm_' + signer.id);
            if (!cb || !cb.checked) return false;
            switch (signer.method) {
                case 'text':
                    const nameInput = document.getElementById('selfSignName_' + signer.id);
                    if (!nameInput || !nameInput.value.trim()) return false;
                    break;
                case 'stamp':
                    const sealInput = document.getElementById('selfSignSeal_' + signer.id);
                    if (!sealInput || !sealInput.value.trim()) return false;
                    break;
            }
        }
        return true;
    });
    btn.disabled = !allReady;

    // 各署名者のステータスアイコンを更新
    signers.forEach(signer => {
        const statusEl = document.getElementById('signerStatus_' + signer.id);
        if (statusEl) {
            statusEl.innerHTML = signer.stampPlacement
                ? '<span class="material-symbols-outlined" style="color: #16a34a;">check_circle</span>'
                : '<span class="material-symbols-outlined" style="color: #d1d5db;">radio_button_unchecked</span>';
        }
    });
}

// 署名手続き実行（マルチ署名者）
function executeMultiSignerCeremony() {
    const selfSigners = signers.filter(s => s.type === 'self');
    const sendSigners = signers.filter(s => s.type === 'send');

    // 自分で署名する人: 署名データを保存 + スタンプ確定
    selfSigners.forEach(signer => {
        let signatureImageData = '';
        switch (signer.method) {
            case 'text':
                const nameInput = document.getElementById('selfSignName_' + signer.id);
                signatureImageData = nameInput ? nameInput.value : '';
                break;
            case 'stamp':
                const sealInput = document.getElementById('selfSignSeal_' + signer.id);
                signatureImageData = sealInput ? sealInput.value : '';
                break;
        }
        signer.signatureData = { type: signer.method, data: signatureImageData };
        signer.signedAt = new Date().toLocaleString('ja-JP');

        // signingDataの後方互換更新
        signingData.mySignature = { type: signer.method, data: signatureImageData, name: signer.name };
        signingData.mySignedAt = signer.signedAt;

        // 配置済みスタンプを確定状態に
        if (signer.placedStampEl) {
            signer.placedStampEl.classList.add('stamp-confirmed');
            const actions = signer.placedStampEl.querySelector('.placed-stamp-actions');
            if (actions) actions.style.display = 'none';
        }
    });

    // 送付先の人: デモ通知
    const pendingSigners = sendSigners;

    // モーダルを閉じる
    closeSigningModal();
    launchConfetti(50);

    // ステータス更新 → 署名手続き設定済み（送付済み）
    demoStatus = 'signing_setup_done';
    updateDemoStatus('signing_setup_done');

    // チャットメッセージ
    if (selfSigners.length > 0) {
        addSystemMessage(`${selfSigners.map(s => s.name).join('、')}が電子署名しました。`);
    }
    if (pendingSigners.length > 0) {
        const names = pendingSigners.map(s => s.name).join('、');
        addSystemMessage(`${names}に署名依頼を送信しました。署名を待っています。`);
    }

    updateSignatureDisplay();

    // 送信完了ダイアログを表示
    setTimeout(() => {
        showSigningSentDialog(pendingSigners);
    }, 600);
}

// 署名依頼送信完了ダイアログ
function showSigningSentDialog(pendingSigners) {
    const names = pendingSigners.map(s => s.name).join('、');
    const overlay = document.createElement('div');
    overlay.className = 'signing-sent-overlay';
    overlay.onclick = function(e) {
        if (e.target === overlay) overlay.remove();
    };
    overlay.innerHTML = `
        <div class="signing-sent-dialog">
            <div class="signing-sent-icon">
                <span class="material-symbols-outlined">mark_email_read</span>
            </div>
            <div class="signing-sent-title">署名依頼を送信しました</div>
            <div class="signing-sent-desc">
                ${names ? names + ' に' : '各署名者に'}メールで署名ページへのリンクが送信されました。<br>
                署名者は以下のような画面で署名を行います。
            </div>
            <div class="signing-sent-preview">
                <div class="signing-sent-preview-header">
                    <span class="material-symbols-outlined" style="font-size: 16px;">laptop_mac</span>
                    <span>署名者に届く画面イメージ（sign.html）</span>
                </div>
                <div class="signing-sent-preview-body">
                    <div class="signing-sent-preview-mock">
                        <div class="mock-header">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-collabo);">draw</span>
                            <span style="font-weight: 600;">署名依頼 - 業務委託基本契約書</span>
                        </div>
                        <div class="mock-content">
                            <div class="mock-contract-area">契約書プレビュー</div>
                            <div class="mock-sign-area">
                                <span class="material-symbols-outlined" style="font-size: 20px;">draw</span>
                                署名欄
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="signing-sent-actions">
                <button class="signing-sent-preview-btn" onclick="openSignPage(); this.closest('.signing-sent-overlay').remove();">
                    <span class="material-symbols-outlined icon-sm">open_in_new</span> 署名者画面をプレビュー
                </button>
                <button class="signing-sent-close-btn" onclick="this.closest('.signing-sent-overlay').remove();">
                    閉じる
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ============================
// 署名スタンプ ドラッグ&ドロップ（マルチ署名者対応）
// ============================

function getStampPreviewHtmlForSigner(signer) {
    const color = signer.color || '#4361ee';
    switch (signer.method) {
        case 'text':
            return `<span class="seal-circle" style="font-size: 11px; border-color: ${color}; color: ${color};">署名</span>`;
        case 'stamp':
            return `<span class="seal-circle" style="border-color: ${color}; color: ${color};">印</span>`;
        default:
            return `<span class="seal-circle" style="border-color: ${color}; color: ${color};">印</span>`;
    }
}

function initAllStampDragAndDrop() {
    signers.forEach(signer => {
        const handle = document.getElementById('stampHandle_' + signer.id);
        if (!handle) return;

        // クロージャでsignerIdをキャプチャ
        const sid = signer.id;

        // マウス
        handle.onmousedown = (e) => startStampDrag(e, sid);

        // タッチ
        handle.ontouchstart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startStampDrag({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} }, sid);
            const onTouchMove = (ev) => { ev.preventDefault(); const t = ev.touches[0]; moveStampDrag({ clientX: t.clientX, clientY: t.clientY }); };
            const onTouchEnd = (ev) => { const t = ev.changedTouches[0]; endStampDrag({ clientX: t.clientX, clientY: t.clientY }); document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd); };
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        };
    });
}

function startStampDrag(e, signerId) {
    e.preventDefault();
    isDraggingStamp = true;
    activeDragSignerId = signerId;

    const signer = getSignerById(signerId);
    const ghost = document.getElementById('signingDragGhost');
    if (ghost && signer) {
        ghost.innerHTML = getStampPreviewHtmlForSigner(signer);
        ghost.style.display = 'flex';
        ghost.style.left = (e.clientX - 30) + 'px';
        ghost.style.top = (e.clientY - 30) + 'px';
    }

    const wrapper = document.querySelector('.signing-doc-wrapper');
    if (wrapper) wrapper.classList.add('drag-over');

    document.addEventListener('mousemove', moveStampDrag);
    document.addEventListener('mouseup', endStampDrag);
}

function moveStampDrag(e) {
    if (!isDraggingStamp) return;
    const ghost = document.getElementById('signingDragGhost');
    if (ghost) {
        ghost.style.left = (e.clientX - 30) + 'px';
        ghost.style.top = (e.clientY - 30) + 'px';
    }
    const wrapper = document.querySelector('.signing-doc-wrapper');
    if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
        wrapper.classList.toggle('drag-over-active', isOver);
    }
}

function endStampDrag(e) {
    isDraggingStamp = false;
    document.removeEventListener('mousemove', moveStampDrag);
    document.removeEventListener('mouseup', endStampDrag);

    const ghost = document.getElementById('signingDragGhost');
    if (ghost) ghost.style.display = 'none';

    const wrapper = document.querySelector('.signing-doc-wrapper');
    if (wrapper) {
        wrapper.classList.remove('drag-over', 'drag-over-active');
        const rect = wrapper.getBoundingClientRect();
        const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (isOver && activeDragSignerId) {
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            placeStampOnDocument(x, y, activeDragSignerId);
        }
    }
    activeDragSignerId = null;
}

function placeStampOnDocument(x, y, signerId) {
    const signer = getSignerById(signerId);
    if (!signer) return;
    signer.stampPlacement = { x, y };

    const overlay = document.getElementById('signingStampOverlay');
    if (!overlay) return;

    // 既存スタンプを削除
    if (signer.placedStampEl) {
        signer.placedStampEl.remove();
    }

    const stamp = document.createElement('div');
    stamp.className = 'placed-signature-stamp';
    stamp.dataset.signerId = signerId;
    stamp.style.left = (x * 100) + '%';
    stamp.style.top = (y * 100) + '%';
    stamp.innerHTML = `
        <div class="placed-stamp-label" style="background: ${signer.color};">${signer.party}</div>
        <div class="placed-stamp-content" style="border-color: ${signer.color};">${getStampPreviewHtmlForSigner(signer)}</div>
        <div class="placed-stamp-actions">
            <button class="placed-stamp-action-btn" onclick="removeSignerStamp('${signerId}')" title="削除">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;
    overlay.appendChild(stamp);
    signer.placedStampEl = stamp;

    // 再ドラッグ
    stamp.addEventListener('mousedown', (ev) => startStampReposition(ev, signerId));
    stamp.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        startStampReposition({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} }, signerId);
        const onTouchMove = (ev) => { ev.preventDefault(); const t = ev.touches[0]; moveStampReposition({ clientX: t.clientX, clientY: t.clientY }); };
        const onTouchEnd = (ev) => { const t = ev.changedTouches[0]; endStampReposition({ clientX: t.clientX, clientY: t.clientY }); document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd); };
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });

    // パルスアニメーション
    stamp.classList.add('stamp-placing');
    setTimeout(() => stamp.classList.remove('stamp-placing'), 600);

    // UI更新
    const handleEl = document.getElementById('stampHandle_' + signerId);
    const placedNote = document.getElementById('stampPlaced_' + signerId);
    if (handleEl) handleEl.style.display = 'none';
    if (placedNote) placedNote.style.display = 'flex';

    updateStep3ExecuteBtn();
}

function startStampReposition(e, signerId) {
    e.preventDefault();
    e.stopPropagation();
    isRepositioning = true;
    activeDragSignerId = signerId;

    const signer = getSignerById(signerId);
    const ghost = document.getElementById('signingDragGhost');
    if (ghost && signer) {
        ghost.innerHTML = getStampPreviewHtmlForSigner(signer);
        ghost.style.display = 'flex';
        ghost.style.left = (e.clientX - 30) + 'px';
        ghost.style.top = (e.clientY - 30) + 'px';
    }

    if (signer && signer.placedStampEl) signer.placedStampEl.style.opacity = '0.3';

    document.addEventListener('mousemove', moveStampReposition);
    document.addEventListener('mouseup', endStampReposition);
}

function moveStampReposition(e) {
    if (!isRepositioning) return;
    const ghost = document.getElementById('signingDragGhost');
    if (ghost) {
        ghost.style.left = (e.clientX - 30) + 'px';
        ghost.style.top = (e.clientY - 30) + 'px';
    }
}

function endStampReposition(e) {
    isRepositioning = false;
    document.removeEventListener('mousemove', moveStampReposition);
    document.removeEventListener('mouseup', endStampReposition);

    const ghost = document.getElementById('signingDragGhost');
    if (ghost) ghost.style.display = 'none';

    const wrapper = document.querySelector('.signing-doc-wrapper');
    if (wrapper && activeDragSignerId) {
        const rect = wrapper.getBoundingClientRect();
        const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (isOver) {
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            placeStampOnDocument(x, y, activeDragSignerId);
        } else {
            const signer = getSignerById(activeDragSignerId);
            if (signer && signer.placedStampEl) signer.placedStampEl.style.opacity = '1';
        }
    }
    activeDragSignerId = null;
}

function removeSignerStamp(signerId) {
    const signer = getSignerById(signerId);
    if (!signer) return;
    signer.stampPlacement = null;
    if (signer.placedStampEl) {
        signer.placedStampEl.remove();
        signer.placedStampEl = null;
    }

    const handleEl = document.getElementById('stampHandle_' + signerId);
    const placedNote = document.getElementById('stampPlaced_' + signerId);
    if (handleEl) handleEl.style.display = 'flex';
    if (placedNote) placedNote.style.display = 'none';

    updateStep3ExecuteBtn();
}

function openSigningCeremony() {
    const modal = document.getElementById('signingFullscreenModal');
    if (!modal) return;

    // まず display:flex にして、次フレームでアニメーション開始
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });

    // 署名者をデフォルトにリセット
    signers = [
        { id: 'signer_1', party: '甲', name: '佐藤 一郎', company: '株式会社ABC',
          type: 'self', email: '', method: 'text', allowForward: true,
          stampPlacement: null, placedStampEl: null, color: '#4361ee',
          signatureData: null, signedAt: null },
        { id: 'signer_2', party: '乙', name: '田中 太郎', company: '株式会社XYZ',
          type: 'send', email: 'tanaka@xyz.co.jp', method: 'text', allowForward: true,
          stampPlacement: null, placedStampEl: null, color: '#e74c3c',
          signatureData: null, signedAt: null }
    ];
    nextSignerId = 3;
    activeDragSignerId = null;
    activeConfigSignerId = 'signer_1';
    signingFlow = 'relay';
    signerCanvases = {};

    // スタンプオーバーレイクリア
    const overlay = document.getElementById('signingStampOverlay');
    if (overlay) overlay.innerHTML = '';

    // 印エリアリセット
    const mySeal = document.getElementById('signingDocMySealArea');
    if (mySeal) { mySeal.classList.remove('highlight', 'signed'); mySeal.innerHTML = ''; }
    const partnerSeal = document.getElementById('signingDocPartnerSealArea');
    if (partnerSeal) { partnerSeal.classList.remove('highlight', 'signed'); partnerSeal.innerHTML = ''; }

    // Step 1にリセット
    showSigningStep(1);

    // チェックボックスリセット
    const cb = document.getElementById('signingConfirmCheck');
    if (cb) cb.checked = false;
    updateSigningNextBtn();
}

// 署名フルスクリーンモーダルを閉じる
function closeSigningModal() {
    const modal = document.getElementById('signingFullscreenModal');
    if (!modal) return;

    modal.classList.remove('open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);

    // ハイライト解除
    const mySeal = document.getElementById('signingDocMySealArea');
    if (mySeal) mySeal.classList.remove('highlight');
}

// 後方互換エイリアス
function closeSigningDrawer() {
    closeSigningModal();
}

// 署名ステップ切り替え
let currentSigningStep = 1;
function showSigningStep(step) {
    currentSigningStep = step;

    // ステップコンテンツ切り替え
    document.querySelectorAll('.signing-step-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('signingStep' + step);
    if (target) target.classList.add('active');

    // ステッパー更新
    document.querySelectorAll('.signing-stepper .stepper-item').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i + 1 < step) el.classList.add('completed');
        if (i + 1 === step) el.classList.add('active');
    });

    // Step 1: 左カラムを先頭にスクロール
    if (step === 1) {
        const docColumn = document.querySelector('.signing-doc-column');
        if (docColumn) docColumn.scrollTop = 0;
    }

    // Step 2: 署名者リスト表示
    if (step === 2) {
        renderSignerCards();
    }

    // Step 3: 署名者設定アコーディオン + D&D初期化
    if (step === 3) {
        renderSignerConfigSections();
        setTimeout(() => initAllStampDragAndDrop(), 100);
        updateStep3ExecuteBtn();

        // 左カラムの署名欄までスクロール
        const signSection = document.querySelector('.signing-doc-view .signature-section');
        if (signSection) {
            setTimeout(() => {
                signSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }
}

// Step 1: チェックボックスで「次へ」有効化
function updateSigningNextBtn() {
    const cb = document.getElementById('signingConfirmCheck');
    const btn = document.getElementById('signingNextBtn');
    if (cb && btn) {
        btn.disabled = !cb.checked;
    }
}

// 旧switchSignMethodSetup — 削除済み。switchSignerMethod(signerId, method) を使用
let currentSignMethod = 'text'; // 後方互換

// 旧版（署名者用に転用）
function switchSignMethod(method) {
    currentSignMethod = method;
    document.querySelectorAll('.sign-method-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sign-method-content').forEach(c => c.classList.remove('active'));

    const tab = document.querySelector(`.sign-method-tab[data-method="${method}"]`);
    const content = document.getElementById('signMethod_' + method);
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');

    updateSigningDocPreview();
    updateSignBtn();
}

// Step 2: テキスト署名のプレビュー更新
function updateTextSignaturePreview() {
    const input = document.getElementById('signatureNameInput');
    const preview = document.getElementById('textSignaturePreview');
    if (input && preview) {
        preview.textContent = input.value || '名前を入力';
        preview.classList.toggle('placeholder', !input.value);
    }
    // 左カラムの署名欄にもリアルタイムプレビュー
    updateSigningDocPreview();
    updateSignBtn();
}

// 左カラムの署名欄にリアルタイムプレビューを表示
function updateSigningDocPreview() {
    const docSeal = document.getElementById('signingDocMySealArea');
    if (!docSeal) return;

    let previewHtml = '';
    switch (currentSignMethod) {
        case 'text':
            const nameInput = document.getElementById('signatureNameInput');
            const name = nameInput ? nameInput.value : '';
            if (name) {
                previewHtml = `<span class="seal-signed seal-signed-text seal-preview">${escapeHtml(name)}</span>`;
            }
            break;
        case 'draw':
            if (signCanvas && !isCanvasEmpty()) {
                previewHtml = `<span class="seal-signed seal-preview"><img src="${signCanvas.toDataURL()}" alt="署名" class="signature-image"></span>`;
            }
            break;
        case 'stamp':
            const sealInput = document.getElementById('sealNameInput');
            const sealName = sealInput ? sealInput.value : '';
            if (sealName) {
                previewHtml = `<span class="seal-signed seal-signed-stamp seal-preview"><span class="seal-text">${escapeHtml(sealName)}</span></span>`;
            }
            break;
    }
    docSeal.innerHTML = previewHtml;
}

// Step 2: 手書きCanvas
let signCanvas, signCtx, isDrawing = false;
function initSignatureCanvas() {
    signCanvas = document.getElementById('signatureCanvas');
    if (!signCanvas) return;
    signCtx = signCanvas.getContext('2d');

    // Canvas サイズ設定
    const rect = signCanvas.parentElement.getBoundingClientRect();
    signCanvas.width = rect.width;
    signCanvas.height = 160;

    signCtx.strokeStyle = '#1a1a1a';
    signCtx.lineWidth = 2.5;
    signCtx.lineCap = 'round';
    signCtx.lineJoin = 'round';

    // マウスイベント
    signCanvas.addEventListener('mousedown', startDrawing);
    signCanvas.addEventListener('mousemove', draw);
    signCanvas.addEventListener('mouseup', stopDrawing);
    signCanvas.addEventListener('mouseleave', stopDrawing);

    // タッチイベント
    signCanvas.addEventListener('touchstart', e => { e.preventDefault(); startDrawing(e.touches[0]); });
    signCanvas.addEventListener('touchmove', e => { e.preventDefault(); draw(e.touches[0]); });
    signCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    signCtx.beginPath();
    const rect = signCanvas.getBoundingClientRect();
    signCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = signCanvas.getBoundingClientRect();
    signCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    signCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
    updateSigningDocPreview();
    updateSignBtn();
}

function clearCanvas() {
    if (!signCanvas || !signCtx) return;
    signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height);
    updateSigningDocPreview();
    updateSignBtn();
}

function isCanvasEmpty() {
    if (!signCanvas) return true;
    const ctx = signCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, signCanvas.width, signCanvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return false;
    }
    return true;
}

// Step 2: 印影生成
function generateSeal() {
    const input = document.getElementById('sealNameInput');
    const preview = document.getElementById('sealPreview');
    if (!input || !preview) return;

    const name = input.value.trim();
    if (!name) {
        preview.innerHTML = '<span class="seal-placeholder">姓を入力</span>';
        preview.classList.add('empty');
    } else {
        // 姓だけ取得（スペースで分割して先頭）
        const lastName = name.split(/[\s　]/)[0];
        preview.innerHTML = `<span class="seal-text">${escapeHtml(lastName)}</span>`;
        preview.classList.remove('empty');
    }
    // 左カラム連動
    updateSigningDocPreview();
    updateSignBtn();
}

// 署名ボタンの有効/無効
function updateSignBtn() {
    const btn = document.getElementById('signConfirmBtn');
    if (!btn) return;

    let hasSignature = false;
    switch (currentSignMethod) {
        case 'text':
            const nameInput = document.getElementById('signatureNameInput');
            hasSignature = nameInput && nameInput.value.trim().length > 0;
            break;
        case 'draw':
            hasSignature = !isCanvasEmpty();
            break;
        case 'stamp':
            const sealInput = document.getElementById('sealNameInput');
            hasSignature = sealInput && sealInput.value.trim().length > 0;
            break;
    }
    btn.disabled = !hasSignature;
}

// 署名確認モーダルを表示
function showSignConfirmModal() {
    const modal = document.getElementById('signConfirmModal');
    if (modal) modal.classList.add('open');

    // 確認情報を更新
    const methodLabel = { text: 'テキスト入力', draw: '手書き', stamp: '印影' };
    const methodEl = document.getElementById('confirmSignMethod');
    if (methodEl) methodEl.textContent = methodLabel[currentSignMethod] || '';
}

function closeSignConfirmModal() {
    const modal = document.getElementById('signConfirmModal');
    if (modal) modal.classList.remove('open');
}

// 署名を確定する
function executeSignature() {
    closeSignConfirmModal();

    // 署名データを保存
    let signatureImageData = '';
    switch (currentSignMethod) {
        case 'text':
            const nameInput = document.getElementById('signatureNameInput');
            signatureImageData = nameInput ? nameInput.value : '';
            break;
        case 'draw':
            signatureImageData = signCanvas ? signCanvas.toDataURL() : '';
            break;
        case 'stamp':
            const sealInput = document.getElementById('sealNameInput');
            signatureImageData = sealInput ? sealInput.value : '';
            break;
    }

    const now = new Date();
    signingData.mySignature = {
        type: currentSignMethod,
        data: signatureImageData,
        name: '佐藤 一郎'
    };
    signingData.mySignedAt = now.toLocaleString('ja-JP');

    // 左カラムの署名欄を確定表示に更新
    const docSeal = document.getElementById('signingDocMySealArea');
    if (docSeal) {
        let sealHtml = '';
        switch (currentSignMethod) {
            case 'text':
                sealHtml = `<span class="seal-signed seal-signed-text">${escapeHtml(signatureImageData)}</span>`;
                break;
            case 'draw':
                sealHtml = `<span class="seal-signed"><img src="${signatureImageData}" alt="署名" class="signature-image"></span>`;
                break;
            case 'stamp':
                const lastName = signatureImageData.split(/[\s　]/)[0];
                sealHtml = `<span class="seal-signed seal-signed-stamp"><span class="seal-text">${escapeHtml(lastName)}</span></span>`;
                break;
        }
        sealHtml += `<span class="signed-timestamp">${signingData.mySignedAt} 署名済み</span>`;
        docSeal.innerHTML = sealHtml;
        docSeal.classList.add('signed');
        docSeal.classList.remove('highlight');
    }

    // 成功表示
    showSigningStep(3);

    // 2秒後にモーダルを閉じてバナー表示
    setTimeout(() => {
        closeSigningModal();

        // ミニconfetti
        launchConfetti(50);

        // ステータス更新
        demoStatus = 'my_signer_signed';
        updateDemoStatus('my_signer_signed');

        // 契約書の署名欄を更新
        updateSignatureDisplay();

        // チャットにシステムメッセージ
        addSystemMessage('佐藤一郎（株式会社ABC）が契約書に電子署名しました。相手方の署名を待っています。');
    }, 2000);
}

// 契約書上の署名表示を更新
function updateSignatureDisplay() {
    const mySeal = document.getElementById('mySealArea');
    const partnerSeal = document.getElementById('partnerSealArea');

    if (mySeal && signingData.mySignature) {
        let signatureHtml = '';
        switch (signingData.mySignature.type) {
            case 'text':
                signatureHtml = `<span class="seal-signed seal-signed-text">${escapeHtml(signingData.mySignature.data)}</span>`;
                break;
            case 'draw':
                signatureHtml = `<span class="seal-signed"><img src="${signingData.mySignature.data}" alt="署名" class="signature-image"></span>`;
                break;
            case 'stamp':
                const lastName = signingData.mySignature.data.split(/[\s　]/)[0];
                signatureHtml = `<span class="seal-signed seal-signed-stamp"><span class="seal-text">${escapeHtml(lastName)}</span></span>`;
                break;
        }
        signatureHtml += `<span class="signed-timestamp">${signingData.mySignedAt} 署名済み</span>`;
        mySeal.innerHTML = signatureHtml;
        mySeal.classList.add('signed');
    }

    if (partnerSeal) {
        if (signingData.partnerSignature) {
            const lastName = '田中';
            partnerSeal.innerHTML = `
                <span class="seal-signed seal-signed-stamp"><span class="seal-text">${lastName}</span></span>
                <span class="signed-timestamp">${signingData.partnerSignedAt} 署名済み</span>
            `;
            partnerSeal.classList.add('signed');
        } else {
            partnerSeal.innerHTML = '<span class="contract-seal-circle seal-pending">署名待ち</span>';
        }
    }
}

// チャットにシステムメッセージ追加
function addSystemMessage(text) {
    const messages = document.getElementById('messages');
    if (!messages) return;
    const msg = document.createElement('div');
    msg.className = 'message system-message';
    msg.innerHTML = `<div class="system-message-text"><span class="material-symbols-outlined icon-xs">info</span> ${escapeHtml(text)}</div>`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

// 署名証明書モーダル
function showSigningCertificate() {
    const modal = document.getElementById('signingCertModal');
    if (modal) modal.classList.add('open');
}

function closeSigningCertificate() {
    const modal = document.getElementById('signingCertModal');
    if (modal) modal.classList.remove('open');
}

// ============================================
// 署名者用: 独立した署名ページ (sign.html) を開く
// ============================================

function openSignPage(signerId) {
    const signer = signerId ? getSignerById(signerId) : null;
    const method = signer ? signer.method : (forwardingData.signMethod || currentSignMethod || 'text');
    const from = encodeURIComponent('佐藤一郎');
    const message = encodeURIComponent(forwardingData.message || '交渉が完了しましたので、契約書の署名をお願いいたします。');
    const signerParam = signer ? `&signer=${encodeURIComponent(signer.name)}&party=${encodeURIComponent(signer.party)}&color=${encodeURIComponent(signer.color)}&id=${encodeURIComponent(signer.id)}&forward=${signer.allowForward ? '1' : '0'}` : '';
    window.open(`sign.html?method=${method}&from=${from}&message=${message}${signerParam}`, '_blank');
}

// sign.htmlからの署名完了通知を受け取る
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'signer_signed') {
        const sid = event.data.signerId;
        const signer = sid ? getSignerById(sid) : null;
        if (signer) {
            signer.signatureData = { type: event.data.method || 'text', data: event.data.signerName || signer.name };
            signer.signedAt = new Date().toLocaleString('ja-JP');
            addSystemMessage(`${escapeHtml(signer.name)}（${escapeHtml(signer.company)}）が署名ページから電子署名しました。`);
        } else {
            // fallback: 旧形式
            const signerName = forwardingData.mySignerName || '山田部長';
            signingData.mySignature = { type: event.data.method || 'text', data: '山田 太郎', name: signerName };
            signingData.mySignedAt = new Date().toLocaleString('ja-JP');
            addSystemMessage(`${escapeHtml(signerName)}（株式会社ABC）が署名ページから電子署名しました。`);
        }

        launchConfetti(50);

        demoStatus = 'my_signer_signed';
        updateDemoStatus('my_signer_signed');
        updateSignatureDisplay();
    }
});

// 署名済みPDFダウンロード（デモ）
function downloadSignedPdf() {
    alert('署名済み契約書をダウンロードします（デモ）\n\n実際にはPDF形式で電子署名付きの契約書がダウンロードされます。');
}

// トグルスイッチ
function toggleSwitch(element) {
    element.classList.toggle('active');
}

// メッセージ送信
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    const messages = document.getElementById('messages');
    const newMessage = document.createElement('div');
    newMessage.className = 'message';
    newMessage.innerHTML = `
        <div class="message-header">
            <div class="message-avatar avatar-me">佐</div>
            <span class="message-sender">あなた</span>
            <span class="message-time">今</span>
        </div>
        <div class="message-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
    `;
    messages.appendChild(newMessage);
    messages.scrollTop = messages.scrollHeight;

    input.value = '';
    input.style.height = 'auto';
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// バージョンツリー機能
function toggleCompareMode() {
    compareMode = document.getElementById('compareMode').checked;
    const panel = document.querySelector('.version-tree-panel');
    
    if (compareMode) {
        panel.classList.add('compare-mode');
    } else {
        panel.classList.remove('compare-mode');
        // チェックボックスをリセット
        document.querySelectorAll('.compare-checkbox').forEach(cb => {
            cb.checked = false;
        });
        selectedVersions = [];
        updateCompareButton();
    }
}

function updateCompareButton() {
    const btn = document.getElementById('compareBtn');
    btn.disabled = selectedVersions.length !== 2;
    
    if (selectedVersions.length === 2) {
        const sorted = selectedVersions.sort((a, b) => b - a);
        btn.innerHTML = `<span class="material-symbols-outlined icon-sm">compare</span> Ver.${sorted[0]} と Ver.${sorted[1]} を比較`;
    } else {
        btn.innerHTML = '<span class="material-symbols-outlined icon-sm">compare</span> バージョン比較';
    }
}

function initVersionTree() {
    // バージョンアイテムのクリック
    document.querySelectorAll('.version-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.classList.contains('compare-checkbox')) return;
            
            document.querySelectorAll('.version-item').forEach(v => v.classList.remove('selected'));
            this.classList.add('selected');
            
            const version = this.dataset.version;
            console.log(`Ver.${version} を選択`);
        });
    });
    
    // 比較チェックボックス
    document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            const version = parseInt(this.dataset.version);
            
            if (this.checked) {
                if (selectedVersions.length < 2) {
                    selectedVersions.push(version);
                } else {
                    this.checked = false;
                    alert('比較できるのは2つのバージョンまでです');
                }
            } else {
                selectedVersions = selectedVersions.filter(v => v !== version);
            }
            
            updateCompareButton();
        });
    });
    
    // 比較ボタン
    document.getElementById('compareBtn')?.addEventListener('click', function() {
        if (selectedVersions.length === 2) {
            openDiffModal();
        }
    });
}

// テキスト選択ポップアップ
function handleTextSelection(e) {
    const popup = document.getElementById('selectionPopup');
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // 契約書エリア内での選択のみ対応
    const documentArea = document.querySelector('.document');
    if (!documentArea) return;
    
    if (text && text.length > 0 && documentArea.contains(selection.anchorNode)) {
        selectedText = text;
        
        // ポップアップの位置を計算
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        popup.style.left = `${rect.left + (rect.width / 2) - 100}px`;
        popup.style.top = `${rect.top - 50 + window.scrollY}px`;
        popup.classList.add('active');
    } else {
        popup.classList.remove('active');
    }
}

function hideSelectionPopup() {
    const popup = document.getElementById('selectionPopup');
    setTimeout(() => {
        if (!popup.matches(':hover')) {
            popup.classList.remove('active');
        }
    }, 200);
}

// AI解説機能
function aiExplain() {
    const popup = document.getElementById('selectionPopup');
    popup.classList.remove('active');
    
    document.getElementById('aiSelectedText').textContent = selectedText;
    document.getElementById('aiLoading').style.display = 'flex';
    document.getElementById('aiResult').classList.remove('active');
    document.getElementById('aiExplainModal').classList.add('active');
    
    // AI解説をシミュレート（デモ用）
    setTimeout(() => {
        document.getElementById('aiLoading').style.display = 'none';
        const result = document.getElementById('aiResult');
        result.innerHTML = generateAiExplanation(selectedText);
        result.classList.add('active');
    }, 1500);
}

function generateAiExplanation(text) {
    // デモ用のAI解説を生成
    const explanations = {
        '金48万円': '<strong><span class="material-symbols-outlined icon-sm">payments</span> 報酬金額について</strong><br><br>月額48万円（税別）は、デジタルマーケティング支援業務の対価として設定されています。<br><br>• 年間総額: 約576万円（税別）<br>• 消費税10%を加えると月額52.8万円<br><br>一般的なマーケティング支援の相場と比較して妥当な金額です。',
        '毎月末日締め、翌月末日払い': '<strong><span class="material-symbols-outlined icon-sm">calendar_month</span> 支払いサイクルについて</strong><br><br>「月末締め翌月末払い」は一般的な支払い条件です。<br><br>• 例: 2月分の業務 → 2/28締め → 3/31支払い<br>• 支払いサイトは約30日間<br><br>キャッシュフローの観点から、受注側にとっては標準的な条件です。',
        '本契約終了後3年間': '<strong><span class="material-symbols-outlined icon-sm">lock</span> 秘密保持期間について</strong><br><br>契約終了後3年間の秘密保持義務は、業界標準的な期間です。<br><br>• 短い場合: 1〜2年<br>• 一般的: 3〜5年<br>• 長い場合: 無期限<br><br>マーケティング業務の場合、顧客データや戦略情報を扱うため、3年間は適切な期間といえます。'
    };
    
    return explanations[text] || `<strong><span class="material-symbols-outlined icon-sm">article</span> 選択テキストの解説</strong><br><br>「${text}」<br><br>この条項は契約上の重要な規定です。具体的な法的効果や実務上の影響については、必要に応じて法務担当者にご確認ください。`;
}

function closeAiExplainModal(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('aiExplainModal').classList.remove('active');
    }
}

// コメント機能
function openCommentInput() {
    const popup = document.getElementById('selectionPopup');
    popup.classList.remove('active');
    
    document.getElementById('commentSelectedText').textContent = selectedText;
    document.getElementById('commentTextarea').value = '';
    document.getElementById('commentModal').classList.add('active');
}

function closeCommentModal(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('commentModal').classList.remove('active');
    }
}

function submitComment() {
    const textarea = document.getElementById('commentTextarea');
    const text = textarea.value.trim();
    
    if (text) {
        closeCommentModal();
        
        // メッセージエリアにも通知を追加
        const messages = document.getElementById('messages');
        const newMessage = document.createElement('div');
        newMessage.className = 'message';
        newMessage.innerHTML = `
            <div class="message-header">
                <div class="message-avatar avatar-me">佐</div>
                <span class="message-sender">あなた</span>
                <span class="message-time">今</span>
            </div>
            <div class="message-bubble">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;"><span class="material-symbols-outlined icon-xs">location_on</span> 「${escapeHtml(selectedText)}」へのコメント:</div>
                ${escapeHtml(text)}
            </div>
        `;
        messages.appendChild(newMessage);
        messages.scrollTop = messages.scrollHeight;
        
        alert('コメントを送信しました！');
    }
}

// コメントスレッド表示
function showCommentThread(threadId) {
    const panel = document.getElementById('commentThreadPanel');
    const thread = commentThreads[threadId];
    
    if (!thread) return;
    
    currentCommentThread = threadId;
    
    // 参照テキストを設定
    document.getElementById('threadReference').textContent = thread.reference;
    
    // コメントを表示
    const commentsContainer = document.getElementById('threadComments');
    commentsContainer.innerHTML = thread.comments.map(comment => `
        <div class="thread-comment">
            <div class="thread-avatar ${comment.avatarClass}">${comment.avatar}</div>
            <div class="thread-comment-content">
                <div class="thread-comment-header">
                    <span class="thread-comment-name">${comment.name}</span>
                    <span class="thread-comment-time">${comment.time}</span>
                </div>
                <div class="thread-comment-text">${comment.text}</div>
            </div>
        </div>
    `).join('');
    
    panel.classList.add('active');
}

function closeCommentThread() {
    document.getElementById('commentThreadPanel').classList.remove('active');
    currentCommentThread = null;
}

function sendThreadReply() {
    const textarea = document.getElementById('threadTextarea');
    const text = textarea.value.trim();
    
    if (text && currentCommentThread) {
        // コメントを追加
        const thread = commentThreads[currentCommentThread];
        thread.comments.push({
            name: 'あなた',
            avatar: '佐',
            avatarClass: 'avatar-me',
            time: '今',
            text: text
        });
        
        // 表示を更新
        showCommentThread(currentCommentThread);
        textarea.value = '';
    }
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('messageInput');
    
    // 交渉詳細ページの場合のみ初期化
    if (textarea) {
        // バージョンツリーの初期化
        initVersionTree();

        // テキストエリア自動リサイズ
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });

        // Cmd/Ctrl + Enterで送信
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // テキスト選択時のポップアップ
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('mousedown', function(e) {
            const popup = document.getElementById('selectionPopup');
            if (popup && !popup.contains(e.target)) {
                popup.classList.remove('active');
            }
        });
    }

    // ESCキーでモーダル/ウィザードを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // ウィザードを閉じる
            const wizardPage = document.getElementById('wizardPage');
            if (wizardPage && wizardPage.classList.contains('active')) {
                hideWizard();
                return;
            }
            // 招待ランディングを閉じる
            const inviteLanding = document.getElementById('inviteLandingOverlay');
            if (inviteLanding && inviteLanding.classList.contains('active')) {
                closeInviteLanding();
                return;
            }
            // その他のモーダルを閉じる
            if (typeof closeUploadModal === 'function') closeUploadModal();
            if (typeof closeDiffModal === 'function') closeDiffModal();
            if (typeof closeCommentModal === 'function') closeCommentModal();
            if (typeof closeAiExplainModal === 'function') closeAiExplainModal();
        }
    });

    // ウィザードのメール入力でEnterキー対応
    const wizardEmailInput = document.getElementById('wizardEmailInput');
    if (wizardEmailInput) {
        wizardEmailInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInviteEmail();
            }
        });
    }
});

// ============================================
// 新規交渉開始ウィザード
// ============================================

function showWizard() {
    // 状態をリセット
    wizardCurrentStep = 1;
    wizardFiles = [];
    wizardInviteEmails = [];

    // UIをリセット
    updateWizardStep(1);
    renderWizardFiles();
    renderWizardInviteEmails();
    
    // 案件名をリセット
    const projectNameInput = document.getElementById('wizardProjectName');
    if (projectNameInput) {
        projectNameInput.value = '';
        projectNameInput.dataset.autoSet = 'true';
    }

    document.getElementById('wizardPage').classList.add('active');
}

function hideWizard() {
    document.getElementById('wizardPage').classList.remove('active');
}

// 後方互換性のため（古い関数名も保持）
function openWizard() {
    showWizard();
}

function closeWizard() {
    hideWizard();
}

function updateWizardStep(step) {
    wizardCurrentStep = step;

    // ステッパーの更新
    document.querySelectorAll('.stepper-item').forEach((item, index) => {
        const itemStep = index + 1;
        item.classList.remove('active', 'completed');

        if (itemStep < step) {
            item.classList.add('completed');
        } else if (itemStep === step) {
            item.classList.add('active');
        }
    });

    // ステッパーラインの更新
    document.querySelectorAll('.stepper-line').forEach((line, index) => {
        if (index < step - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });

    // ステップコンテンツの更新
    document.querySelectorAll('.wizard-step').forEach((stepEl, index) => {
        stepEl.classList.remove('active');
        if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });

    // フッターボタンの更新
    const backBtn = document.getElementById('wizardBackBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    // 戻るボタン
    if (step === 1) {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'block';
    }

    // 次へボタン
    if (step === 3) {
        nextBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">rocket_launch</span> 交渉を開始する';
        nextBtn.classList.add('start');
    } else {
        nextBtn.textContent = '次へ →';
        nextBtn.classList.remove('start');
    }

    // Step 3のサマリーを更新
    if (step === 3) {
        updateWizardSummary();
    }

    updateWizardNextButton();
}

function wizardNext() {
    if (wizardCurrentStep === 1) {
        // ファイルが1つ以上必要
        if (wizardFiles.length === 0) {
            alert('契約書を1つ以上アップロードしてください。');
            return;
        }
        updateWizardStep(2);
    } else if (wizardCurrentStep === 2) {
        updateWizardStep(3);
    } else if (wizardCurrentStep === 3) {
        // 交渉を開始
        startNegotiation();
    }
}

function wizardBack() {
    if (wizardCurrentStep > 1) {
        updateWizardStep(wizardCurrentStep - 1);
    }
}

function updateWizardNextButton() {
    const nextBtn = document.getElementById('wizardNextBtn');

    if (wizardCurrentStep === 1) {
        nextBtn.disabled = wizardFiles.length === 0;
    } else {
        nextBtn.disabled = false;
    }
}

// ファイルアップロード処理
function handleWizardDragOver(event) {
    event.preventDefault();
    document.getElementById('wizardUploadArea').classList.add('dragover');
}

function handleWizardDragLeave(event) {
    document.getElementById('wizardUploadArea').classList.remove('dragover');
}

function handleWizardDrop(event) {
    event.preventDefault();
    document.getElementById('wizardUploadArea').classList.remove('dragover');

    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
        addWizardFile(files[i]);
    }
}

function handleWizardFileSelect(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        addWizardFile(files[i]);
    }
    // inputをリセット（同じファイルを再選択できるように）
    event.target.value = '';
}

function addWizardFile(file) {
    const validExtensions = ['.docx', '.doc', '.pdf'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(extension)) {
        alert('Word (.docx, .doc) または PDF ファイルを選択してください。');
        return;
    }

    // 重複チェック
    if (wizardFiles.some(f => f.name === file.name)) {
        alert('同じ名前のファイルが既にアップロードされています。');
        return;
    }

    wizardFiles.push({
        name: file.name,
        size: file.size,
        type: extension
    });

    renderWizardFiles();
    updateWizardNextButton();
}

function removeWizardFile(index) {
    wizardFiles.splice(index, 1);
    renderWizardFiles();
    updateWizardNextButton();
}

function renderWizardFiles() {
    const container = document.getElementById('wizardFilesList');

    if (wizardFiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="wizard-files-header"><span class="material-symbols-outlined icon-sm">attach_file</span> アップロード済み (' + wizardFiles.length + '件)</div>';

    wizardFiles.forEach((file, index) => {
        const isPdf = file.type === '.pdf';
        const iconClass = isPdf ? 'wizard-file-icon pdf' : 'wizard-file-icon';
        const icon = isPdf ? '<span class="material-symbols-outlined icon-sm">picture_as_pdf</span>' : '<span class="material-symbols-outlined icon-sm">description</span>';
        const sizeStr = formatFileSize(file.size);

        html += `
            <div class="wizard-file-item">
                <div class="${iconClass}">${icon}</div>
                <div class="wizard-file-info">
                    <div class="wizard-file-name">${escapeHtml(file.name)}</div>
                    <div class="wizard-file-size">${sizeStr}</div>
                </div>
                <button class="wizard-file-remove" onclick="removeWizardFile(${index})">✕</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 招待メール処理
function addInviteEmail() {
    const input = document.getElementById('wizardEmailInput');
    const email = input.value.trim();

    if (!email) return;

    // 簡易的なメールバリデーション
    if (!email.includes('@') || !email.includes('.')) {
        alert('有効なメールアドレスを入力してください。');
        return;
    }

    // 重複チェック
    if (wizardInviteEmails.some(item => item.email === email)) {
        alert('このメールアドレスは既に追加されています。');
        return;
    }

    wizardInviteEmails.push({ email });
    input.value = '';
    renderWizardInviteEmails();
}

function removeInviteEmail(index) {
    wizardInviteEmails.splice(index, 1);
    renderWizardInviteEmails();
}

function renderWizardInviteEmails() {
    const container = document.getElementById('wizardInviteEmails');

    if (wizardInviteEmails.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    wizardInviteEmails.forEach((item, index) => {
        html += `
            <div class="wizard-invite-email-item">
                <span class="wizard-invite-email-permission" title="編集者">
                    <span class="material-symbols-outlined icon-xs">edit</span>
                </span>
                <span class="wizard-invite-email-text">${escapeHtml(item.email)}</span>
                <button class="wizard-invite-email-remove" onclick="removeInviteEmail(${index})">
                    <span class="material-symbols-outlined icon-xs">close</span>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function copyInviteLink() {
    const input = document.getElementById('wizardLinkInput');
    input.select();
    document.execCommand('copy');

    const btn = document.querySelector('.wizard-copy-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ コピーしました';
    btn.classList.add('copied');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
    }, 2000);
}

function updateWizardSummary() {
    // 案件名を自動生成（拡張子を除去）
    const projectNameInput = document.getElementById('wizardProjectName');
    if (projectNameInput && wizardFiles.length > 0) {
        // 最初のファイル名から拡張子を除去して案件名に設定
        const suggestedName = wizardFiles[0].name.replace(/\.(docx|doc|pdf|xlsx|xls)$/i, '');
        // 入力欄が空の場合のみ自動設定（ユーザーが編集した場合は上書きしない）
        if (!projectNameInput.value || projectNameInput.dataset.autoSet === 'true') {
            projectNameInput.value = suggestedName;
            projectNameInput.dataset.autoSet = 'true';
        }
    }
    
    // ファイルリスト（拡張子付きで表示）
    const filesContainer = document.getElementById('wizardSummaryFiles');
    if (wizardFiles.length === 0) {
        filesContainer.innerHTML = '<li>（ファイルなし）</li>';
    } else {
        filesContainer.innerHTML = wizardFiles.map(f => `<li><span class="material-symbols-outlined icon-xs">description</span> ${escapeHtml(f.name)}</li>`).join('');
    }

    // 招待リスト
    const invitesContainer = document.getElementById('wizardSummaryInvites');
    if (wizardInviteEmails.length === 0) {
        invitesContainer.innerHTML = '<li><span class="material-symbols-outlined icon-xs">link</span> 招待リンクで共有</li>';
    } else {
        invitesContainer.innerHTML = wizardInviteEmails.map(item => {
            return `<li><span class="material-symbols-outlined icon-xs">edit</span> ${escapeHtml(item.email)} <span class="wizard-summary-permission">(編集者)</span></li>`;
        }).join('');
    }
}

function startNegotiation() {
    // 入力フィールドから案件名を取得
    const projectNameInput = document.getElementById('wizardProjectName');
    const projectName = projectNameInput?.value.trim() || wizardFiles[0].name.replace(/\.(docx|doc|pdf|xlsx|xls)$/i, '');

    alert(`「${projectName}」の交渉を開始しました！\n\n招待した方にメールが送信されました。`);

    // 交渉詳細画面に遷移
    location.href = 'negotiation.html';
}

// ============================================
// 招待された側のランディング画面
// ============================================

// 後方互換性のため（古いオーバーレイ版）
function openInviteLanding() {
    // 独立ページに遷移
    location.href = 'invite.html';
}

function closeInviteLanding() {
    // 一覧ページに戻る
    location.href = 'index.html';
}

function signInWithGoogle() {
    // デモ: サインイン成功をシミュレート
    alert('Googleアカウントでサインインしました！\n\n交渉画面に移動します...');
    location.href = 'negotiation.html';
}

function signInWithMicrosoft() {
    // デモ: サインイン成功をシミュレート
    alert('Microsoftアカウントでサインインしました！\n\n交渉画面に移動します...');
    location.href = 'negotiation.html';
}

// ============================================
// メンバー管理機能（ヘッダー）
// ============================================

function toggleHeaderMembersPanel(event) {
    event.stopPropagation();
    const container = document.getElementById('headerMembers');
    container.classList.toggle('active');
}

// ドキュメントクリックでパネルを閉じる（交渉詳細ページでのみ動作）
document.addEventListener('click', function(e) {
    const headerMembers = document.getElementById('headerMembers');
    if (headerMembers && !headerMembers.contains(e.target)) {
        headerMembers.classList.remove('active');
    }
});

function openAddMemberModal() {
    // ヘッダーのメンバーパネルを閉じる
    const headerMembers = document.getElementById('headerMembers');
    if (headerMembers) {
        headerMembers.classList.remove('active');
    }
    document.getElementById('addMemberModal').classList.add('active');
}

function closeAddMemberModal(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('addMemberModal').classList.remove('active');
        document.getElementById('addMemberEmailInput').value = '';
    }
}

function sendMemberInvite() {
    const input = document.getElementById('addMemberEmailInput');
    const email = input.value.trim();

    if (!email) {
        alert('メールアドレスを入力してください。');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        alert('有効なメールアドレスを入力してください。');
        return;
    }

    closeAddMemberModal();
    alert(`${email} を編集者として招待しました！`);
}

function copyMemberInviteLink() {
    const input = document.getElementById('addMemberLinkInput');
    input.select();
    document.execCommand('copy');

    const btn = document.querySelector('.add-member-copy-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓';
    btn.classList.add('copied');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
    }, 2000);
}

// ============================================
// 交渉一覧画面（現在はindex.htmlがメインなので不要だが後方互換用に残す）
// ============================================

function openNegotiationsList() {
    // 一覧ページに遷移
    location.href = 'index.html';
}

function closeNegotiationsList() {
    // 現在のページが一覧なので何もしない
}

// ============================================
// デモ用ステータス切り替え機能
// ============================================

// ステータス: 'negotiating' → 'awaiting_my_signer' → 'my_signer_signed' → 'concluded' → 'partner_editing' → 'negotiating' ...
let demoStatus = 'negotiating';

function initDemoStatusBanner() {
    const body = document.body;
    const toggleBtn = document.getElementById('demoStatusToggle');
    const signingWaitBanner = document.getElementById('globalSigningWaitBanner');
    const concludedBanner = document.getElementById('globalConcludedBanner');

    if (!toggleBtn) return;

    // 初期状態を設定
    updateDemoStatus(demoStatus);
}

function toggleDemoStatus() {
    // ステータスを順番に切り替え
    // negotiating(交渉者) → signing_setup_done(交渉者) → signer_view(署名者) → my_signer_signed(署名者) → concluded(署名者) → partner_editing → negotiating
    if (demoStatus === 'negotiating') {
        demoStatus = 'signing_setup_done';
        currentUserRole = 'member';
    } else if (demoStatus === 'signing_setup_done') {
        demoStatus = 'signer_view';
        currentUserRole = 'signer'; // 署名者ビューに切替
        // 署名データはまだセットしない（署名前の状態）
    } else if (demoStatus === 'signer_view') {
        demoStatus = 'my_signer_signed';
        currentUserRole = 'signer';
        launchConfetti(50);
        // 自社署名者が署名完了（デモ用）
        signingData.mySignature = { type: 'text', data: '山田 太郎', name: '山田部長' };
        signingData.mySignedAt = new Date().toLocaleString('ja-JP');
    } else if (demoStatus === 'my_signer_signed') {
        demoStatus = 'concluded';
        currentUserRole = 'signer';
        launchConfetti(150);
        // 相手方の署名データをセット（デモ用）
        signingData.partnerSignature = { type: 'stamp', data: '田中', name: '田中 太郎' };
        signingData.partnerSignedAt = new Date().toLocaleString('ja-JP');
    } else if (demoStatus === 'concluded') {
        demoStatus = 'partner_editing';
        currentUserRole = 'member';
        // 署名データリセット
        signingData = { mySignature: null, partnerSignature: null, mySignedAt: null, partnerSignedAt: null };
        forwardingData = { mySignerName: null, mySignerEmail: null, mySignerCompany: null, myForwardedAt: null, partnerSignerName: null, partnerSignerEmail: null, partnerSignerCompany: null, partnerForwardedAt: null, message: null, signMethod: null };
    } else {
        demoStatus = 'negotiating';
        currentUserRole = 'member';
    }

    updateDemoStatus(demoStatus);
    updateSignatureDisplay();
}

function updateDemoStatus(status) {
    const body = document.body;
    const toggleBtn = document.getElementById('demoStatusToggle');
    const signingWaitBanner = document.getElementById('globalSigningWaitBanner');
    const concludedBanner = document.getElementById('globalConcludedBanner');
    const signBtn = document.getElementById('signBtn');
    const headerElement = document.querySelector('.header');

    if (!toggleBtn) return;

    // トグルボタンのクラスをリセット
    toggleBtn.classList.remove('status-waiting', 'status-agreed', 'status-negotiating', 'status-partner-editing', 'status-partially-signed', 'status-concluded', 'status-awaiting-signer', 'status-awaiting-my-signer', 'status-signer-ready', 'status-my-signer-signed', 'status-signing-setup-done', 'status-signer-view');

    // バナーの表示状態をすべて隠す
    if (signingWaitBanner) signingWaitBanner.classList.add('hidden');
    if (concludedBanner) concludedBanner.classList.add('hidden');
    const signerReadyBannerEl = document.getElementById('globalSignerReadyBanner');
    if (signerReadyBannerEl) signerReadyBannerEl.classList.add('hidden');
    const signingSetupBanner = document.getElementById('globalSigningSetupBanner');
    if (signingSetupBanner) signingSetupBanner.classList.add('hidden');

    // 概要バナーも更新
    const overviewBanner = document.getElementById('overviewStatusBanner');

    switch(status) {
        case 'awaiting_my_signer':
        case 'signing_setup_done':
            // 署名手続き設定済み（交渉者ビュー）
            if (signingSetupBanner) signingSetupBanner.classList.remove('hidden');
            body.classList.add('has-status-banner');
            toggleBtn.classList.add('status-signing-setup-done');

            // ボタンを「設定済み」表示
            if (signBtn) {
                signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">check_circle</span> 署名手続き設定済み';
                signBtn.classList.add('signed');
                signBtn.disabled = true;
            }

            // 概要バナー
            if (overviewBanner) {
                overviewBanner.className = 'overview-status-banner awaiting-signer';
                overviewBanner.querySelector('.status-banner-icon').innerHTML = '<span class="material-symbols-outlined">draw</span>';
                overviewBanner.querySelector('.status-banner-title').textContent = '署名手続き設定済み（Ver.8 時点）';
                overviewBanner.querySelector('.status-banner-desc').textContent = '各署名者の署名を待っています';
            }

            break;

        case 'signer_ready':
        case 'signer_view':
            // 署名者ビュー — 署名ボタンが有効（署名前の状態）
            const signerReadyBanner = document.getElementById('globalSignerReadyBanner');
            if (signerReadyBanner) signerReadyBanner.classList.remove('hidden');
            body.classList.add('has-status-banner');
            toggleBtn.classList.add('status-signer-view');

            // ボタンを「署名ページを開く」（有効）
            if (signBtn) {
                signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">open_in_new</span> 署名ページを開く';
                signBtn.classList.remove('signed');
                signBtn.disabled = false;
            }



            // 概要バナー
            if (overviewBanner) {
                overviewBanner.className = 'overview-status-banner signing';
                overviewBanner.querySelector('.status-banner-icon').innerHTML = '<span class="material-symbols-outlined">draw</span>';
                overviewBanner.querySelector('.status-banner-title').textContent = '署名手続き待ち（Ver.8 時点）';
                overviewBanner.querySelector('.status-banner-desc').textContent = '契約書の内容を確認し、署名してください。';
            }

            break;

        case 'my_signer_signed':
            // 自社署名済み・相手方待ち（署名者ビュー）
            if (signingWaitBanner) signingWaitBanner.classList.remove('hidden');
            body.classList.add('has-status-banner');
            toggleBtn.classList.add('status-my-signer-signed');

            // 自分の署名データをセット（デモ用）
            if (!signingData.mySignature) {
                signingData.mySignature = { type: 'text', data: '佐藤 一郎', name: '佐藤 一郎' };
                signingData.mySignedAt = new Date().toLocaleString('ja-JP');
            }

            // 署名ボタンを「署名済み」表示
            if (signBtn) {
                signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">check_circle</span> 署名済み';
                signBtn.classList.add('signed');
                signBtn.disabled = true;
            }



            // 概要バナー
            if (overviewBanner) {
                overviewBanner.className = 'overview-status-banner signing';
                overviewBanner.querySelector('.status-banner-icon').innerHTML = '<span class="material-symbols-outlined">draw</span>';
                overviewBanner.querySelector('.status-banner-title').textContent = '署名手続き中（Ver.8 時点）';
                overviewBanner.querySelector('.status-banner-desc').textContent = 'あなたは署名済みです。相手方の署名を待っています。';
            }

            break;

        case 'concluded':
            // 両者署名完了・締結
            if (concludedBanner) concludedBanner.classList.remove('hidden');
            body.classList.add('has-status-banner');
            toggleBtn.classList.add('status-concluded');

            // 署名ボタンを「締結済み」表示
            if (signBtn) {
                signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">verified</span> 締結済み';
                signBtn.classList.add('signed');
                signBtn.disabled = true;
            }



            // 概要バナー
            if (overviewBanner) {
                overviewBanner.className = 'overview-status-banner concluded';
                overviewBanner.querySelector('.status-banner-icon').innerHTML = '<span class="material-symbols-outlined">verified</span>';
                overviewBanner.querySelector('.status-banner-title').textContent = '契約が締結されました';
                overviewBanner.querySelector('.status-banner-desc').textContent = '両者の電子署名が完了しています。';
            }

            // 署名証明カードを表示
            const certCard = document.getElementById('signingCertCard');
            if (certCard) certCard.classList.remove('hidden');
            break;

        case 'negotiating':
            // 通常の交渉中（バナーなし）
            body.classList.remove('has-status-banner');
            toggleBtn.classList.add('status-negotiating');

            // ロールに応じたボタン表示
            if (signBtn) {
                signBtn.classList.remove('signed');
                signBtn.disabled = false;
                if (currentUserRole === 'signer') {
                    signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">draw</span> 署名する';
                } else {
                    signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">draw</span> 署名手続き・設定';
                }
            }



            // 概要バナー
            if (overviewBanner) {
                overviewBanner.className = 'overview-status-banner negotiating';
                overviewBanner.querySelector('.status-banner-icon').innerHTML = '<span class="material-symbols-outlined">sync</span>';
                overviewBanner.querySelector('.status-banner-title').textContent = '契約書の概要（Ver.8 時点）';
                overviewBanner.querySelector('.status-banner-desc').textContent = 'この概要は契約書の更新に応じて自動更新されます';
            }


            // 署名証明カードを非表示
            const certCard2 = document.getElementById('signingCertCard');
            if (certCard2) certCard2.classList.add('hidden');
            break;

        case 'partner_editing':
            // 相手が編集中（バナーなし）
            body.classList.remove('has-status-banner');
            toggleBtn.classList.add('status-partner-editing');

            // ロールに応じたボタン表示
            if (signBtn) {
                signBtn.classList.remove('signed');
                signBtn.disabled = false;
                if (currentUserRole === 'signer') {
                    signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">draw</span> 署名する';
                } else {
                    signBtn.innerHTML = '<span class="material-symbols-outlined icon-sm">draw</span> 署名手続き・設定';
                }
            }



            break;
    }
}

// ============================================
// 紙吹雪アニメーション
// ============================================

function launchConfetti(count) {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    // コンテナをクリア
    container.innerHTML = '';

    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8B500', '#FF69B4'
    ];

    const shapes = ['circle', 'square', 'ribbon'];
    const confettiCount = count || 150;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = `confetti ${shapes[Math.floor(Math.random() * shapes.length)]}`;
        
        // ランダムな色
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // ランダムな開始位置
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-20px';
        
        // ランダムなサイズ
        const size = 6 + Math.random() * 10;
        if (!confetti.classList.contains('ribbon')) {
            confetti.style.width = size + 'px';
            confetti.style.height = size + 'px';
        } else {
            confetti.style.width = (size * 0.6) + 'px';
            confetti.style.height = (size * 2) + 'px';
        }
        
        // アニメーション設定
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 1.5;
        const drift = (Math.random() - 0.5) * 200;
        
        confetti.style.animation = `confetti-fall ${duration}s ease-out ${delay}s forwards`;
        confetti.style.setProperty('--drift', drift + 'px');
        
        // 横方向の動きを追加
        confetti.animate([
            { transform: `translateY(-100px) translateX(0) rotate(0deg)`, opacity: 1 },
            { transform: `translateY(100vh) translateX(${drift}px) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: duration * 1000,
            delay: delay * 1000,
            easing: 'ease-out',
            fill: 'forwards'
        });
        
        container.appendChild(confetti);
    }
    
    // 5秒後に紙吹雪を削除
    setTimeout(() => {
        container.innerHTML = '';
    }, 6000);
}

// 契約書ダウンロード（デモ用）
function downloadContract() {
    alert('契約書をダウンロードします（デモ）\n\n実際にはPDF形式でダウンロードされます。');
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', function() {
    initDemoStatusBanner();
    initSignatureCanvas();

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSigningModal();
            closeSignConfirmModal();
            closeSigningCertificate();
        }
    });

    // 案件名入力フィールドのイベントリスナー
    const projectNameInput = document.getElementById('wizardProjectName');
    if (projectNameInput) {
        projectNameInput.addEventListener('input', function() {
            // ユーザーが編集したら自動設定フラグを解除
            this.dataset.autoSet = 'false';
        });
    }
});