/* =========================================================================
   apps.js — Simulator Kirim Robux Roblox Sesuai Foto 1, 2, 3, 4
   ========================================================================= */

const BACON_AVATAR = "https://e.top4top.io/p_3929zl5vw0.png";

const OFFLINE_MEMBERS = [
    { username: "jirun", password: "JirunSmd27-", name: "Jirun", balance: 44400, canEditBalance: true },
    { username: "jason88", password: "jason88", name: "Jirun", balance: 44400, canEditBalance: true },
    { username: "member_b", password: "password123", name: "Member B", balance: 100000, canEditBalance: true },
    { username: "member_a", password: "password123", name: "Member A", balance: 15000, canEditBalance: false },
    { username: "memek", password: "Memek", name: "Member Tester", balance: 44400, canEditBalance: true }
];

let currentMember = null;
try {
    const savedSession = sessionStorage.getItem('rbx_member_auth');
    if (savedSession) currentMember = JSON.parse(savedSession);
} catch(e) {}

let myBalance = currentMember ? currentMember.balance : 44400;
let accountName = currentMember ? currentMember.name : "Member";
let canEditBalance = currentMember ? !!currentMember.canEditBalance : false;

const bodyAvatarCache = {};
const headAvatarCache = {};
const statsCache = {};

let targetUser = "";
let searchTimeout = null;
let hsToken = 0;
let ppCurrentTarget = null;
let currentSendAmount = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (!currentMember) {
        document.getElementById('auth-lock-overlay').style.display = 'flex';
        document.getElementById('rbx-header').style.display = 'none';
    } else {
        unlockMemberApp();
    }

    bindAppEvents();
});

/* =========================================================================
   LOGIN & SESI MEMBER
   ========================================================================= */
async function submitMemberLogin() {
    const uInput = document.getElementById('login-user').value.trim();
    const pInput = document.getElementById('login-pass').value.trim();
    const errEl = document.getElementById('auth-error-msg');
    const btn = document.getElementById('login-submit-btn');

    if (!uInput || !pInput) {
        errEl.innerText = 'Username dan Password wajib diisi!';
        errEl.style.display = 'block';
        return;
    }

    errEl.style.display = 'none';
    btn.innerText = 'Memeriksa Akses...';
    btn.disabled = true;

    let loginSuccess = false;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uInput, password: pInput })
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data && data.ok && data.user) {
                processLoginSuccess(data.user);
                loginSuccess = true;
            } else {
                errEl.innerText = data.message || 'Username atau Password salah!';
                errEl.style.display = 'block';
            }
        }
    } catch(e) {}

    if (!loginSuccess && errEl.style.display !== 'block') {
        const foundOffline = OFFLINE_MEMBERS.find(m => 
            m.username.toLowerCase() === uInput.toLowerCase() && 
            m.password === pInput
        );

        if (foundOffline) {
            processLoginSuccess(foundOffline);
            loginSuccess = true;
        } else {
            errEl.innerText = 'Username atau Password salah!';
            errEl.style.display = 'block';
        }
    }

    btn.innerText = 'Buka Akses';
    btn.disabled = false;
}

function processLoginSuccess(userData) {
    sessionStorage.setItem('rbx_member_auth', JSON.stringify(userData));
    currentMember = userData;
    accountName = userData.name;
    myBalance = userData.balance;
    canEditBalance = userData.canEditBalance === true;

    unlockMemberApp();
}

function unlockMemberApp() {
    document.body.classList.add('logged-in');
    document.getElementById('auth-lock-overlay').style.display = 'none';
    document.getElementById('rbx-header').style.display = 'flex';

    updateBalances();
    const elUser = document.getElementById('header-username');
    if (elUser) elUser.innerText = accountName;
}

function logoutMember() {
    sessionStorage.removeItem('rbx_member_auth');
    location.reload();
}

