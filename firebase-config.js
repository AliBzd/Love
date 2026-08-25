// ===================================================================
// FATIMTI — firebase-config.js
// Data layer: localStorage (offline) + Firebase Firestore (real-time sync)
// ===================================================================

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔥 FIREBASE SETUP — Follow these steps:                       ║
// ║                                                                  ║
// ║  1. Go to https://console.firebase.google.com                   ║
// ║  2. Click "Add Project" → name it "fatimti"                     ║
// ║  3. Disable Google Analytics (not needed) → Create              ║
// ║  4. Click the </> (Web) icon to add a web app                   ║
// ║  5. Name it "fatimti" → Register App                            ║
// ║  6. Copy ONLY the config values below                           ║
// ║  7. Go to "Build" → "Firestore Database" → "Create Database"   ║
// ║  8. Choose "Start in test mode" → pick nearest region → Done   ║
// ║  9. Redeploy and enjoy real-time sync! 💕                       ║
// ╚══════════════════════════════════════════════════════════════════╝

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCcPZvpCh3qpXYyWyRZ-J5TzeOW5BjEiz0",
    authDomain: "fatimti.firebaseapp.com",
    projectId: "fatimti",
    storageBucket: "fatimti.firebasestorage.app",
    messagingSenderId: "601798823214",
    appId: "1:601798823214:web:7f81744a946b4e21a77ebf"
};

// ───────── Internal state ─────────
let _db = null;
let _firebaseReady = false;

// ───────── Default data ─────────
const DEFAULT_PASSCODES = { ali: "1111", fatima: "2222" };

const DEFAULT_TIMELINE = [
    { id: "t1", date: "", title: "النهار اللي تلاقينا", description: "القدر جمعنا، و من داك النهار تبدّلات حياتي للأبد.", addedBy: "ali" },
    { id: "t2", date: "", title: "أول ضحكة مع بعضياتنا", description: "داك الوقت عرفت — الضحكة ديالك هي الصوت اللي قلبي كان كيتسنّى يسمعو.", addedBy: "ali" },
    { id: "t3", date: "", title: "طحت فالحب", description: "ماكانش شي لحظة وحدة — كانو ألف لحظة صغيرة ولّاو كلشي.", addedBy: "ali" },
    { id: "t4", date: "", title: "اليوم و غدا", description: "كل نهار كنختارك، و كل غدا غادي نختارك مرة أخرى. ديما. 💕", addedBy: "ali" },
];

const DEFAULT_LOVE_QUOTES = [
    "كل نهار معاك كيبان ليا بحال حلم ما بغيت نفيق منو 💕",
    "نتي الشمس ديالي و النجمة ديالي 🌟",
    "غير الضحكة ديالك كتنوّر ليا الدنيا كاملة ✨",
    "كل لحظة كنحبك كتر من اللي قبلها 💗",
    "معاك، أخيراً لقيت الدار ديالي 🤍",
    "صوتك هو أحلى موسيقى عندي 🎵",
    "كنوعدك نحبك فأحسن أيامك و نكون معاك فأصعبها 💪",
    "نتي صاحبتي و أكبر حب فحياتي 💫",
    "كل مرة كنشوفك كيطيرو ليا الفراشات 🦋",
    "الطيبة ديالك كتلهمني نكون أحسن 🌹",
];

// ───────── Initialize Firebase (if configured) ─────────
async function _initFirebase() {
    try {
        const savedFB = localStorage.getItem("fatimti_fb_config");
        if (savedFB) {
            Object.assign(FIREBASE_CONFIG, JSON.parse(savedFB));
        }
    } catch (e) {}

    if (!FIREBASE_CONFIG.apiKey) return false;

    try {
        // Load Firebase compat SDK via script tags
        await _loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
        await _loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js");

        firebase.initializeApp(FIREBASE_CONFIG);
        _db = firebase.firestore();
        _firebaseReady = true;
        console.log("🔥 Firebase connected — real-time sync active");
        return true;
    } catch (e) {
        console.warn("⚠️ Firebase init failed, using localStorage:", e);
        return false;
    }
}

function _loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ───────── Storage helpers (localStorage + IndexedDB fallback) ─────────
let _idb = null;
function _openIDB() {
    return new Promise((resolve) => {
        if (_idb) return resolve(_idb);
        if (!window.indexedDB) return resolve(null);
        const req = indexedDB.open("fatimti_idb", 1);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore("kv");
        };
        req.onsuccess = (e) => {
            _idb = e.target.result;
            resolve(_idb);
        };
        req.onerror = () => resolve(null);
    });
}

async function _idbSet(key, value) {
    const db = await _openIDB();
    if (!db) return;
    return new Promise((resolve) => {
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put(value, `fatimti_${key}`);
        tx.oncomplete = resolve;
    });
}

