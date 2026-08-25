/* ===================================================================
   AYATI — app.js
   Relationship keeper: router, auth, all features
   DataStore is loaded globally from firebase-config.js
   =================================================================== */

// ─── State ────────────────────────────────────────────────────────
let currentUser = null;   // "ali" | "aya"
let currentView = 'login';
let passcodeBuffer = '';
let selectedLoginUser = null;
let countdownInterval = null;

// Anniversary date: 05/07/2026 (July 5, 2026)
const ANNIVERSARY = new Date('2026-07-05T00:00:00');

// ─── DOM Cache ────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===================================================================
// INIT
// ===================================================================
(async function init() {
    await DataStore.init();

    // Check saved session
    const saved = DataStore.getUser();
    if (saved) {
        currentUser = saved;
        updateThemeColor(currentUser);
        navigateTo('dashboard');
    }

    setupLogin();
    setupNavigation();
    setupLoveBurst();
    setupSparkle();
    setupMusic();
    initHeartsCanvas();
    setupRealtimeNotifications();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch((e) => console.log('SW reg failed:', e));
        });
    }
})();

// ─── Theme Color Update ───────────────────────────────────────────
function updateThemeColor(user) {
    const meta = $('meta[name="theme-color"]');
    if (!meta) return;
    if (user === 'ali') meta.content = '#2d132c';
    else if (user === 'aya') meta.content = '#3b0a30';
    else meta.content = '#1a0a1e';
}

// ─── Native Web Audio SoundFX for iOS ─────────────────────────────
const SoundFX = (() => {
    let ctx = null;
    function getCtx() {
        if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
        return ctx;
    }

    return {
        tap(freq = 580, duration = 0.03) {
            try {
                const c = getCtx();
                if (!c) return;
                const osc = c.createOscillator();
                const gain = c.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(160, c.currentTime + duration);
                gain.gain.setValueAtTime(0.06, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start();
                osc.stop(c.currentTime + duration);
            } catch (e) {}
        },
        pop() {
            try {
                const c = getCtx();
                if (!c) return;
                const osc = c.createOscillator();
                const gain = c.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(820, c.currentTime + 0.08);
                gain.gain.setValueAtTime(0.1, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start();
                osc.stop(c.currentTime + 0.09);
            } catch (e) {}
        },
        success() {
            try {
                const c = getCtx();
                if (!c) return;
                [523.25, 659.25, 783.99].forEach((freq, i) => {
                    const osc = c.createOscillator();
                    const gain = c.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.06);
                    gain.gain.setValueAtTime(0.08, c.currentTime + i * 0.06);
                    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.18);
                    osc.connect(gain);
                    gain.connect(c.destination);
                    osc.start(c.currentTime + i * 0.06);
                    osc.stop(c.currentTime + i * 0.06 + 0.18);
                });
            } catch (e) {}
        },
        error() {
            try {
                const c = getCtx();
                if (!c) return;
                [220, 175].forEach((freq, i) => {
                    const osc = c.createOscillator();
                    const gain = c.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.08);
                    gain.gain.setValueAtTime(0.08, c.currentTime + i * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.12);
                    osc.connect(gain);
                    gain.connect(c.destination);
                    osc.start(c.currentTime + i * 0.08);
                    osc.stop(c.currentTime + i * 0.08 + 0.12);
                });
            } catch (e) {}
        }
    };
})();

// ─── Mobile Haptics ───────────────────────────────────────────────
function triggerHaptic(type = 'light') {
    if (navigator.vibrate) {
        if (type === 'light') navigator.vibrate(10);
        else if (type === 'medium') navigator.vibrate(25);
        else if (type === 'success') navigator.vibrate([15, 30, 20]);
        else if (type === 'error') navigator.vibrate([50, 40, 50]);
    }
}

// ===================================================================
// ROUTER
// ===================================================================
function navigateTo(viewId, pushState = true) {
    const prev = $(`.view.active`);
    const next = $(`#view-${viewId}`);
    if (!next || (prev === next)) return;

    if (pushState) {
        history.pushState({ view: viewId }, '', `#${viewId}`);
    }

    // Slide out old view
    if (prev) {
        prev.classList.add('slide-out');
        prev.classList.remove('active');
        setTimeout(() => prev.classList.remove('slide-out'), 400);
    }

    // Slide in new view
    next.classList.add('active');
    currentView = viewId;

    // Load view data
    switch (viewId) {
        case 'dashboard': loadDashboard(); break;
        case 'letters': loadLetters(); break;
        case 'memories': loadMemories(); break;
        case 'timeline': loadTimeline(); break;
        case 'countdown': loadCountdown(); break;
        case 'mood': loadMood(); break;
        case 'bucketlist': loadBucketList(); break;
        case 'lovenotes': loadLoveNotes(); break;
        case 'daily': loadDailyQuestion(); break;
        case 'voicenotes': loadVoiceNotes(); break;
    }
}

// ===================================================================
// NAVIGATION SETUP
// ===================================================================
function setupNavigation() {
    // Mobile Back Button / Gesture handling
    window.addEventListener('popstate', (e) => {
        if (!$('#modal-overlay').hidden) {
            closeModal();
            return;
        }
        if (!$('#lightbox').hidden) {
            $('#lightbox').hidden = true;
            return;
        }
        const view = e.state?.view || (currentUser ? 'dashboard' : 'login');
        navigateTo(view, false);
    });

    // iOS Left-Edge Swipe to go back gesture
    let edgeStartX = 0, edgeStartY = 0;
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        edgeStartX = e.touches[0].clientX;
        edgeStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (edgeStartX > 45) return; // Only trigger if touch started within 45px of screen edge
        if (currentView === 'dashboard' || currentView === 'login') return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - edgeStartX;
        const dy = Math.abs(touch.clientY - edgeStartY);
        if (dx > 70 && dy < 60) {
            triggerHaptic('light');
            SoundFX.tap(520);
            navigateTo('dashboard');
        }
        edgeStartX = 0;
        edgeStartY = 0;
    }, { passive: true });

    // Feature grid buttons
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-nav]');
        if (navBtn) {
            triggerHaptic('light');
            SoundFX.tap(650);
            navigateTo(navBtn.dataset.nav);
        }
    });

    // Settings button
    $('#settings-btn')?.addEventListener('click', () => {
        triggerHaptic('medium');
        openModal(createSettingsForm());
    });

    // Slideshow button
    $('#slideshow-btn')?.addEventListener('click', () => {
        triggerHaptic('medium');
        startMemorySlideshow();
    });

    // Miss You button
    $('#miss-you-btn')?.addEventListener('click', async () => {
        triggerHaptic('success');
        SoundFX.pop();
        triggerLoveBurstAnim();
        const partner = DataStore.getPartner(currentUser);
        const myName = currentUser === 'ali' ? 'Ali 💙' : 'Aya 💗';
        await DataStore.add('missyou', {
            from: currentUser,
            to: partner
        });
        sendRemotePushNotification(partner, 'I Miss You! 💖', `${myName} just sent you love & missed you!`);
        toast('Sent "I Miss You" 💕');
    });

    // Logout
    $('#logout-btn')?.addEventListener('click', () => {
        triggerHaptic('medium');
        DataStore.clearUser();
        currentUser = null;
        updateThemeColor(null);
        navigateTo('login');
        // Reset login UI
        $('#login-select').hidden = false;
        $('#login-code').hidden = true;
    });

    // FAB buttons
    $('#fab-letter')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createLetterForm()); });
    $('#fab-memory')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createMemoryForm()); });
    $('#fab-timeline')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createTimelineForm()); });
    $('#fab-countdown')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createCountdownForm()); });
    $('#fab-bucket')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createBucketForm()); });
    $('#fab-lovenote')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createLoveNoteForm()); });
    $('#fab-voicenote')?.addEventListener('click', () => { triggerHaptic('light'); openModal(createVoiceRecorderForm()); });

    // Modal close
    $('#modal-close')?.addEventListener('click', closeModal);
    $('#modal-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Modal drag down to dismiss gesture on mobile
    const modalCard = $('#modal-card');
    let touchStartY = 0, touchCurrentY = 0;
    modalCard?.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchCurrentY = touchStartY;
    }, { passive: true });
    modalCard?.addEventListener('touchmove', (e) => {
        touchCurrentY = e.touches[0].clientY;
        const diff = touchCurrentY - touchStartY;
        if (diff > 0 && modalCard.scrollTop <= 0) {
            modalCard.style.transform = `translateY(${diff}px)`;
        }
    }, { passive: true });
    modalCard?.addEventListener('touchend', () => {
        const diff = touchCurrentY - touchStartY;
        if (diff > 70 && modalCard.scrollTop <= 0) {
            triggerHaptic('medium');
            closeModal();
        }
        modalCard.style.transform = '';
        touchStartY = 0;
        touchCurrentY = 0;
    });

    // Lightbox close
    $('#lightbox-close')?.addEventListener('click', () => {
        $('#lightbox').hidden = true;
    });
    $('#lightbox')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) $('#lightbox').hidden = true;
    });
}