function bindAppEvents() {
    const pInput = document.getElementById('login-pass');
    if (pInput) {
        pInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitMemberLogin();
        });
    }

    const amountInput = document.getElementById('amount-input');
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            const digits = this.value.replace(/[^0-9]/g, '');
            this.value = (digits === '') ? '0' : parseInt(digits, 10).toLocaleString('en-US');
            const textLen = this.value.length || 1;
            this.style.width = textLen + 'ch';
        });
    }

    const headerSearchInput = document.getElementById('header-search-input');
    if (headerSearchInput) {
        headerSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(executeHeaderSearch, 140);
        });
        headerSearchInput.addEventListener('paste', () => {
            clearTimeout(searchTimeout);
            setTimeout(executeHeaderSearch, 15);
        });
        headerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                executeHeaderSearch();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.rbx-header-center')) hsHide();
        if (!e.target.closest('#pp-more-btn') && !e.target.closest('#pp-dots-menu')) {
            const m = document.getElementById('pp-dots-menu');
            if (m) m.classList.remove('show');
        }
    });
}

function formatNum(num) { 
    return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); 
}

function updateBalances() { 
    // Update balance di modal kirim Robux
    const el = document.getElementById('modal-balance');
    if (el) el.innerText = formatNum(myBalance); 

    // Update balance di bagian atas tampilan toko Robux
    const elShop = document.getElementById('shop-balance-num');
    if (elShop) elShop.innerText = formatNum(myBalance);
}

/* =========================================================================
   PENGATURAN SALDO
   ========================================================================= */
window.openSettings = function() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    document.getElementById('settings-name').value = accountName;

    const balInput = document.getElementById('settings-balance');
    const balLabel = document.getElementById('balance-label-status');

    balInput.value = formatNum(myBalance);

    if (canEditBalance) {
        balInput.disabled = false;
        balLabel.innerText = "SALDO ROBUX";
        balLabel.style.color = "#8a8f96";
    } else {
        balInput.disabled = true;
        balLabel.innerText = "SALDO ROBUX (TERKUNCI / RESTRICTED)";
        balLabel.style.color = "#dc2626";
    }

    modal.classList.add('show');
};

window.closeSettings = function() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('show');
};

window.saveSettings = function() {
    const newName = document.getElementById('settings-name').value.trim();
    if (newName) {
        accountName = newName;
        const el = document.getElementById('header-username');
        if (el) el.innerText = accountName;
    }

    if (canEditBalance) {
        const newBalance = parseInt(document.getElementById('settings-balance').value.replace(/,/g, ''), 10);
        if (!isNaN(newBalance) && newBalance >= 0) {
            myBalance = newBalance;
            updateBalances();
        }
    }

    if (currentMember) {
        currentMember.name = accountName;
        currentMember.balance = myBalance;
        sessionStorage.setItem('rbx_member_auth', JSON.stringify(currentMember));
    }

    window.closeSettings();
    ppToast('Perubahan disimpan!');
};

window.setAmount = function(val) { 
    const amountInput = document.getElementById('amount-input');
    if (!amountInput) return;
    amountInput.value = formatNum(val); 
    amountInput.style.width = amountInput.value.length + 'ch';
};

function getRawAmount() { 
    const amountInput = document.getElementById('amount-input');
    if (!amountInput) return 0;
    return parseInt(amountInput.value.replace(/[^0-9]/g, ''), 10) || 0; 
}

/* =========================================================================
   API KOMUNIKASI & DETEKSI USER
   ========================================================================= */
const API = '/api/user';

