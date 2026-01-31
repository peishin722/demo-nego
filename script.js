// 状態管理
let contractStatus = 'negotiating'; // negotiating, editing, locked, agreed
let editLockState = 'none'; // none, me, them
let isAgreed = false;

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
        }
    });
});