// ===================================================================
// LOGIN
// ===================================================================
function setupLogin() {
    // User selection
    $$('.login-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            triggerHaptic('medium');
            selectedLoginUser = btn.dataset.user;
            const name = selectedLoginUser === 'ali' ? 'Ali 💙' : 'Aya 💗';
            $('#login-code-prompt').textContent = `Welcome ${name} — Enter your PIN`;
            $('#login-select').hidden = true;
            $('#login-code').hidden = false;
            passcodeBuffer = '';
            updatePasscodeDots();
            $('#login-error').textContent = '';
        });
    });

    // Back button
    $('#login-back')?.addEventListener('click', () => {
        triggerHaptic('light');
        $('#login-select').hidden = false;
        $('#login-code').hidden = true;
        selectedLoginUser = null;
        passcodeBuffer = '';
    });

    // Keypad
    $$('.key-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            triggerHaptic('light');
            SoundFX.tap(620);
            const key = btn.dataset.key;
            if (key === 'clear') {
                passcodeBuffer = passcodeBuffer.slice(0, -1);
            } else if (key === 'enter') {
                verifyPasscode();
                return;
            } else if (passcodeBuffer.length < 4) {
                passcodeBuffer += key;
            }
            updatePasscodeDots();
            $('#login-error').textContent = '';

            // Auto-submit on 4 digits
            if (passcodeBuffer.length === 4) {
                setTimeout(verifyPasscode, 200);
            }
        });
    });
}

function updatePasscodeDots() {
    const dots = $$('#passcode-dots span');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < passcodeBuffer.length);
    });
    $('#passcode-dots').classList.remove('error');
}

function verifyPasscode() {
    const codes = DataStore.getPasscodes();
    if (passcodeBuffer === codes[selectedLoginUser]) {
        // Success
        triggerHaptic('success');
        SoundFX.success();
        currentUser = selectedLoginUser;
        DataStore.setUser(currentUser);
        updateThemeColor(currentUser);
        navigateTo('dashboard');
        // Prompt for notification permission & register push subscription on login
        if ('Notification' in window) {
            setTimeout(() => registerPushSubscription(currentUser), 1000);
        }
        // Smoothly start music upon login unlock
        startMusicOnUnlock();
    } else {
        // Error
        triggerHaptic('error');
        SoundFX.error();
        $('#passcode-dots').classList.add('error');
        $('#login-error').textContent = 'Incorrect PIN ❌';
        setTimeout(() => {
            passcodeBuffer = '';
            updatePasscodeDots();
        }, 500);
    }
}

// ===================================================================
// DASHBOARD
// ===================================================================
function loadDashboard() {
    const partner = DataStore.getPartner(currentUser);
    const isAli = currentUser === 'ali';
    const name = isAli ? 'Ali' : 'Aya';
    const partnerName = isAli ? 'Aya' : 'Ali';
    const cssClass = isAli ? 'user-ali' : 'user-aya';

    // Greeting
    $('#dash-hello').innerHTML = `Welcome <span class="${cssClass}">${name}</span> 💕`;

    // Days counter
    const diff = Date.now() - ANNIVERSARY.getTime();
    const days = Math.floor(diff / 86400000);
    $('#dash-days').textContent = `${days} days of love together 💕`;

    // Partner mood
    $('#dash-partner-name').textContent = `${partnerName} is feeling`;
    DataStore.getTodayMood(partner).then(mood => {
        if (mood) {
            $('#dash-partner-mood').textContent = mood.emoji;
            $('#dash-partner-status').textContent = 'Today';
        } else {
            $('#dash-partner-mood').textContent = '🤍';
            $('#dash-partner-status').textContent = 'Not checked in yet';
        }
    });

    // Love note
    const quote = DataStore.getRandomQuote();
    $('#dash-note-text').textContent = quote;
    $('#dash-note-from').textContent = '';

    // Unread letters badge
    DataStore.getAll('letters').then(letters => {
        const unread = letters.filter(l => l.to === currentUser && !l.read).length;
        const badge = $('#unread-badge');
        if (unread > 0) {
            badge.hidden = false;
            badge.textContent = unread;
        } else {
            badge.hidden = true;
        }
    });

    // Recent Miss You check
    DataStore.getAll('missyou').then(pings => {
        const latest = pings.find(p => p.to === currentUser);
        if (latest && (Date.now() - latest.createdAt) < 7200000) { // within 2 hours
            toast(`${partnerName} missed you recently! 💕`);
        }
    });
}