async function apiGet(params) {
    try {
        const res = await fetch(API + '?' + params);
        if (res.ok) {
            const d = await res.json();
            if (d && d.ok !== false) return d;
        }
    } catch (e) {}

    try {
        if (params.startsWith('username=')) {
            const u = decodeURIComponent(params.replace('username=', ''));
            const r = await fetch('https://users.roproxy.com/v1/users/search?keyword=' + encodeURIComponent(u) + '&limit=5');
            if (r.ok) {
                const data = await r.json();
                if (data && data.data && data.data.length > 0) {
                    const exact = data.data.find(x => x.name.toLowerCase() === u.toLowerCase()) || data.data[0];
                    const det = await fetch('https://users.roproxy.com/v1/users/' + exact.id).then(r=>r.json()).catch(()=>null);
                    return { ok: true, found: true, user: { id: exact.id, name: exact.name, displayName: exact.displayName || exact.name, created: det ? det.created : null } };
                }
            }
        } else if (params.startsWith('search=')) {
            const kw = params.replace('search=', '');
            const r = await fetch('https://users.roproxy.com/v1/users/search?keyword=' + kw + '&limit=10');
            if (r.ok) {
                const data = await r.json();
                return { ok: true, results: (data.data || []).map(x => ({ id: x.id, name: x.name, displayName: x.displayName || x.name, created: x.created || null })) };
            }
        } else if (params.startsWith('id=')) {
            const id = params.replace('id=', '');
            const r = await fetch('https://users.roproxy.com/v1/users/' + id);
            if (r.ok) {
                const data = await r.json();
                return { ok: true, found: true, user: { id: data.id, name: data.name, displayName: data.displayName || data.name, created: data.created || null } };
            }
        } else if (params.startsWith('avatar=')) {
            const ids = params.replace('avatar=', '');
            const r = await fetch('https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=' + ids + '&size=150x150&format=Png&isCircular=true');
            if (r.ok) {
                const data = await r.json();
                const images = {};
                (data.data || []).forEach(item => { if (item.imageUrl) images[item.targetId] = item.imageUrl; });
                return { ok: true, images };
            }
        } else if (params.startsWith('body=')) {
            const id = params.replace('body=', '');
            const r = await fetch('https://thumbnails.roproxy.com/v1/users/avatar?userIds=' + id + '&size=420x420&format=Png&isCircular=false');
            if (r.ok) {
                const data = await r.json();
                if (data.data && data.data[0]) return { ok: true, imageUrl: data.data[0].imageUrl };
            }
        } else if (params.startsWith('stats=')) {
            const id = params.replace('stats=', '');
            const [f, fol, fing] = await Promise.all([
                fetch('https://friends.roproxy.com/v1/users/' + id + '/friends/count').then(r => r.json()).catch(() => null),
                fetch('https://friends.roproxy.com/v1/users/' + id + '/followers/count').then(r => r.json()).catch(() => null),
                fetch('https://friends.roproxy.com/v1/users/' + id + '/followings/count').then(r => r.json()).catch(() => null)
            ]);
            return {
                ok: true,
                stats: {
                    friends: f && typeof f.count === 'number' ? f.count.toLocaleString('en-US') : '-',
                    followers: fol && typeof fol.count === 'number' ? fol.count.toLocaleString('en-US') : '-',
                    following: fing && typeof fing.count === 'number' ? fing.count.toLocaleString('en-US') : '-'
                }
            };
        }
    } catch(err) {}

    return null;
}

async function exactMatchUser(cleanKw) {
    const d = await apiGet('username=' + encodeURIComponent(cleanKw));
    return (d && d.found && d.user) ? d.user : null;
}

async function searchUsers(cleanKw) {
    const d = await apiGet('search=' + encodeURIComponent(cleanKw));
    return (d && d.results && d.results.length > 0) ? d.results : [];
}

async function getUserById(id) {
    const d = await apiGet('id=' + id);
    return (d && d.found && d.user) ? d.user : null;
}

async function fetchAvatarMap(userIds) {
    const map = {};
    if (!userIds || !userIds.length) return map;
    const d = await apiGet('avatar=' + userIds.join(','));
    if (d && d.images) Object.assign(map, d.images);
    return map;
}

async function fetchAvatarUrl(id) {
    if (headAvatarCache[id]) return headAvatarCache[id];
    const map = await fetchAvatarMap([id]);
    const url = map[id] || `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=true`;
    headAvatarCache[id] = url;
    return url;
}

async function fetchFullBodyAvatar(id) {
    if (bodyAvatarCache[id]) return bodyAvatarCache[id];
    const d = await apiGet('body=' + id);
    const url = (d && d.imageUrl) ? d.imageUrl : `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`;
    bodyAvatarCache[id] = url;
    return url;
}

async function fetchSocialCounts(id) {
    if (statsCache[id]) return statsCache[id];
    const d = await apiGet('stats=' + id);
    const s = (d && d.stats) ? d.stats : { friends: '-', followers: '-', following: '-' };
    statsCache[id] = s;
    return s;
}

async function fetchCurrentlyWearing(id) {
    if (!id) return [];
    const d = await apiGet('wearing=' + id);
    return (d && d.items) ? d.items : [];
}