async function _idbGet(key) {
    const db = await _openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
        const tx = db.transaction("kv", "readonly");
        const req = tx.objectStore("kv").get(`fatimti_${key}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

function _lsGet(key) {
    try {
        return JSON.parse(localStorage.getItem(`fatimti_${key}`)) || null;
    } catch { return null; }
}

function _lsSet(key, value) {
    try {
        localStorage.setItem(`fatimti_${key}`, JSON.stringify(value));
    } catch (e) {
        console.warn(`localStorage quota hit for ${key}, backing up to IndexedDB`);
    }
    _idbSet(key, value);
}

// ───────── Initialize defaults if first run ─────────
function _ensureDefaults() {
    if (!_lsGet("initialized")) {
        _lsSet("passcodes", DEFAULT_PASSCODES);
        _lsSet("timeline", DEFAULT_TIMELINE);
        _lsSet("letters", []);
        _lsSet("memories", []);
        _lsSet("countdowns", [{ id: "main", title: "حنا مع بعضياتنا", date: "2026-05-13T00:00:00", type: "since" }]);
        _lsSet("moods_ali", []);
        _lsSet("moods_fatima", []);
        _lsSet("bucketlist", []);
        _lsSet("lovenotes", []);
        _lsSet("initialized", true);
    }
}

function _uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ===================================================================
// PUBLIC API — DataStore
// ===================================================================
const DataStore = {

    /** Initialize the data store */
    async init() {
        _ensureDefaults();
        await _initFirebase();
    },

    /** Check if Firebase is active */
    get isFirebase() { return _firebaseReady; },

    // ─── Auth / Session ───────────────────────────────────
    getUser() {
        return localStorage.getItem("fatimti_user") || null;
    },

    setUser(username) {
        localStorage.setItem("fatimti_user", username);
    },

    clearUser() {
        localStorage.removeItem("fatimti_user");
    },

    getPartner(user) {
        return user === "ali" ? "fatima" : "ali";
    },

    getPasscodes() {
        return _lsGet("passcodes") || DEFAULT_PASSCODES;
    },

    // ─── Generic CRUD ─────────────────────────────────────
    async getAll(collection) {
        if (_firebaseReady) {
            try {
                const snap = await _db.collection(collection).orderBy("createdAt", "desc").get();
                const items = [];
                snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                return items;
            } catch (e) {
                console.warn(`Firestore getAll(${collection}) failed:`, e);
            }
        }
        return _lsGet(collection) || [];
    },

    async add(collection, doc) {
        doc.createdAt = Date.now();
        if (!doc.id) doc.id = _uuid();

        if (_firebaseReady) {
            try {
                await _db.collection(collection).doc(doc.id).set(doc);
            } catch (e) { console.warn("Firestore add failed:", e); }
        }

        // Always save locally too
        const items = _lsGet(collection) || [];
        items.unshift(doc);
        _lsSet(collection, items);
        return doc;
    },

    async update(collection, id, updates) {
        if (_firebaseReady) {
            try {
                await _db.collection(collection).doc(id).update(updates);
            } catch (e) { console.warn("Firestore update failed:", e); }
        }

        const items = _lsGet(collection) || [];
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
            Object.assign(items[idx], updates);
            _lsSet(collection, items);
        }
    },

    async remove(collection, id) {
        if (_firebaseReady) {
            try {
                await _db.collection(collection).doc(id).delete();
            } catch (e) { console.warn("Firestore delete failed:", e); }
        }

        let items = _lsGet(collection) || [];
        items = items.filter(i => i.id !== id);
        _lsSet(collection, items);
    },

    // ─── Real-time listener (Firebase only) ───────────────
    listen(collection, callback) {
        if (_firebaseReady) {
            try {
                return _db.collection(collection).orderBy("createdAt", "desc")
                    .onSnapshot((snap) => {
                        const items = [];
                        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                        callback(items);
                    });
            } catch (e) { console.warn("Firestore listen failed:", e); }
        }
        // Fallback: return current local data once
        callback(_lsGet(collection) || []);
        return null;
    },

    // ─── Mood helpers ─────────────────────────────────────
    async getMoods(user) {
        if (_firebaseReady) {
            return this.getAll(`moods_${user}`);
        }
        return _lsGet(`moods_${user}`) || [];
    },

    async setMood(user, emoji) {
        const today = new Date().toISOString().split("T")[0];
        const moods = _lsGet(`moods_${user}`) || [];

        // Replace today's mood if exists
        const idx = moods.findIndex(m => m.date === today);
        const entry = { id: today, date: today, emoji, createdAt: Date.now(), user };

        if (idx !== -1) {
            moods[idx] = entry;
        } else {
            moods.unshift(entry);
        }

        // Keep only last 30 days
        _lsSet(`moods_${user}`, moods.slice(0, 30));

        if (_firebaseReady) {
            try {
                await _db.collection(`moods_${user}`).doc(today).set(entry);
            } catch (e) { console.warn("Firestore setMood failed:", e); }
        }

        return entry;
    },

    async getTodayMood(user) {
        const today = new Date().toISOString().split("T")[0];
        const moods = _lsGet(`moods_${user}`) || [];
        return moods.find(m => m.date === today) || null;
    },

    // ─── Love quotes ─────────────────────────────────────
    getRandomQuote() {
        return DEFAULT_LOVE_QUOTES[Math.floor(Math.random() * DEFAULT_LOVE_QUOTES.length)];
    },

    // ─── Image compression ───────────────────────────────
    compressImage(file, maxWidth = 800) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let w = img.width, h = img.height;
                    if (w > maxWidth) {
                        h = (maxWidth / w) * h;
                        w = maxWidth;
                    }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
};