// ===================================================================
// LETTERS (With Time-Lock Capsule support)
// ===================================================================
async function loadLetters() {
    const container = $('#letters-list');
    const letters = await DataStore.getAll('letters');

    if (letters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-emoji">💌</span>
                <p class="empty-state-text">No letters yet<br>Write your first love letter!</p>
            </div>`;
        return;
    }

    container.innerHTML = letters.map(l => {
        const isUnread = l.to === currentUser && !l.read;
        const fromName = l.from === 'ali' ? 'Ali 💙' : 'Aya 💗';
        const date = new Date(l.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const isLocked = l.unlockDate && (new Date(l.unlockDate).getTime() > Date.now()) && l.to === currentUser;
        const unlockFormatted = l.unlockDate ? new Date(l.unlockDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

        return `
            <div class="letter-item glass ${isUnread ? 'unread' : ''} ${isLocked ? 'locked' : ''}" data-letter-id="${l.id}">
                <div class="letter-item-header">
                    <span class="letter-item-from">${fromName}</span>
                    ${isLocked ? `<span class="lock-pill">🔒 Sealed until ${unlockFormatted}</span>` : `<span class="letter-item-date">${date}</span>`}
                </div>
                <p class="letter-item-preview ${isLocked ? 'letter-preview-locked' : ''}">
                    ${isLocked ? 'This love letter is sealed until ' + unlockFormatted + ' 🔒' : l.content}
                </p>
            </div>`;
    }).join('');

    // Click to read
    container.querySelectorAll('.letter-item').forEach(el => {
        el.addEventListener('click', () => openLetter(el.dataset.letterId));
    });
}

async function openLetter(id) {
    const letters = await DataStore.getAll('letters');
    const letter = letters.find(l => l.id === id);
    if (!letter) return;

    // Check if time-locked
    if (letter.unlockDate && (new Date(letter.unlockDate).getTime() > Date.now()) && letter.to === currentUser) {
        SoundFX.error();
        triggerHaptic('error');
        const card = $(`[data-letter-id="${id}"]`);
        if (card) {
            card.classList.add('shake');
            setTimeout(() => card.classList.remove('shake'), 500);
        }
        const unlockDateStr = new Date(letter.unlockDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        toast(`🔒 Sealed until ${unlockDateStr}! Hold the anticipation 💕`);
        return;
    }

    // Mark as read
    if (letter.to === currentUser && !letter.read) {
        await DataStore.update('letters', id, { read: true });
    }

    const fromName = letter.from === 'ali' ? 'Ali 💙' : 'Aya 💗';
    const date = new Date(letter.createdAt).toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    openModal(`
        <h3 class="modal-title">💌</h3>
        <p class="letter-detail-from">From ${fromName}</p>
        <p class="letter-detail-date">${date}</p>
        <p class="letter-detail-body">${letter.content}</p>
        <button class="delete-btn" id="delete-letter-${id}">Delete Letter</button>
    `);

    $(`#delete-letter-${id}`)?.addEventListener('click', async () => {
        await DataStore.remove('letters', id);
        closeModal();
        loadLetters();
        toast('Letter deleted 🗑️');
    });
}

function createLetterForm() {
    const partner = DataStore.getPartner(currentUser);
    const partnerName = partner === 'ali' ? 'Ali' : 'Aya';
    return `
        <h3 class="modal-title">Write a letter to ${partnerName} 💌</h3>
        <div class="form-group">
            <textarea class="form-textarea" id="letter-content" placeholder="Write from your heart..." rows="6"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">🔒 Time-Lock Capsule (Optional)</label>
            <input class="form-input" type="date" id="letter-unlock-date" />
            <p style="font-size:0.75rem;color:rgba(255,255,255,0.45);margin-top:0.35rem;">
                Keep this letter sealed until a future anniversary or special date!
            </p>
        </div>
        <button class="form-submit" id="send-letter">Send 💕</button>
    `;
}

// ===================================================================
// MEMORIES
// ===================================================================
async function loadMemories() {
    const container = $('#memories-grid');
    const memories = await DataStore.getAll('memories');

    if (memories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <span class="empty-state-emoji">📸</span>
                <p class="empty-state-text">No memories yet<br>Add our first photo!</p>
            </div>`;
        return;
    }

    container.innerHTML = memories.map(m => `
        <div class="memory-card" data-memory-id="${m.id}">
            <img src="${m.image}" alt="${m.caption || 'Memory'}" loading="lazy" />
            <div class="memory-card-overlay">
                <p class="memory-card-caption">${m.caption || ''}</p>
                <p class="memory-card-date">${m.date || ''}</p>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.memory-card').forEach(el => {
        el.addEventListener('click', () => openLightbox(el.dataset.memoryId));
    });
}

function openLightbox(id) {
    DataStore.getAll('memories').then(memories => {
        const m = memories.find(x => x.id === id);
        if (!m) return;
        $('#lightbox-img').src = m.image;
        $('#lightbox-caption').textContent = m.caption || '';
        $('#lightbox').hidden = false;
    });
}

function createMemoryForm() {
    return `
        <h3 class="modal-title">Add Memory 📸</h3>
        <div class="form-group">
            <input type="file" accept="image/*" class="form-file" id="memory-file" />
            <label for="memory-file" class="form-file-label" id="memory-file-label">
                📷 Choose a photo
            </label>
            <img class="form-file-preview" id="memory-preview" />
        </div>
        <div class="form-group">
            <input class="form-input" id="memory-caption" placeholder="What was special about this moment?" />
        </div>
        <div class="form-group">
            <input class="form-input" type="date" id="memory-date" />
        </div>
        <button class="form-submit" id="save-memory">Save Memory 💕</button>
    `;
}