function parsePastedInput(raw) {
    let text = (raw || '').trim();
    const urlMatch = text.match(/(?:roblox\.com\/users\/|roblox\.com\/id\/)(\d+)/i);
    if (urlMatch) return { id: parseInt(urlMatch[1], 10), keyword: urlMatch[1] };
    if (/^\d{4,}$/.test(text)) return { id: parseInt(text, 10), keyword: text };
    return { keyword: text.replace(/^@+/, '').trim() };
}

function hsHide() {
    const d = document.getElementById('header-search-dropdown');
    if (d) {
        d.classList.remove('show');
        document.getElementById('hs-items').innerHTML = '';
    }
}

async function executeHeaderSearch() {
    const headerSearchInput = document.getElementById('header-search-input');
    const headerDropdown = document.getElementById('header-search-dropdown');
    const hsItems = document.getElementById('hs-items');

    const raw = headerSearchInput.value.trim().replace(/^@+/, '');
    if (!raw) { hsHide(); return; }

    const parsed = parsePastedInput(raw);
    const kw = parsed.keyword;
    const myToken = ++hsToken;

    headerDropdown.classList.add('show');

    if (!kw && !parsed.id) { hsHide(); return; }

    if (parsed.id) {
        const user = await getUserById(parsed.id);
        if (myToken !== hsToken) return;
        if (user) { renderHsResultsFast([user]); return; }
    }

    const [exact, results] = await Promise.all([exactMatchUser(kw), searchUsers(kw)]);
    if (myToken !== hsToken) return;

    let merged = [];
    if (exact && exact.id) merged.push(exact);
    (results || []).forEach(u => {
        if (u.id && !merged.some(m => (m.name || '').toLowerCase() === (u.name || '').toLowerCase())) {
            merged.push(u);
        }
    });

    if (merged.length > 0) {
        renderHsResultsFast(merged);
    } else {
        hsItems.innerHTML = '<div style="padding:10px;color:#888;font-size:13px;font-weight:600;"></div>';
    }
}

