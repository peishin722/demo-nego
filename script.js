// 状態管理
let contractStatus = 'negotiating'; // negotiating, editing, locked, agreed
let editLockState = 'none'; // none, me, them
let isAgreed = false;
let selectedText = '';
let currentCommentThread = null;
let compareMode = false;
let selectedVersions = [];

// ウィザード状態管理
let wizardCurrentStep = 1;
let wizardFiles = [];
let wizardInviteEmails = [];

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
        newTab.textContent = `📋 ${contractName}`;
        newTab.onclick = function() { switchContractSubtab('new'); };

        subtabs.insertBefore(newTab, addBtn);
        alert(`「${contractName}」を作成しました!`);
    }
}

// 編集ロック機能
function toggleEditLock() {
    const btn = document.getElementById('editLockBtn');
    const badge = document.getElementById('contractStatusBadge');

    if (editLockState === 'none') {
        // 編集開始
        editLockState = 'me';
        btn.textContent = '🔒 編集を終了';
        btn.classList.add('active');
        badge.textContent = '📝 編集中';
        badge.className = 'status-badge editing';
    } else if (editLockState === 'me') {
        // 編集終了
        editLockState = 'none';
        btn.textContent = '📝 Wordで編集';
        btn.classList.remove('active');
        btn.classList.remove('locked');
        badge.textContent = '💬 交渉中';
        badge.className = 'status-badge';
    }
}