// ===================================================================
// TIMELINE
// ===================================================================
async function loadTimeline() {
    const container = $('#timeline-list');
    const items = await DataStore.getAll('timeline');

    // Sort by createdAt ascending for timeline
    items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-emoji">📅</span>
                <p class="empty-state-text">Start our story!<br>Add our first special milestone</p>
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="tl-item">
            <div class="tl-dot"></div>
            <div class="tl-card glass">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                ${item.date ? `<p class="tl-card-date">${item.date}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function createTimelineForm() {
    return `
        <h3 class="modal-title">Add Milestone 📅</h3>
        <div class="form-group">
            <input class="form-input" id="tl-title" placeholder="Moment title" />
        </div>
        <div class="form-group">
            <textarea class="form-textarea" id="tl-desc" placeholder="What happened?" rows="3"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Date (optional)</label>
            <input class="form-input" type="date" id="tl-date" />
        </div>
        <button class="form-submit" id="save-timeline">Save Milestone 💕</button>
    `;
}

// ===================================================================
// COUNTDOWN
// ===================================================================
function loadCountdown() {
    const container = $('#countdown-content');

    // Main "days together" counter
    const diff = Date.now() - ANNIVERSARY.getTime();
    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    DataStore.getAll('countdowns').then(countdowns => {
        const upcoming = countdowns.filter(c => c.type === 'until');

        container.innerHTML = `
            <div class="cd-main glass">
                <p class="cd-main-title">Together in Love 💕</p>
                <div class="cd-grid">
                    <div class="cd-unit">
                        <span class="cd-number" id="cd-days">${days}</span>
                        <span class="cd-label">Days</span>
                    </div>
                    <div class="cd-unit">
                        <span class="cd-number" id="cd-hours">${String(hours).padStart(2, '0')}</span>
                        <span class="cd-label">Hours</span>
                    </div>
                    <div class="cd-unit">
                        <span class="cd-number" id="cd-min">${String(minutes).padStart(2, '0')}</span>
                        <span class="cd-label">Minutes</span>
                    </div>
                    <div class="cd-unit">
                        <span class="cd-number" id="cd-sec">${String(seconds).padStart(2, '0')}</span>
                        <span class="cd-label">Seconds</span>
                    </div>
                </div>
                <p class="cd-sub">…and forever to go 💕</p>
            </div>

            ${upcoming.length > 0 ? `
                <p class="cd-upcoming-title">📆 Upcoming Dates</p>
                ${upcoming.map(c => {
                    const target = new Date(c.date);
                    const daysLeft = Math.ceil((target - Date.now()) / 86400000);
                    return `
                        <div class="cd-item glass">
                            <span class="cd-item-days">${daysLeft > 0 ? daysLeft : '🎉'}</span>
                            <div class="cd-item-info">
                                <h4>${c.title}</h4>
                                <p>${daysLeft > 0 ? `${daysLeft} days left` : 'Today! 🎉'}</p>
                            </div>
                        </div>`;
                }).join('')}
            ` : ''}
        `;

        // Live ticker
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            const now = Date.now();
            const d = now - ANNIVERSARY.getTime();
            const ts = Math.floor(d / 1000);
            const el = (id) => document.getElementById(id);
            if (el('cd-days')) el('cd-days').textContent = Math.floor(ts / 86400);
            if (el('cd-hours')) el('cd-hours').textContent = String(Math.floor((ts % 86400) / 3600)).padStart(2, '0');
            if (el('cd-min')) el('cd-min').textContent = String(Math.floor((ts % 3600) / 60)).padStart(2, '0');
            if (el('cd-sec')) el('cd-sec').textContent = String(ts % 60).padStart(2, '0');
        }, 1000);
    });
}

function createCountdownForm() {
    return `
        <h3 class="modal-title">Add Special Date 📆</h3>
        <div class="form-group">
            <input class="form-input" id="cd-title" placeholder="What is the occasion?" />
        </div>
        <div class="form-group">
            <label class="form-label">Date</label>
            <input class="form-input" type="date" id="cd-date" />
        </div>
        <button class="form-submit" id="save-countdown">Save Date 💕</button>
    `;
}

// ===================================================================
// MOOD
// ===================================================================
async function loadMood() {
    const container = $('#mood-content');
    const partner = DataStore.getPartner(currentUser);
    const partnerName = partner === 'ali' ? 'Ali 💙' : 'Aya 💗';

    const todayMood = await DataStore.getTodayMood(currentUser);
    const partnerMood = await DataStore.getTodayMood(partner);
    const myHistory = await DataStore.getMoods(currentUser);

    const moods = [
        { emoji: '🥰', label: 'Love' },
        { emoji: '😊', label: 'Happy' },
        { emoji: '😴', label: 'Sleepy' },
        { emoji: '😢', label: 'Sad' },
        { emoji: '😤', label: 'Upset' },
        { emoji: '🤒', label: 'Sick' },
        { emoji: '😍', label: 'Adoring' },
        { emoji: '🥳', label: 'Excited' },
        { emoji: '😌', label: 'Peaceful' },
        { emoji: '💪', label: 'Strong' },
    ];

    container.innerHTML = `
        <p class="mood-section-title">How are you feeling today?</p>
        <div class="mood-grid">
            ${moods.map(m => `
                <button class="mood-btn ${todayMood?.emoji === m.emoji ? 'selected' : ''}" data-mood="${m.emoji}">
                    <span>${m.emoji}</span>
                    <span>${m.label}</span>
                </button>
            `).join('')}
        </div>

        <p class="mood-section-title">${partnerName} Today</p>
        <div class="mood-partner-card glass">
            <span class="partner-emoji">${partnerMood?.emoji || '🤍'}</span>
            <div class="partner-info">
                <p>${partnerName}</p>
                <p>${partnerMood ? 'Checked in today' : 'Not checked in yet'}</p>
            </div>
        </div>

        ${myHistory.length > 0 ? `
            <p class="mood-section-title">Recent Days</p>
            <div class="mood-history">
                ${myHistory.slice(0, 7).map(m => {
                    const d = new Date(m.date);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    return `
                        <div class="mood-day">
                            <span class="mood-day-emoji">${m.emoji}</span>
                            <span class="mood-day-label">${dayName}</span>
                        </div>`;
                }).join('')}
            </div>
        ` : ''}
    `;

    // Mood selection
    container.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const emoji = btn.dataset.mood;
            triggerHaptic('light');
            SoundFX.pop();
            await DataStore.setMood(currentUser, emoji);
            toast(`${emoji} Checked in!`);
            container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
}

// ===================================================================
// BUCKET LIST
// ===================================================================
async function loadBucketList() {
    const container = $('#bucketlist-content');
    const items = await DataStore.getAll('bucketlist');

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-emoji">📝</span>
                <p class="empty-state-text">No dreams yet<br>Add dreams to achieve together!</p>
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const by = item.addedBy === 'ali' ? 'Ali' : 'Aya';
        return `
            <div class="bucket-item glass ${item.completed ? 'done' : ''}" data-bucket-id="${item.id}">
                <span class="bucket-check">✓</span>
                <span class="bucket-text">${item.title}</span>
                <span class="bucket-by">${by}</span>
            </div>`;
    }).join('');

    container.querySelectorAll('.bucket-item').forEach(el => {
        el.addEventListener('click', async () => {
            const id = el.dataset.bucketId;
            const items = await DataStore.getAll('bucketlist');
            const item = items.find(i => i.id === id);
            if (!item) return;
            const newStatus = !item.completed;
            await DataStore.update('bucketlist', id, { completed: newStatus });
            if (newStatus) {
                triggerHaptic('success');
                SoundFX.success();
                triggerConfetti();
            } else {
                triggerHaptic('light');
                SoundFX.tap(400);
            }
            loadBucketList();
            toast(newStatus ? 'Achieved! 🎉' : 'Marked active');
        });
    });
}

function triggerConfetti() {
    const colors = ['#fd79a8', '#e84393', '#f9ca24', '#fab1a0', '#a29bfe', '#ffffff'];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('span');
        p.className = 'confetti-particle';
        p.style.left = (Math.random() * 100) + 'vw';
        p.style.top = '-10px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = p.style.height = (6 + Math.random() * 8) + 'px';
        p.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
        document.body.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
    }
}

let slideshowInterval = null;
function startMemorySlideshow() {
    DataStore.getAll('memories').then(memories => {
        if (memories.length === 0) {
            toast('Add memories first to watch the slideshow 📸');
            return;
        }
        let idx = 0;
        const showSlide = (i) => {
            const m = memories[i];
            $('#lightbox-img').src = m.image;
            $('#lightbox-caption').textContent = `${m.caption || ''} (${i + 1}/${memories.length})`;
            $('#lightbox').hidden = false;
        };
        showSlide(idx);
        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = setInterval(() => {
            idx = (idx + 1) % memories.length;
            showSlide(idx);
        }, 3500);

        const closeBtn = $('#lightbox-close');
        const origClose = closeBtn.onclick;
        closeBtn.onclick = () => {
            if (slideshowInterval) clearInterval(slideshowInterval);
            $('#lightbox').hidden = true;
            if (origClose) origClose();
        };
    });
}

function createBucketForm() {
    return `
        <h3 class="modal-title">Add Dream / Goal 📝</h3>
        <div class="form-group">
            <input class="form-input" id="bucket-title" placeholder="What do you want to do together?" />
        </div>
        <button class="form-submit" id="save-bucket">Add Dream 💕</button>
    `;
}

// ===================================================================
// LOVE NOTES
// ===================================================================
async function loadLoveNotes() {
    const container = $('#lovenotes-content');
    const notes = await DataStore.getAll('lovenotes');

    const allNotes = [...notes];

    if (allNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-emoji">💕</span>
                <p class="empty-state-text">No sweet notes yet<br>Write a sweet message!</p>
            </div>`;
        return;
    }

    container.innerHTML = allNotes.map(n => {
        const from = n.from === 'ali' ? 'Ali 💙' : 'Aya 💗';
        const date = new Date(n.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        return `
            <div class="lovenote-item glass">
                <p class="lovenote-text">${n.content}</p>
                <p class="lovenote-meta">From ${from} · ${date}</p>
            </div>`;
    }).join('');
}

function createLoveNoteForm() {
    return `
        <h3 class="modal-title">Write a Sweet Note 💕</h3>
        <div class="form-group">
            <textarea class="form-textarea" id="lovenote-content" placeholder="Words from the heart..." rows="4"></textarea>
        </div>
        <button class="form-submit" id="save-lovenote">Send 💕</button>
    `;
}

// ===================================================================
// DAILY COUPLE QUESTIONS (Q&A)
// ===================================================================
const DAILY_QUESTIONS = [
    "What was the exact moment you realized you had feelings for me?",
    "If we could teleport anywhere in the world together right now, where would we go?",
    "What is your favorite memory of us from this past month?",
    "What is a small habit of mine that secretly makes you smile?",
    "If our love story was turned into a movie, what would its title be?",
    "What is one song that always makes you think of me?",
    "What are you most excited for in our future together?",
    "What was your very first impression when you saw me for the first time?",
    "What is your absolute favorite thing we do together when we are relaxing?",
    "If you could describe our love in three words, what would they be?",
    "What is one dream you want us to accomplish together this year?",
    "What is something I did recently that made you feel deeply loved?",
    "What is your favorite photo of the two of us and why?",
    "If we had a whole day with no obligations, how would we spend it?",
    "What is one thing about me that always makes you laugh, no matter what?",
    "What is your favorite compliment I ever gave you?",
    "How have we helped each other grow since we met?",
    "What is a cute romantic date we haven't done yet that you want to try?",
    "What is something you appreciate about me that you don't say often enough?",
    "When do you feel most connected to me?"
];

function getTodayQuestion() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return {
        id: `q_${now.toISOString().split('T')[0]}`,
        date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        text: DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length]
    };
}