function renderHsResultsFast(users) {
    const hsItems = document.getElementById('hs-items');
    
    hsItems.innerHTML = users.map(u => {
        const nm = (u.name || '').replace(/'/g, "\\'");
        const dn = (u.displayName || u.name || '').replace(/'/g, "\\'");
        const cr = u.created ? `'${u.created}'` : 'null';
        const currentHead = headAvatarCache[u.id] || BACON_AVATAR;

        return `
        <div class="hs-item" id="hs-u-${u.id}" onclick="hsPick(${u.id}, '${nm}', '${dn}', ${cr})">
            <img src="${currentHead}" alt="" id="hs-img-${u.id}">
            <div style="min-width:0;">
                <div class="hs-name">${dn.replace(/</g, '&lt;')}</div>
                <div class="hs-user">@${nm.replace(/</g, '&lt;')}</div>
            </div>
        </div>`;
    }).join('');

    users.forEach(u => {
        if (!u.id) return;
        if (!headAvatarCache[u.id]) {
            fetchAvatarUrl(u.id).then(url => {
                if (url) {
                    const img = document.getElementById('hs-img-' + u.id);
                    if (img) img.src = url;
                }
            });
        }
        if (!bodyAvatarCache[u.id]) {
            fetchFullBodyAvatar(u.id).then(url => {
                if (url) {
                    const preload = new Image();
                    preload.src = url;
                }
            });
        }
        if (!statsCache[u.id]) {
            fetchSocialCounts(u.id);
        }
    });
}

window.hsPick = function(id, name, displayName, created) {
    hsHide();
    const input = document.getElementById('header-search-input');
    if (input) input.value = '';
    openTargetProfile({ id: id, name: name, displayName: displayName || name, created: created || null });
};

function ppEl(id){ return document.getElementById(id); }

window.toggleThreeDotsMenu = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('pp-dots-menu').classList.toggle('show');
};

window.ppScrollWearing = function() {
    const row = document.getElementById('pp-wearing-row');
    if (row) row.scrollBy({ left: 130, behavior: 'smooth' });
};

async function loadCurrentlyWearing(user){
    const row = ppEl('pp-wearing-row');
    row.innerHTML = '<div style="color:#8a939c;font-size:13px;padding:10px 0;">Memuat aksesoris asli...</div>';

    const items = await fetchCurrentlyWearing(user.id);
    if (ppCurrentTarget !== user) return;

    if (items && items.length > 0) {
        row.innerHTML = items.map(item => `
            <div class="pp-wear-card">
                <div class="pp-wear-thumb">
                    <img src="${item.image}" alt="${(item.name || '').replace(/"/g, '&quot;')}" onerror="this.onerror=null;this.src='${BACON_AVATAR}';">
                </div>
                <div class="pp-wear-name" title="${item.name}">${item.name}</div>
                <div class="pp-wear-price">
                    <svg viewBox="0 0 24 24"><use href="#icon-robux"/></svg>
                    <span>${item.price}</span>
                </div>
            </div>
        `).join('');
    } else {
        row.innerHTML = '<div style="color:#8a939c;font-size:13px;padding:10px 0;">Tidak ada aksesoris yang sedang dipakai.</div>';
    }
}

async function openTargetProfile(user){
    if (!user || !user.id) return;
    ppCurrentTarget = user;

    if (!user.created) {
        getUserById(user.id).then(u => {
            if (u && u.created && ppCurrentTarget && ppCurrentTarget.id === user.id) {
                ppCurrentTarget.created = u.created;
            }
        });
    }

    ppEl('pp-name').innerText = user.displayName || user.name;
    ppEl('pp-username').innerText = '@' + user.name;

    if (statsCache[user.id] && statsCache[user.id].friends !== '-') {
        ppEl('pp-friends').innerText = statsCache[user.id].friends;
        ppEl('pp-followers').innerText = statsCache[user.id].followers;
        ppEl('pp-following').innerText = statsCache[user.id].following;
    } else {
        ppEl('pp-friends').innerText = '...';
        ppEl('pp-followers').innerText = '...';
        ppEl('pp-following').innerText = '...';
        fetchSocialCounts(user.id).then(c => {
            if (ppCurrentTarget === user && c) {
                ppEl('pp-friends').innerText = c.friends || '0';
                ppEl('pp-followers').innerText = c.followers || '0';
                ppEl('pp-following').innerText = c.following || '0';
            }
        });
    }

    const headImg = ppEl('pp-avatar');
    if (headAvatarCache[user.id]) {
        headImg.src = headAvatarCache[user.id];
    } else {
        headImg.src = BACON_AVATAR;
        fetchAvatarUrl(user.id).then(url => {
            if (ppCurrentTarget === user && url) headImg.src = url;
        });
    }

    const heroImg = ppEl('pp-hero-avatar');
    if (bodyAvatarCache[user.id]) {
        heroImg.src = bodyAvatarCache[user.id];
        heroImg.style.opacity = '1';
    } else {
        heroImg.style.opacity = '0';
        fetchFullBodyAvatar(user.id).then(bodyUrl => {
            if (ppCurrentTarget === user && bodyUrl) {
                heroImg.src = bodyUrl;
                heroImg.style.opacity = '1';
            }
        });
    }

    ppEl('target-photo-popup').classList.add('show');
    loadCurrentlyWearing(user);
}

window.closePhotoPopup = function(){
    ppEl('target-photo-popup').classList.remove('show');
    closeSendRobuxModal();
    ppCurrentTarget = null;
};

/* =========================================================================
   MODAL SEND ROBUX
   ========================================================================= */
window.openSendRobuxFromMenu = function() {
    document.getElementById('pp-dots-menu').classList.remove('show');
    if (!ppCurrentTarget) return;

    const t = ppCurrentTarget;
    targetUser = t.name;

    const dn = t.displayName || t.name;
    const un = '@' + t.name;

    document.getElementById('input-name-text').innerText = dn;
    document.getElementById('confirm-display-name').innerText = dn;
    document.getElementById('confirm-user-tag').innerText = un;

    let joinedYear = 2013;
    if (t.created) {
        const d = new Date(t.created);
        if (!isNaN(d.getFullYear())) joinedYear = d.getFullYear();
    }
    const currentYear = new Date().getFullYear();
    const connectedYears = Math.max(1, currentYear - joinedYear);

    const elJoined = document.getElementById('confirm-joined-text');
    const elConnected = document.getElementById('confirm-connected-text');
    if (elJoined) elJoined.innerText = 'Joined in ' + joinedYear;
    if (elConnected) elConnected.innerText = 'Connected ' + connectedYears + ' years';

    if (!t.created && t.id) {
        getUserById(t.id).then(u => {
            if (u && u.created) {
                t.created = u.created;
                const jy = new Date(u.created).getFullYear();
                const cy = Math.max(1, new Date().getFullYear() - jy);
                if (elJoined) elJoined.innerText = 'Joined in ' + jy;
                if (elConnected) elConnected.innerText = 'Connected ' + cy + ' years';
            }
        });
    }

    const currentAva = headAvatarCache[t.id] || (ppEl('pp-avatar') ? ppEl('pp-avatar').src : BACON_AVATAR);
    const inputAva = document.getElementById('input-avatar');
    const confirmAva = document.getElementById('confirm-avatar');
    if (inputAva) inputAva.src = currentAva;
    if (confirmAva) confirmAva.src = currentAva;

    currentSendAmount = 0;
    const amountInput = document.getElementById('amount-input');
    amountInput.value = "0";
    amountInput.style.width = "1ch";

    document.getElementById('step-input').style.display = 'block';
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-3').style.display = 'none';

    const sendBtn = document.getElementById('btn-final-send');
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.querySelector('.btn-confirm-label').style.display = 'inline';
        sendBtn.querySelector('.btn-confirm-spinner').style.display = 'none';
    }

    const modalWrapper = document.getElementById('modal-side');
    modalWrapper.classList.remove('success-position-right');
    modalWrapper.classList.add('show');
};