// 相手が編集中の状態をシミュレート
function simulatePartnerEditing() {
    const btn = document.getElementById('editLockBtn');
    const badge = document.getElementById('contractStatusBadge');

    editLockState = 'them';
    btn.textContent = '🔒 田中様が編集中';
    btn.classList.add('locked');
    btn.disabled = true;
    badge.textContent = '🔒 ロック中';
    badge.className = 'status-badge locked';
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

// 合意機能
function agreeContract() {
    if (isAgreed) return;

    if (confirm('この内容で合意しますか?\n\n合意後は契約書の編集ができなくなります。')) {
        isAgreed = true;

        // ボタンを更新
        const agreeBtn = document.getElementById('agreeBtn');
        agreeBtn.textContent = '✅ 合意済み';
        agreeBtn.classList.add('agreed');

        // ステータスバッジを更新
        const badge = document.getElementById('contractStatusBadge');
        badge.textContent = '✅ 合意済み';
        badge.className = 'status-badge agreed';

        // 編集ボタンを無効化
        const editBtn = document.getElementById('editLockBtn');
        editBtn.disabled = true;
        editBtn.style.opacity = '0.5';

        alert('合意が完了しました!\n\n契約書が確定されました。');
    }
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
        btn.textContent = `🔍 Ver.${sorted[0]} と Ver.${sorted[1]} を比較`;
    } else {
        btn.textContent = '🔍 バージョン比較';
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
        '金48万円': '<strong>💰 報酬金額について</strong><br><br>月額48万円（税別）は、デジタルマーケティング支援業務の対価として設定されています。<br><br>• 年間総額: 約576万円（税別）<br>• 消費税10%を加えると月額52.8万円<br><br>一般的なマーケティング支援の相場と比較して妥当な金額です。',
        '毎月末日締め、翌月末日払い': '<strong>📅 支払いサイクルについて</strong><br><br>「月末締め翌月末払い」は一般的な支払い条件です。<br><br>• 例: 2月分の業務 → 2/28締め → 3/31支払い<br>• 支払いサイトは約30日間<br><br>キャッシュフローの観点から、受注側にとっては標準的な条件です。',
        '本契約終了後3年間': '<strong>🔒 秘密保持期間について</strong><br><br>契約終了後3年間の秘密保持義務は、業界標準的な期間です。<br><br>• 短い場合: 1〜2年<br>• 一般的: 3〜5年<br>• 長い場合: 無期限<br><br>マーケティング業務の場合、顧客データや戦略情報を扱うため、3年間は適切な期間といえます。'
    };
    
    return explanations[text] || `<strong>📝 選択テキストの解説</strong><br><br>「${text}」<br><br>この条項は契約上の重要な規定です。具体的な法的効果や実務上の影響については、必要に応じて法務担当者にご確認ください。`;
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
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📍 「${escapeHtml(selectedText)}」へのコメント:</div>
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

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeUploadModal();
            closeDiffModal();
            closeCommentModal();
            closeAiExplainModal();
        }
    });
    
    // テキスト選択時のポップアップ
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', function(e) {
        const popup = document.getElementById('selectionPopup');
        if (!popup.contains(e.target)) {
            popup.classList.remove('active');
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

function openWizard() {
    // 状態をリセット
    wizardCurrentStep = 1;
    wizardFiles = [];
    wizardInviteEmails = [];

    // UIをリセット
    updateWizardStep(1);
    renderWizardFiles();
    renderWizardInviteEmails();

    document.getElementById('wizardOverlay').classList.add('active');
}

function closeWizard() {
    document.getElementById('wizardOverlay').classList.remove('active');
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
        nextBtn.textContent = '🚀 交渉を開始する';
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

    let html = '<div class="wizard-files-header">📎 アップロード済み (' + wizardFiles.length + '件)</div>';

    wizardFiles.forEach((file, index) => {
        const isPdf = file.type === '.pdf';
        const iconClass = isPdf ? 'wizard-file-icon pdf' : 'wizard-file-icon';
        const icon = isPdf ? '📕' : '📄';
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
    if (wizardInviteEmails.includes(email)) {
        alert('このメールアドレスは既に追加されています。');
        return;
    }

    wizardInviteEmails.push(email);
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
    wizardInviteEmails.forEach((email, index) => {
        html += `
            <div class="wizard-invite-email-item">
                <span class="wizard-invite-email-text">${escapeHtml(email)}</span>
                <button class="wizard-invite-email-remove" onclick="removeInviteEmail(${index})">✕</button>
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
    // ファイルリスト
    const filesContainer = document.getElementById('wizardSummaryFiles');
    if (wizardFiles.length === 0) {
        filesContainer.innerHTML = '<li>（ファイルなし）</li>';
    } else {
        filesContainer.innerHTML = wizardFiles.map(f => `<li>${escapeHtml(f.name)}</li>`).join('');
    }

    // 招待リスト
    const invitesContainer = document.getElementById('wizardSummaryInvites');
    if (wizardInviteEmails.length === 0) {
        invitesContainer.innerHTML = '<li>招待リンクで共有</li>';
    } else {
        invitesContainer.innerHTML = wizardInviteEmails.map(e => `<li>${escapeHtml(e)}</li>`).join('');
    }
}

function startNegotiation() {
    // 交渉開始処理（デモ）
    closeWizard();

    // ファイル名から案件名を生成
    const projectName = wizardFiles[0].name.replace(/\.(docx|doc|pdf)$/i, '');

    alert(`「${projectName}」の交渉を開始しました！\n\n招待した方にメールが送信されました。`);

    // 実際のアプリでは、ここで既存の交渉画面に遷移
}

// ============================================
// 招待された側のランディング画面
// ============================================

function openInviteLanding() {
    document.getElementById('inviteLandingOverlay').classList.add('active');
}

function closeInviteLanding() {
    document.getElementById('inviteLandingOverlay').classList.remove('active');
}

function signInWithGoogle() {
    // デモ: サインイン成功をシミュレート
    alert('Googleアカウントでサインインしました！\n\n交渉画面に移動します...');
    closeInviteLanding();
}

function signInWithMicrosoft() {
    // デモ: サインイン成功をシミュレート
    alert('Microsoftアカウントでサインインしました！\n\n交渉画面に移動します...');
    closeInviteLanding();
}

// ============================================
// メンバー管理機能
// ============================================

function toggleMembersPanel() {
    const panel = document.getElementById('membersPanel');
    panel.classList.toggle('active');
}

function openAddMemberModal() {
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
    alert(`${email} に招待メールを送信しました！`);
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
// 交渉一覧画面
// ============================================

function openNegotiationsList() {
    document.getElementById('negotiationsListOverlay').classList.add('active');
}

function closeNegotiationsList() {
    document.getElementById('negotiationsListOverlay').classList.remove('active');
}