async function loadDailyQuestion() {
    const container = $('#daily-content');
    const today = getTodayQuestion();
    const allAnswers = await DataStore.getAll('dailyanswers');
    const partner = DataStore.getPartner(currentUser);
    const partnerName = partner === 'ali' ? 'Ali 💙' : 'Aya 💗';
    const myName = currentUser === 'ali' ? 'Ali 💙' : 'Aya 💗';

    const myAnswer = allAnswers.find(a => a.questionId === today.id && a.user === currentUser);
    const partnerAnswer = allAnswers.find(a => a.questionId === today.id && a.user === partner);
    const bothAnswered = !!(myAnswer && partnerAnswer);

    let html = `
        <div class="daily-q-box glass">
            <span class="daily-date-pill">📆 ${today.date}</span>
            <h3 class="daily-question-title">"${today.text}"</h3>
    `;

    if (!myAnswer) {
        html += `
            <div class="daily-answer-form">
                <textarea class="form-textarea" id="daily-answer-input" placeholder="Write your honest answer from the heart..." rows="4"></textarea>
                <button class="form-submit" id="save-daily-answer">Submit Answer 💕</button>
            </div>
        `;
    } else {
        html += `
            <div class="daily-answers-reveal">
                <div class="answer-bubble">
                    <div class="answer-bubble-header">
                        <span class="answer-author">${myName} (You)</span>
                        <span class="lock-pill">✅ Answered</span>
                    </div>
                    <p class="answer-text">${myAnswer.text}</p>
                </div>
        `;

        if (bothAnswered) {
            html += `
                <div class="answer-bubble">
                    <div class="answer-bubble-header">
                        <span class="answer-author">${partnerName}</span>
                        <span class="lock-pill">💕 Revealed</span>
                    </div>
                    <p class="answer-text">${partnerAnswer.text}</p>
                </div>
            </div>`;
        } else {
            html += `
            </div>
            <div class="partner-locked-banner">
                🔒 Waiting for ${partnerName} to answer...<br>
                Both answers will be revealed once you both respond!
            </div>`;
        }
    }

    html += `</div>`;

    // Past answered questions history
    const pastAnswers = allAnswers.filter(a => a.questionId !== today.id);
    if (pastAnswers.length > 0) {
        html += `<h4 style="margin:1.5rem 0 0.8rem;color:var(--peach);font-size:0.9rem;">📜 Past Questions</h4>`;
        const grouped = {};
        pastAnswers.forEach(a => {
            if (!grouped[a.questionId]) grouped[a.questionId] = { text: a.questionText, date: a.date, answers: [] };
            grouped[a.questionId].answers.push(a);
        });
        Object.values(grouped).forEach(g => {
            html += `
                <div class="dash-card glass" style="margin-bottom:0.75rem;padding:1rem;">
                    <p style="font-size:0.72rem;color:rgba(255,255,255,0.4);margin-bottom:0.3rem;">${g.date || 'Past'}</p>
                    <h5 style="font-size:0.95rem;margin-bottom:0.6rem;color:var(--white-soft);">${g.text || ''}</h5>
                    ${g.answers.map(ans => `
                        <div style="font-size:0.85rem;color:rgba(255,255,255,0.75);margin-top:0.3rem;padding-left:0.6rem;border-left:2px solid var(--blush);">
                            <strong>${ans.user === 'ali' ? 'Ali 💙' : 'Aya 💗'}:</strong> ${ans.text}
                        </div>
                    `).join('')}
                </div>`;
        });
    }

    container.innerHTML = html;

    $('#save-daily-answer')?.addEventListener('click', async () => {
        const text = $('#daily-answer-input')?.value.trim();
        if (!text) return;
        triggerHaptic('success');
        SoundFX.success();
        await DataStore.add('dailyanswers', {
            questionId: today.id,
            questionText: today.text,
            date: today.date,
            user: currentUser,
            text
        });
        const partner = DataStore.getPartner(currentUser);
        const myName = currentUser === 'ali' ? 'Ali' : 'Aya';
        sendRemotePushNotification(partner, 'Question of the Day ❓', `${myName} answered today's couple question! Check it out 💕`);
        toast('Answer saved! 💕');
        loadDailyQuestion();
    });
}

// ===================================================================
// VOICE MEMOS (iOS Safari & Cross-Platform Compatible)
// ===================================================================
let _globalAudio = null;

function getSupportedAudioMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/wav'
    ];
    for (const t of types) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
            return t;
        }
    }
    return '';
}

function playVoiceNote(id, audioSrc, btn, prog) {
    if (!_globalAudio) {
        _globalAudio = new Audio();
    }

    if (_globalAudio.dataset.id === id && !_globalAudio.paused) {
        _globalAudio.pause();
        btn.textContent = '▶';
        return;
    }

    // Stop previous
    _globalAudio.pause();
    $$('.vn-play-btn').forEach(b => b.textContent = '▶');

    _globalAudio.src = audioSrc;
    _globalAudio.dataset.id = id;
    _globalAudio.load();

    btn.textContent = '⏸';
    SoundFX.tap(500);

    _globalAudio.ontimeupdate = () => {
        const pct = (_globalAudio.currentTime / (_globalAudio.duration || 1)) * 100;
        if (prog) prog.style.width = pct + '%';
    };

    _globalAudio.onended = () => {
        btn.textContent = '▶';
        if (prog) prog.style.width = '0%';
        _globalAudio.dataset.id = '';
    };

    _globalAudio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        toast('Error playing audio memo');
        btn.textContent = '▶';
    };

    const playPromise = _globalAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn('Audio play promise failed:', e);
            btn.textContent = '▶';
        });
    }
}