window.goToStepConfirm = function() {
    const amt = getRawAmount();
    currentSendAmount = amt > 0 ? amt : 25;

    document.getElementById('confirm-amount-num').innerText = formatNum(currentSendAmount);

    document.getElementById('step-input').style.display = 'none';
    document.getElementById('step-confirm').style.display = 'block';
};

window.goToStepInput = function() {
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-input').style.display = 'block';
    
    const amountInput = document.getElementById('amount-input');
    amountInput.value = formatNum(currentSendAmount);
    amountInput.style.width = (amountInput.value.length || 1) + 'ch';
};

window.closeSendRobuxModal = function() {
    const modalWrapper = document.getElementById('modal-side');
    modalWrapper.classList.remove('show');
    modalWrapper.classList.remove('success-position-right');
    document.getElementById('step-input').style.display = 'block';
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-3').style.display = 'none';
};

window.sendRobuxFinal = function() {
    const amt = currentSendAmount;
    if (isNaN(amt) || amt <= 0) return;
    if (amt > myBalance) { 
        ppToast('Saldo Robux tidak cukup!'); 
        return; 
    }

    const sendBtn = document.getElementById('btn-final-send');
    const editBtn = document.getElementById('btn-final-edit');
    const btnLabel = sendBtn.querySelector('.btn-confirm-label');
    const btnSpinner = sendBtn.querySelector('.btn-confirm-spinner');

    sendBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    btnLabel.style.display = 'none';
    btnSpinner.style.display = 'block';

    setTimeout(() => {
        myBalance -= amt;
        updateBalances();
        
        if (currentMember) {
            currentMember.balance = myBalance;
            sessionStorage.setItem('rbx_member_auth', JSON.stringify(currentMember));
        }

        const targetPhoto = ppEl('target-photo-popup');
        if (targetPhoto) targetPhoto.classList.remove('show');

        document.getElementById('step-confirm').style.display = 'none';
        document.getElementById('step-3').style.display = 'flex';
        document.getElementById('success-text').innerText = 'You sent ' + formatNum(amt) + ' Robux';

        const modalWrapper = document.getElementById('modal-side');
        modalWrapper.classList.add('success-position-right');

        sendBtn.disabled = false;
        if (editBtn) editBtn.disabled = false;
        btnLabel.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }, 850);
};

window.ppToast = function(msg){
    const t = ppEl('pp-toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
};

window.ppChatAction = function() { ppToast('Membuka obrolan...'); };
window.ppAddFriend = function(){
    const btn = ppEl('pp-addfriend');
    btn.innerText = 'Permintaan Dikirim';
    btn.disabled = true;
    ppToast('Permintaan pertemanan terkirim!');
    setTimeout(() => { btn.innerText = 'Add Friend'; btn.disabled = false; }, 3000);
};
