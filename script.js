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

    // 実際のアプリでは、ここで該当する契約書のコンテンツを読み込む
    if (subtabId === 'individual-a') {
        alert('個別契約(案件A)を表示します。\n\n実際のアプリでは、ここで契約書の内容が切り替わります。');
    } else if (subtabId === 'individual-b') {
        alert('個別契約(案件B)を表示します。\n\n実際のアプリでは、ここで契約書の内容が切り替わります。');
    }
}

// 新しい契約を追加
function addNewContract() {
    const contractName = prompt('新しい契約の名前を入力してください\n(例: 個別契約(案件C)、保守契約 など)');
    if (contractName) {
        const subtabs = document.querySelector('.contract-subtabs');
        const addBtn = document.querySelector('.add-contract-subtab');

        // 新しいタブを作成
        const newTab = document.createElement('button');
        newTab.className = 'contract-subtab';
        newTab.textContent = `📋 ${contractName}`;
        newTab.onclick = function() { switchContractSubtab('new'); };

        // 追加ボタンの前に挿入
        subtabs.insertBefore(newTab, addBtn);

        alert(`「${contractName}」を作成しました!`);
    }
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
        <div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>
    `;
    messages.appendChild(newMessage);
    messages.scrollTop = messages.scrollHeight;

    input.value = '';
    input.style.height = 'auto';
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
});