async function loadVoiceNotes() {
    const container = $('#voicenotes-content');
    const notes = await DataStore.getAll('voicenotes');

    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-emoji">🎙️</span>
                <p class="empty-state-text">No voice memos yet<br>Tap the mic button to record your voice!</p>
            </div>`;
        return;
    }

    container.innerHTML = notes.map(n => {
        const fromName = n.from === 'ali' ? 'Ali 💙' : 'Aya 💗';
        const date = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const durationStr = n.duration ? `${n.duration}s` : 'Voice memo';
        return `
            <div class="vn-card glass" data-vn-id="${n.id}">
                <button class="vn-play-btn" id="play-vn-${n.id}">▶</button>
                <div class="vn-info">
                    <div class="vn-header">
                        <span class="vn-sender">${fromName}</span>
                        <span class="vn-date">${date} · ${durationStr}</span>
                    </div>
                    <div class="vn-bar-wrap" id="bar-vn-${n.id}">
                        <div class="vn-progress" id="prog-vn-${n.id}"></div>
                    </div>
                </div>
                ${n.from === currentUser ? `<button class="delete-btn" style="padding:0.4rem 0.6rem;font-size:0.75rem;margin:0;" id="del-vn-${n.id}">✕</button>` : ''}
            </div>`;
    }).join('');

    notes.forEach(n => {
        const btn = $(`#play-vn-${n.id}`);
        const prog = $(`#prog-vn-${n.id}`);
        const delBtn = $(`#del-vn-${n.id}`);

        delBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await DataStore.remove('voicenotes', n.id);
            if (_globalAudio) { _globalAudio.pause(); _globalAudio = null; }
            loadVoiceNotes();
            toast('Voice memo deleted 🗑️');
        });

        btn?.addEventListener('click', () => {
            playVoiceNote(n.id, n.audio, btn, prog);
        });
    });
}

let _mediaRecorder = null;
let _activeAudioStream = null;
let _audioChunks = [];
let _recordInterval = null;
let _recordSeconds = 0;
let _recordedBase64 = null;
let _recordedMime = 'audio/mp4';

function createVoiceRecorderForm() {
    _recordedBase64 = null;
    _recordSeconds = 0;
    return `
        <h3 class="modal-title">Record Voice Memo 🎙️</h3>
        <div class="vn-record-box">
            <p class="record-timer" id="vn-timer">00:00</p>
            <button class="record-pulse-btn" id="vn-record-toggle">🎙️</button>
            <p id="vn-status-text" style="font-size:0.85rem;color:rgba(255,255,255,0.6);margin-bottom:1rem;">Tap mic to start recording</p>
            <div id="vn-preview-wrap" style="display:none;margin-top:1rem;">
                <audio id="vn-audio-preview" controls playsinline style="width:100%;margin-bottom:1rem;"></audio>
                <button class="form-submit" id="save-voicenote">Send Voice Memo 💕</button>
            </div>
        </div>
    `;
}

function createSettingsForm() {
    const isAli = currentUser === 'ali';
    const currentCode = DataStore.getPasscodes()[currentUser] || '1111';
    const notifGranted = 'Notification' in window && Notification.permission === 'granted';
    return `
        <h3 class="modal-title">Settings ⚙️</h3>
        <div class="form-group">
            <label class="form-label">Change PIN (${isAli ? 'Ali 💙' : 'Aya 💗'})</label>
            <input class="form-input" id="setting-passcode" type="password" maxlength="4" placeholder="4 digits" value="${currentCode}" style="text-align:center;letter-spacing:4px;font-size:1.2rem;" />
        </div>
        <button class="form-submit" id="save-passcode">Save PIN 💕</button>

        <hr style="border:0;border-top:1px solid rgba(255,255,255,0.08);margin:1.3rem 0 1rem;" />

        <div class="form-group">
            <label class="form-label">🔔 Push Notifications</label>
            <p style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin-bottom:0.8rem;">
                Get lock-screen alerts when ${isAli ? 'Aya' : 'Ali'} sends you love letters, notes, or misses you.
            </p>
            <button class="form-submit" id="toggle-notifications" style="background:linear-gradient(135deg, #e84393, #6c5ce7);">
                ${notifGranted ? '🔔 Notifications Active (Tap to Test)' : '🔔 Turn On Notifications'}
            </button>
        </div>
    `;
}

// ===================================================================
// MODAL
// ===================================================================
function openModal(html) {
    const body = $('#modal-body');
    body.innerHTML = typeof html === 'string' ? html : '';
    $('#modal-overlay').hidden = false;

    // Attach form handlers after rendering
    setTimeout(attachFormHandlers, 50);
}

function closeModal() {
    // Clean up any active recording
    if (_mediaRecorder && _mediaRecorder.state === 'recording') {
        try { _mediaRecorder.stop(); } catch(e) {}
        clearInterval(_recordInterval);
    }
    if (_activeAudioStream) {
        _activeAudioStream.getTracks().forEach(t => t.stop());
        _activeAudioStream = null;
    }
    $('#modal-overlay').hidden = true;
    $('#modal-body').innerHTML = '';
}

