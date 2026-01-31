// 状態管理
let contractStatus = 'negotiating'; // negotiating, editing, locked, agreed
let editLockState = 'none'; // none, me, them
let isAgreed = false;
let selectedText = '';
let currentCommentThread = null;

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
});