function attachFormHandlers() {
    // Send letter
    $('#send-letter')?.addEventListener('click', async () => {
        const content = $('#letter-content')?.value.trim();
        const unlockDate = $('#letter-unlock-date')?.value || null;
        if (!content) return;
        const partner = DataStore.getPartner(currentUser);
        const myName = currentUser === 'ali' ? 'Ali' : 'Aya';
        await DataStore.add('letters', {
            content,
            unlockDate,
            from: currentUser,
            to: partner,
            read: false,
        });
        sendRemotePushNotification(partner, 'New Love Letter 💌', `A new love letter from ${myName} is waiting for you!`);
        SoundFX.success();
        closeModal();
        loadLetters();
        toast(unlockDate ? 'Time-locked letter sent 🔒💌' : 'Letter sent 💌');
    });

    // Save memory
    const fileInput = $('#memory-file');
    const preview = $('#memory-preview');
    const fileLabel = $('#memory-file-label');
    let memoryImageData = null;

    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        memoryImageData = await DataStore.compressImage(file);
        preview.src = memoryImageData;
        preview.style.display = 'block';
        fileLabel.textContent = '✅ Photo selected';
    });

    $('#save-memory')?.addEventListener('click', async () => {
        if (!memoryImageData) {
            toast('Choose a photo first 📷');
            return;
        }
        await DataStore.add('memories', {
            image: memoryImageData,
            caption: $('#memory-caption')?.value.trim() || '',
            date: $('#memory-date')?.value || '',
            uploadedBy: currentUser,
        });
        SoundFX.success();
        closeModal();
        loadMemories();
        toast('Memory saved 📸');
    });

    // Save timeline
    $('#save-timeline')?.addEventListener('click', async () => {
        const title = $('#tl-title')?.value.trim();
        const desc = $('#tl-desc')?.value.trim();
        if (!title) return;
        await DataStore.add('timeline', {
            title,
            description: desc || '',
            date: $('#tl-date')?.value || '',
            addedBy: currentUser,
        });
        closeModal();
        loadTimeline();
        toast('Milestone added 📅');
    });

    // Save countdown
    $('#save-countdown')?.addEventListener('click', async () => {
        const title = $('#cd-title')?.value.trim();
        const date = $('#cd-date')?.value;
        if (!title || !date) return;
        await DataStore.add('countdowns', {
            title,
            date: date + 'T00:00:00',
            type: 'until',
            addedBy: currentUser,
        });
        closeModal();
        loadCountdown();
        toast('Date saved 📆');
    });

    // Save bucket item
    $('#save-bucket')?.addEventListener('click', async () => {
        const title = $('#bucket-title')?.value.trim();
        if (!title) return;
        await DataStore.add('bucketlist', {
            title,
            completed: false,
            addedBy: currentUser,
        });
        closeModal();
        loadBucketList();
        toast('Dream added 📝');
    });

    // Save love note
    $('#save-lovenote')?.addEventListener('click', async () => {
        const content = $('#lovenote-content')?.value.trim();
        if (!content) return;
        const partner = DataStore.getPartner(currentUser);
        const myName = currentUser === 'ali' ? 'Ali' : 'Aya';
        await DataStore.add('lovenotes', {
            content,
            from: currentUser,
            to: partner,
        });
        sendRemotePushNotification(partner, 'Sweet Words 💕', `${myName} left a sweet note for you!`);
        SoundFX.pop();
        closeModal();
        loadLoveNotes();
        toast('Sweet note sent 💕');
    });

    // Voice recorder modal interactions
    const recToggle = $('#vn-record-toggle');
    const timerEl = $('#vn-timer');
    const statusText = $('#vn-status-text');
    const previewWrap = $('#vn-preview-wrap');
    const audioPreview = $('#vn-audio-preview');

    recToggle?.addEventListener('click', async () => {
        if (_mediaRecorder && _mediaRecorder.state === 'recording') {
            // Stop recording
            try {
                _mediaRecorder.stop();
            } catch(e) {}
            clearInterval(_recordInterval);
            recToggle.classList.remove('recording');
            statusText.textContent = '✅ Recording ready! Listen or send below:';
            SoundFX.pop();
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                _activeAudioStream = stream;
                _audioChunks = [];
                _recordSeconds = 0;
                
                const mimeType = getSupportedAudioMimeType();
                _recordedMime = mimeType || 'audio/mp4';
                const options = mimeType ? { mimeType } : {};
                
                try {
                    _mediaRecorder = new MediaRecorder(stream, options);
                } catch(e) {
                    _mediaRecorder = new MediaRecorder(stream);
                }

                _mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) _audioChunks.push(e.data);
                };

                _mediaRecorder.onstop = () => {
                    const actualMime = _mediaRecorder.mimeType || _recordedMime || 'audio/mp4';
                    const blob = new Blob(_audioChunks, { type: actualMime });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        _recordedBase64 = reader.result;
                        if (audioPreview) {
                            audioPreview.src = _recordedBase64;
                            audioPreview.load();
                        }
                        if (previewWrap) previewWrap.style.display = 'block';
                    };
                    reader.readAsDataURL(blob);

                    if (_activeAudioStream) {
                        _activeAudioStream.getTracks().forEach(track => track.stop());
                        _activeAudioStream = null;
                    }
                };

                _mediaRecorder.start(200); // 200ms time slice for iOS WebKit reliability
                recToggle.classList.add('recording');
                statusText.textContent = '🔴 Recording... Tap again when finished';
                SoundFX.tap(600);

                _recordInterval = setInterval(() => {
                    _recordSeconds++;
                    const min = String(Math.floor(_recordSeconds / 60)).padStart(2, '0');
                    const sec = String(_recordSeconds % 60).padStart(2, '0');
                    if (timerEl) timerEl.textContent = `${min}:${sec}`;
                    if (_recordSeconds >= 60) {
                        try { _mediaRecorder.stop(); } catch(e) {}
                        clearInterval(_recordInterval);
                        recToggle.classList.remove('recording');
                        statusText.textContent = 'Max duration reached (60s)';
                    }
                }, 1000);
            } catch (err) {
                toast('Microphone permission required 🎙️');
                console.warn('Microphone error:', err);
                if (statusText) statusText.textContent = 'Microphone permission denied';
            }
        }
    });

    $('#save-voicenote')?.addEventListener('click', async () => {
        if (!_recordedBase64) return;
        const partner = DataStore.getPartner(currentUser);
        const myName = currentUser === 'ali' ? 'Ali' : 'Aya';
        await DataStore.add('voicenotes', {
            audio: _recordedBase64,
            duration: _recordSeconds,
            from: currentUser,
            to: partner
        });
        sendRemotePushNotification(partner, 'Voice Memo 🎙️', `${myName} sent you a voice memo! 💕`);
        SoundFX.success();
        closeModal();
        loadVoiceNotes();
        toast('Voice memo sent 💕🎙️');
    });

    // Save passcode
    $('#save-passcode')?.addEventListener('click', () => {
        const code = $('#setting-passcode')?.value.trim();
        if (code && code.length === 4) {
            const passcodes = DataStore.getPasscodes();
            passcodes[currentUser] = code;
            localStorage.setItem('ayati_passcodes', JSON.stringify(passcodes));
            triggerHaptic('success');
            closeModal();
            toast('PIN updated successfully 🔒');
        } else {
            toast('PIN must be 4 digits!');
        }
    });

    // Toggle Notifications
    $('#toggle-notifications')?.addEventListener('click', async () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            sendSystemNotification('Ayati 💕', 'Notifications are active! You will get alerts on your lock screen.');
            toast('Test alert sent! 🔔');
        } else {
            await requestNotificationPermission(true);
            closeModal();
        }
    });
}

// ===================================================================
// TOAST
// ===================================================================
function toast(message) {
    const t = $('#toast');
    t.textContent = message;
    t.hidden = false;
    t.classList.add('show');
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => { t.hidden = true; }, 300);
    }, 2200);
}

// ===================================================================
// HEARTS CANVAS
// ===================================================================
function initHeartsCanvas() {
    const canvas = document.getElementById('hearts-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const hearts = [];
    const HEART_COUNT = 30;

    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function createHeart() {
        return {
            x: Math.random() * W,
            y: H + 20 + Math.random() * 40,
            size: 8 + Math.random() * 14,
            speed: 0.3 + Math.random() * 0.6,
            opacity: 0.12 + Math.random() * 0.3,
            drift: (Math.random() - 0.5) * 0.3,
            wobbleAmp: 15 + Math.random() * 20,
            wobbleFreq: 0.008 + Math.random() * 0.01,
            tick: Math.random() * 1000,
        };
    }

    for (let i = 0; i < HEART_COUNT; i++) {
        const h = createHeart();
        h.y = Math.random() * H;
        hearts.push(h);
    }

    function drawHeart(cx, cy, size, opacity) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#e84393';
        ctx.beginPath();
        const tc = size * 0.3;
        ctx.moveTo(cx, cy + size * 0.35);
        ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + tc);
        ctx.bezierCurveTo(cx - size / 2, cy + (size + tc) / 2, cx, cy + (size + tc) / 1.4, cx, cy + size);
        ctx.bezierCurveTo(cx, cy + (size + tc) / 1.4, cx + size / 2, cy + (size + tc) / 2, cx + size / 2, cy + tc);
        ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + size * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        hearts.forEach((h, i) => {
            h.tick++;
            h.y -= h.speed;
            h.x += h.drift + Math.sin(h.tick * h.wobbleFreq) * 0.3;
            if (h.y < -30) hearts[i] = createHeart();
            drawHeart(h.x, h.y, h.size, h.opacity);
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// ===================================================================
// LOVE BURST BUTTON
// ===================================================================
function triggerLoveBurstAnim(x, y) {
    const emojis = ['💖', '💕', '💗', '💓', '🌹', '✨', '🦋', '🤍', '💘', '💝'];
    const cx = x !== undefined ? x : window.innerWidth / 2;
    const cy = y !== undefined ? y : window.innerHeight / 2;
    for (let i = 0; i < 10; i++) {
        const span = document.createElement('span');
        span.className = 'burst-emoji';
        span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        span.style.left = (cx + (Math.random() - 0.5) * 120) + 'px';
        span.style.top = (cy - Math.random() * 30) + 'px';
        span.style.animationDuration = (1 + Math.random() * 0.8) + 's';
        document.body.appendChild(span);
        span.addEventListener('animationend', () => span.remove());
    }
}

function setupLoveBurst() {
    const btn = document.getElementById('love-burst-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const rect = btn.getBoundingClientRect();
        triggerLoveBurstAnim(rect.left + rect.width / 2, rect.top);
    });
}

// ===================================================================
// SPARKLE
// ===================================================================
function setupSparkle() {
    let last = 0;
    function sparkle(x, y) {
        const now = Date.now();
        if (now - last < 80) return;
        last = now;
        const s = document.createElement('span');
        s.className = 'sparkle';
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.width = s.style.height = (4 + Math.random() * 5) + 'px';
        s.style.background = Math.random() > 0.5 ? '#f9ca24' : '#fd79a8';
        document.body.appendChild(s);
        s.addEventListener('animationend', () => s.remove());
    }
    document.addEventListener('mousemove', (e) => sparkle(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        sparkle(t.clientX, t.clientY);
    }, { passive: true });
}

// ===================================================================
// MUSIC (YouTube — Indila - Love Story)
// ===================================================================
let _bgPlayer = null;
let _bgPlaying = false;
let _bgReady = false;
let _pendingPlay = false;

function startMusicOnUnlock() {
    _pendingPlay = true;
    if (_bgReady && _bgPlayer) {
        try {
            _bgPlayer.playVideo();
            _bgPlaying = true;
            $('#music-btn')?.classList.add('playing');
        } catch (e) {
            console.warn('Play error on unlock:', e);
        }
    }
}

function setupMusic() {
    const btn = document.getElementById('music-btn');
    if (!btn) return;

    function markPlaying() {
        _bgPlaying = true;
        btn.classList.add('playing');
    }

    function markPaused() {
        _bgPlaying = false;
        btn.classList.remove('playing');
    }

    window.onYouTubeIframeAPIReady = function () {
        _bgPlayer = new YT.Player('yt-player', {
            videoId: 'DF3XjEhJ40Y',
            playerVars: {
                autoplay: 1,
                playsinline: 1,
                enablejsapi: 1,
                origin: window.location.origin,
                loop: 1,
                playlist: 'DF3XjEhJ40Y',
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
            },
            events: {
                onReady: function () {
                    _bgReady = true;
                    try {
                        _bgPlayer.setVolume(45);
                    } catch (e) {}
                    if (_pendingPlay || currentUser) {
                        try {
                            _bgPlayer.playVideo();
                            markPlaying();
                        } catch (e) {}
                    }
                },
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.PLAYING) markPlaying();
                    if (e.data === YT.PlayerState.PAUSED) markPaused();
                    if (e.data === YT.PlayerState.ENDED && _bgPlayer) _bgPlayer.playVideo();
                },
                onError: function (err) {
                    console.warn('YouTube Player Error:', err);
                }
            },
        });
    };

    // User interaction audio unlocker for iOS PWA
    const unlockAudioOnTouch = () => {
        if (_bgReady && _bgPlayer && !_bgPlaying && currentUser) {
            try {
                _bgPlayer.playVideo();
                markPlaying();
            } catch (e) {}
        }
        document.removeEventListener('touchstart', unlockAudioOnTouch);
        document.removeEventListener('click', unlockAudioOnTouch);
    };
    document.addEventListener('touchstart', unlockAudioOnTouch, { passive: true });
    document.addEventListener('click', unlockAudioOnTouch, { passive: true });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!_bgPlayer) return;
        if (_bgPlaying) {
            _bgPlayer.pauseVideo();
            markPaused();
        } else {
            _bgPlayer.playVideo();
            markPlaying();
        }
    });
}

// ===================================================================
// PUSH & SYSTEM NOTIFICATIONS (With Lock-Screen Apple WebPush)
// ===================================================================
const VAPID_PUBLIC_KEY = 'BMfXisPqHXuT66gM_US6VxRCdqn3stJX67xFil_mgUh-jA3HnLXkGxdnLat79jn4V3ytWWo3Bht4i_epCpCvisY';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function registerPushSubscription(user) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        if (sub && user) {
            await fetch('/api/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'subscribe',
                    user: user,
                    subscription: sub.toJSON()
                })
            });
        }
    } catch (e) {
        console.warn('Push subscription error:', e);
    }
}

async function sendRemotePushNotification(toUser, title, body) {
    try {
        await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send',
                to: toUser,
                title: title,
                body: body,
                url: '/'
            })
        });
    } catch (e) {
        console.warn('Remote push delivery failed:', e);
    }
}

async function requestNotificationPermission(showToast = true) {
    if (!('Notification' in window)) {
        if (showToast) toast('Notifications not supported in this browser');
        return false;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            if (currentUser) {
                await registerPushSubscription(currentUser);
            }
            if (showToast) {
                toast('Notifications enabled! 🔔');
                sendSystemNotification('Notifications Enabled 💕', 'You will receive alerts on your lock screen!');
            }
            return true;
        } else if (permission === 'denied') {
            if (showToast) toast('Notifications blocked in browser settings');
            return false;
        }
    } catch (e) {
        console.warn('Permission error:', e);
    }
    return false;
}

function sendSystemNotification(title, body, tag = 'ayati-notification') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, {
                    body,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💕</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💖</text></svg>',
                    tag,
                    renotify: true,
                    vibrate: [200, 100, 200],
                    data: { url: '/' }
                });
            });
        } else {
            new Notification(title, {
                body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💕</text></svg>',
                tag
            });
        }
    } catch (e) {
        console.warn('Error sending notification:', e);
    }
}

function setupRealtimeNotifications() {
    let lastCheckedTime = Date.now();

    // Real-time Miss You pings
    DataStore.listen('missyou', (pings) => {
        if (!currentUser) return;
        const partner = DataStore.getPartner(currentUser);
        const partnerName = partner === 'ali' ? 'Ali 💙' : 'Aya 💗';
        const latest = pings.find(p => p.to === currentUser && p.createdAt > lastCheckedTime);
        if (latest) {
            lastCheckedTime = Math.max(lastCheckedTime, latest.createdAt);
            sendSystemNotification('I Miss You! 💖', `${partnerName} just sent you love & missed you!`, 'missyou');
        }
    });

    // Real-time Love Letters
    DataStore.listen('letters', (letters) => {
        if (!currentUser) return;
        const partner = DataStore.getPartner(currentUser);
        const partnerName = partner === 'ali' ? 'Ali 💙' : 'Aya 💗';
        const newLetter = letters.find(l => l.to === currentUser && !l.read && l.createdAt > lastCheckedTime);
        if (newLetter) {
            sendSystemNotification('New Love Letter 💌', `A new letter from ${partnerName} arrived!`, 'letter');
        }
    });

    // Real-time Sweet Notes
    DataStore.listen('lovenotes', (notes) => {
        if (!currentUser) return;
        const partner = DataStore.getPartner(currentUser);
        const partnerName = partner === 'ali' ? 'Ali 💙' : 'Aya 💗';
        const newNote = notes.find(n => n.to === currentUser && n.createdAt > lastCheckedTime);
        if (newNote) {
            sendSystemNotification('Sweet Words 💕', `${partnerName} sent you a sweet note!`, 'note');
        }
    });
}
