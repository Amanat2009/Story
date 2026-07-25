/* ==========================================================================
   Two-Pen Tales - Role-Locked Online Co-Writing Engine & Strict API Enforcement
   ========================================================================== */

const state = { 1
  apiKey: localStorage.getItem('gemini_api_key') || "",
  modelName: "gemini-2.5-flash",
  audioEnabled: true,
  easyEnglish: true,

  // Online Multiplayer State
  online: {
    peer: null,
    conn: null,
    isHost: false,
    role: null, // 'A' or 'B'
    roomCode: null,
    isConnected: false
  },
  
  penA: {
    name: "Author A",
    spark: "",
    locked: false,
    sealed: false,
    voteEnd: false,
    canvasLocked: false,
    canvasLighting: "Bioluminescent Dusk"
  },
  penB: {
    name: "Author B",
    spark: "",
    locked: false,
    sealed: false,
    voteEnd: false,
    canvasLocked: false,
    canvasSubject: "Clockwork Compass"
  },

  storyTitle: "The Whispering Clockwork",
  genre: "Mythic Fantasy",
  targetRounds: 5,
  currentRound: 1,
  isConcluded: false,
  currentDraft: null,
  isClashMode: false,
  clashData: null,
  clashSignedA: false,
  clashSignedB: false,

  chapters: [],
  clashes: []
};

// Web Audio API Synthesizer
class SoundEffects {
  constructor() { this.ctx = null; }
  init() { 
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    } 
  }
  playLockSound() {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.12);
    } catch(e){}
  }
  playSealSound() {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.25);
    } catch(e){}
  }
  playWeaveMagicSound() {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.35);
      });
    } catch(e){}
  }
}
const sounds = new SoundEffects();

let DOM = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  bindEvents();
  loadSavedStory();
  updateUIState();
  updateProgressBadge();
  initCanvasPlaceholder();
  checkUrlForRoomCode();
});

function cacheDOM() {
  DOM = {
    storyTitleInput: document.getElementById('storyTitleInput'),
    genreSelect: document.getElementById('genreSelect'),
    targetRoundsSelect: document.getElementById('targetRoundsSelect'),
    roundProgressBadge: document.getElementById('roundProgressBadge'),
    startNewStoryBtn: document.getElementById('startNewStoryBtn'),
    openApiKeyModalBtn: document.getElementById('openApiKeyModalBtn'),
    apiKeyModal: document.getElementById('apiKeyModal'),
    closeApiKeyModalBtn: document.getElementById('closeApiKeyModalBtn'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
    clearApiKeyBtn: document.getElementById('clearApiKeyBtn'),

    penAName: document.getElementById('penAName'),
    penBName: document.getElementById('penBName'),
    labelPenAName: document.getElementById('labelPenAName'),
    labelPenBName: document.getElementById('labelPenBName'),
    roleTagA: document.getElementById('roleTagA'),
    roleTagB: document.getElementById('roleTagB'),
    audioToggleBtn: document.getElementById('audioToggleBtn'),
    openKeepsakeBtn: document.getElementById('openKeepsakeBtn'),
    storyCount: document.getElementById('storyCount'),

    // Online Elements
    onlinePill: document.getElementById('onlinePill'),
    onlineDot: document.getElementById('onlineDot'),
    onlineStatusText: document.getElementById('onlineStatusText'),
    openOnlineModalBtn: document.getElementById('openOnlineModalBtn'),
    onlineModal: document.getElementById('onlineModal'),
    closeOnlineModalBtn: document.getElementById('closeOnlineModalBtn'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    roomCreatedInfo: document.getElementById('roomCreatedInfo'),
    myRoomCode: document.getElementById('myRoomCode'),
    copyRoomLinkBtn: document.getElementById('copyRoomLinkBtn'),
    waitingPartnerText: document.getElementById('waitingPartnerText'),
    joinRoomCodeInput: document.getElementById('joinRoomCodeInput'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    joinStatusText: document.getElementById('joinStatusText'),

    penABox: document.getElementById('penABox'),
    penBBox: document.getElementById('penBBox'),
    penASpark: document.getElementById('penASpark'),
    penBSpark: document.getElementById('penBSpark'),
    lockPenABtn: document.getElementById('lockPenABtn'),
    lockPenBBtn: document.getElementById('lockPenBBtn'),
    penAStatusText: document.getElementById('penAStatusText'),
    penBStatusText: document.getElementById('penBStatusText'),
    tensionModeCheck: document.getElementById('tensionModeCheck'),
    weavePassageBtn: document.getElementById('weavePassageBtn'),
    weaveBtnText: document.getElementById('weaveBtnText'),

    voteEndABtn: document.getElementById('voteEndABtn'),
    voteEndBBtn: document.getElementById('voteEndBBtn'),

    draftPlaceholder: document.getElementById('draftPlaceholder'),
    draftContentCard: document.getElementById('draftContentCard'),
    roundBadge: document.getElementById('roundBadge'),
    sparksUsedSummary: document.getElementById('sparksUsedSummary'),
    passageTextBox: document.getElementById('passageTextBox'),
    penAEditNote: document.getElementById('penAEditNote'),
    penBEditNote: document.getElementById('penBEditNote'),
    applyPenAEditBtn: document.getElementById('applyPenAEditBtn'),
    applyPenBEditBtn: document.getElementById('applyPenBEditBtn'),
    sealBtnA: document.getElementById('sealBtnA'),
    sealBtnB: document.getElementById('sealBtnB'),
    sealTextA: document.getElementById('sealTextA'),
    sealTextB: document.getElementById('sealTextB'),
    sealCenterMessage: document.getElementById('sealCenterMessage'),
    commitToStoryBtn: document.getElementById('commitToStoryBtn'),

    clashCard: document.getElementById('clashCard'),
    branchTextA: document.getElementById('branchTextA'),
    branchTextB: document.getElementById('branchTextB'),
    pactSignABtn: document.getElementById('pactSignABtn'),
    pactSignBBtn: document.getElementById('pactSignBBtn'),
    pactStatusText: document.getElementById('pactStatusText'),
    executeCompromiseBtn: document.getElementById('executeCompromiseBtn'),

    canvasLightSelect: document.getElementById('canvasLightSelect'),
    canvasSubjectSelect: document.getElementById('canvasSubjectSelect'),
    lockCanvasABtn: document.getElementById('lockCanvasABtn'),
    lockCanvasBBtn: document.getElementById('lockCanvasBBtn'),
    renderCanvasBtn: document.getElementById('renderCanvasBtn'),
    sceneCanvas: document.getElementById('sceneCanvas'),

    folioModal: document.getElementById('folioModal'),
    closeFolioBtn: document.getElementById('closeFolioBtn'),
    folioTitleDisplay: document.getElementById('folioTitleDisplay'),
    folioGenreDisplay: document.getElementById('folioGenreDisplay'),
    folioAuthorA: document.getElementById('folioAuthorA'),
    folioAuthorB: document.getElementById('folioAuthorB'),
    folioDateDisplay: document.getElementById('folioDateDisplay'),
    folioChaptersContainer: document.getElementById('folioChaptersContainer'),
    clashLogContainer: document.getElementById('clashLogContainer'),
    sigLineA: document.getElementById('sigLineA'),
    sigLineB: document.getElementById('sigLineB'),
    exportHtmlKeepsakeBtn: document.getElementById('exportHtmlKeepsakeBtn'),
    printFolioBtn: document.getElementById('printFolioBtn'),
    toastContainer: document.getElementById('toastContainer')
  };
}

function bindEvents() {
  DOM.penAName.addEventListener('input', (e) => {
    state.penA.name = e.target.value || "Author A";
    updateAuthorLabels();
    sendSyncEvent({ type: 'UPDATE_NAMES', authorA: state.penA.name, authorB: state.penB.name });
  });
  DOM.penBName.addEventListener('input', (e) => {
    state.penB.name = e.target.value || "Author B";
    updateAuthorLabels();
    sendSyncEvent({ type: 'UPDATE_NAMES', authorA: state.penA.name, authorB: state.penB.name });
  });

  DOM.penASpark.addEventListener('input', (e) => {
    if (state.online.isConnected && state.online.role === 'A') {
      sendSyncEvent({ type: 'TYPING_SPARK', pen: 'A', text: e.target.value });
    }
  });

  DOM.penBSpark.addEventListener('input', (e) => {
    if (state.online.isConnected && state.online.role === 'B') {
      sendSyncEvent({ type: 'TYPING_SPARK', pen: 'B', text: e.target.value });
    }
  });

  DOM.storyTitleInput.addEventListener('input', (e) => {
    state.storyTitle = e.target.value || "Untitled Story";
    sendSyncEvent({ type: 'UPDATE_SETTINGS', title: state.storyTitle, genre: state.genre });
  });
  DOM.genreSelect.addEventListener('change', (e) => {
    state.genre = e.target.value;
    sendSyncEvent({ type: 'UPDATE_SETTINGS', title: state.storyTitle, genre: state.genre });
  });
  DOM.targetRoundsSelect.addEventListener('change', (e) => {
    state.targetRounds = parseInt(e.target.value, 10);
    updateProgressBadge();
  });

  DOM.startNewStoryBtn.addEventListener('click', () => startNewStory(true));

  // API Key Modal Events
  DOM.openApiKeyModalBtn.addEventListener('click', () => {
    DOM.apiKeyInput.value = state.apiKey;
    DOM.apiKeyModal.classList.remove('hidden');
  });
  DOM.closeApiKeyModalBtn.addEventListener('click', () => DOM.apiKeyModal.classList.add('hidden'));
  DOM.saveApiKeyBtn.addEventListener('click', () => {
    const val = DOM.apiKeyInput.value.trim();
    state.apiKey = val;
    localStorage.setItem('gemini_api_key', val);
    DOM.apiKeyModal.classList.add('hidden');
    showToast(val ? "🔑 API Key saved!" : "⚠️ API Key cleared.");
  });
  DOM.clearApiKeyBtn.addEventListener('click', () => {
    state.apiKey = "";
    localStorage.removeItem('gemini_api_key');
    DOM.apiKeyInput.value = "";
    DOM.apiKeyModal.classList.add('hidden');
    showToast("⚠️ API Key removed.");
  });

  DOM.audioToggleBtn.addEventListener('click', () => {
    state.audioEnabled = !state.audioEnabled;
    DOM.audioToggleBtn.textContent = state.audioEnabled ? "🔊" : "🔇";
    showToast(state.audioEnabled ? "Sound enabled" : "Sound muted");
  });

  // Online Modal Events
  DOM.openOnlineModalBtn.addEventListener('click', () => DOM.onlineModal.classList.remove('hidden'));
  DOM.closeOnlineModalBtn.addEventListener('click', () => DOM.onlineModal.classList.add('hidden'));
  DOM.createRoomBtn.addEventListener('click', createOnlineRoom);
  DOM.joinRoomBtn.addEventListener('click', () => joinOnlineRoom(DOM.joinRoomCodeInput.value.trim()));
  DOM.copyRoomLinkBtn.addEventListener('click', copyShareableLink);

  DOM.lockPenABtn.addEventListener('click', () => handleLockPen('A'));
  DOM.lockPenBBtn.addEventListener('click', () => handleLockPen('B'));

  DOM.weavePassageBtn.addEventListener('click', handleWeavePassage);

  DOM.voteEndABtn.addEventListener('click', () => voteConcludeStory('A', true));
  DOM.voteEndBBtn.addEventListener('click', () => voteConcludeStory('B', true));

  DOM.applyPenAEditBtn.addEventListener('click', () => applyAuthorEdit('A', true));
  DOM.applyPenBEditBtn.addEventListener('click', () => applyAuthorEdit('B', true));
  DOM.sealBtnA.addEventListener('click', () => toggleSealAuthor('A', true));
  DOM.sealBtnB.addEventListener('click', () => toggleSealAuthor('B', true));
  DOM.commitToStoryBtn.addEventListener('click', () => commitPassageToStory(true));

  DOM.pactSignABtn.addEventListener('click', () => signClashPact('A', true));
  DOM.pactSignBBtn.addEventListener('click', () => signClashPact('B', true));
  DOM.executeCompromiseBtn.addEventListener('click', () => executeClashResolution(true));

  DOM.lockCanvasABtn.addEventListener('click', () => {
    if (state.online.isConnected && state.online.role !== 'A') return;
    state.penA.canvasLocked = !state.penA.canvasLocked;
    state.penA.canvasLighting = DOM.canvasLightSelect.value;
    DOM.lockCanvasABtn.classList.toggle('active', state.penA.canvasLocked);
    sounds.playLockSound();
    checkCanvasReady();
  });

  DOM.lockCanvasBBtn.addEventListener('click', () => {
    if (state.online.isConnected && state.online.role !== 'B') return;
    state.penB.canvasLocked = !state.penB.canvasLocked;
    state.penB.canvasSubject = DOM.canvasSubjectSelect.value;
    DOM.lockCanvasBBtn.classList.toggle('active', state.penB.canvasLocked);
    sounds.playLockSound();
    checkCanvasReady();
  });

  DOM.renderCanvasBtn.addEventListener('click', renderCoCanvasArtwork);

  DOM.openKeepsakeBtn.addEventListener('click', openKeepsakeFolio);
  DOM.closeFolioBtn.addEventListener('click', () => DOM.folioModal.classList.add('hidden'));
  DOM.exportHtmlKeepsakeBtn.addEventListener('click', downloadStandaloneKeepsake);
  DOM.printFolioBtn.addEventListener('click', () => window.print());
}

// PeerJS Online Engine
function createOnlineRoom() {
  if (typeof Peer === 'undefined') {
    showToast("⚠️ PeerJS online library not loaded. Check internet connection.");
    return;
  }

  if (state.online.peer) {
    try { state.online.peer.destroy(); } catch(e){}
  }

  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const peerId = `twopen-${roomCode}`;

  DOM.createRoomBtn.disabled = true;
  DOM.createRoomBtn.textContent = "Creating Room...";

  try {
    state.online.peer = new Peer(peerId);

    state.online.peer.on('open', () => {
      state.online.isHost = true;
      state.online.role = 'A';
      state.online.roomCode = roomCode;

      DOM.myRoomCode.textContent = roomCode;
      DOM.roomCreatedInfo.classList.remove('hidden');
      DOM.roleTagA.textContent = "(You - Pen A)";
      DOM.roleTagB.textContent = "(Partner - Pen B)";

      showToast(`🌐 Room ${roomCode} created! Share code with Pen B.`);
      updateRolePermissions();
    });

    state.online.peer.on('connection', (conn) => {
      state.online.conn = conn;
      state.online.isConnected = true;
      setupDataConnection();

      DOM.waitingPartnerText.textContent = "🟢 Pen B Connected!";
      DOM.onlineDot.className = 'status-dot online';
      DOM.onlineStatusText.textContent = `Online: Room ${roomCode}`;

      sendSyncEvent({
        type: 'INIT_STATE',
        title: state.storyTitle,
        genre: state.genre,
        authorA: state.penA.name,
        authorB: state.penB.name,
        chapters: state.chapters,
        currentRound: state.currentRound,
        isConcluded: state.isConcluded
      });

      updateRolePermissions();
      showToast("🟢 Pen B connected! Role lock active.");
      setTimeout(() => DOM.onlineModal.classList.add('hidden'), 1500);
    });

    state.online.peer.on('error', (err) => {
      console.warn("PeerJS Host Error:", err);
      DOM.createRoomBtn.disabled = false;
      DOM.createRoomBtn.textContent = "✨ Create Room Code";
      showToast("⚠️ Room creation issue. Retrying...");
    });
  } catch(err) {
    DOM.createRoomBtn.disabled = false;
    DOM.createRoomBtn.textContent = "✨ Create Room Code";
    showToast("⚠️ Unable to connect to online signaling server.");
  }
}

function joinOnlineRoom(code) {
  if (!code) {
    showToast("⚠️ Please enter a room code!");
    return;
  }

  if (typeof Peer === 'undefined') {
    showToast("⚠️ PeerJS online library not loaded.");
    return;
  }

  if (state.online.peer) {
    try { state.online.peer.destroy(); } catch(e){}
  }

  const cleanCode = code.toUpperCase();
  const targetPeerId = `twopen-${cleanCode}`;
  DOM.joinStatusText.textContent = "Connecting to partner...";

  try {
    state.online.peer = new Peer();

    state.online.peer.on('open', () => {
      const conn = state.online.peer.connect(targetPeerId);
      state.online.conn = conn;
      state.online.isHost = false;
      state.online.role = 'B';
      state.online.roomCode = cleanCode;

      conn.on('open', () => {
        state.online.isConnected = true;
        setupDataConnection();

        DOM.roleTagA.textContent = "(Partner - Pen A)";
        DOM.roleTagB.textContent = "(You - Pen B)";
        DOM.onlineDot.className = 'status-dot online';
        DOM.onlineStatusText.textContent = `Online: Room ${cleanCode}`;

        updateRolePermissions();
        showToast("🟢 Connected to Pen A! You are writing as Pen B.");
        DOM.onlineModal.classList.add('hidden');
      });
    });

    state.online.peer.on('error', (err) => {
      console.warn("PeerJS Join Error:", err);
      DOM.joinStatusText.textContent = "❌ Connection failed. Check room code.";
    });
  } catch(err) {
    DOM.joinStatusText.textContent = "❌ Network connection error.";
  }
}

function setupDataConnection() {
  if (!state.online.conn) return;

  state.online.conn.on('data', (data) => {
    handleIncomingSync(data);
  });

  state.online.conn.on('close', () => {
    state.online.isConnected = false;
    DOM.onlineDot.className = 'status-dot offline';
    DOM.onlineStatusText.textContent = "Offline (Disconnected)";
    updateRolePermissions();
    showToast("⚠️ Writing partner disconnected.");
  });

  state.online.conn.on('error', () => {
    state.online.isConnected = false;
    updateRolePermissions();
  });
}

function sendSyncEvent(data) {
  if (state.online.conn && state.online.isConnected) {
    try {
      state.online.conn.send(data);
    } catch(e) {
      console.warn("Failed to send WebRTC packet:", e);
    }
  }
}

function handleIncomingSync(data) {
  if (!data) return;

  switch (data.type) {
    case 'INIT_STATE':
      state.storyTitle = data.title || state.storyTitle;
      state.genre = data.genre || state.genre;
      state.penA.name = data.authorA || state.penA.name;
      state.penB.name = data.authorB || state.penB.name;
      state.chapters = Array.isArray(data.chapters) ? data.chapters : [];
      state.currentRound = data.currentRound || 1;
      state.isConcluded = !!data.isConcluded;
      DOM.storyTitleInput.value = state.storyTitle;
      DOM.genreSelect.value = state.genre;
      DOM.penAName.value = state.penA.name;
      DOM.penBName.value = state.penB.name;
      updateAuthorLabels();
      updateProgressBadge();
      updateStoryCount();
      updateRolePermissions();
      break;

    case 'TYPING_SPARK':
      if (data.pen === 'A') {
        state.penA.spark = data.text;
        DOM.penASpark.value = data.text;
      } else {
        state.penB.spark = data.text;
        DOM.penBSpark.value = data.text;
      }
      break;

    case 'LOCK_SPARK':
      if (data.pen === 'A') {
        state.penA.locked = data.locked;
        state.penA.spark = data.spark;
        DOM.penASpark.value = data.spark;
        DOM.penABox.classList.toggle('locked', data.locked);
        DOM.penAStatusText.textContent = data.locked ? "Locked" : "Ready";
        if (state.online.isConnected && state.online.role !== 'A') {
          DOM.penASpark.disabled = true;
        }
        DOM.lockPenABtn.textContent = data.locked ? "Unlock A" : "Lock Pen A";
      } else {
        state.penB.locked = data.locked;
        state.penB.spark = data.spark;
        DOM.penBSpark.value = data.spark;
        DOM.penBBox.classList.toggle('locked', data.locked);
        DOM.penBStatusText.textContent = data.locked ? "Locked" : "Ready";
        if (state.online.isConnected && state.online.role !== 'B') {
          DOM.penBSpark.disabled = true;
        }
        DOM.lockPenBBtn.textContent = data.locked ? "Unlock B" : "Lock Pen B";
      }
      updateUIState();
      sounds.playLockSound();
      break;

    case 'PASSAGE_WEAVED':
      displayDraftPassage(data.draft.text, data.draft.sparkAPhrase, data.draft.sparkBPhrase);
      break;

    case 'CLASH_GENERATED':
      state.clashData = { outcomeA: data.outcomeA, outcomeB: data.outcomeB };
      state.clashSignedA = false; state.clashSignedB = false;
      DOM.draftPlaceholder.classList.add('hidden');
      DOM.draftContentCard.classList.add('hidden');
      DOM.clashCard.classList.remove('hidden');
      DOM.branchTextA.textContent = data.outcomeA;
      DOM.branchTextB.textContent = data.outcomeB;
      break;

    case 'CLASH_RESOLVED':
      state.clashes.push({ round: state.currentRound, resolution: data.resolvedPassage });
      DOM.clashCard.classList.add('hidden');
      displayDraftPassage(data.resolvedPassage, data.sparkA, data.sparkB);
      break;

    case 'DETAIL_EDIT':
      state.currentDraft.text += ` [${data.authorName}: ${data.val}]`;
      DOM.passageTextBox.innerHTML = formatHighlightedPassage(state.currentDraft.text, state.currentDraft.sparkAPhrase, state.currentDraft.sparkBPhrase);
      state.penA.sealed = false; state.penB.sealed = false;
      updateSealUI();
      break;

    case 'SEAL_PASSAGE':
      if (data.pen === 'A') state.penA.sealed = data.sealed;
      if (data.pen === 'B') state.penB.sealed = data.sealed;
      updateSealUI();
      sounds.playSealSound();
      break;

    case 'COMMIT_STORY':
      commitPassageToStory(false);
      break;

    case 'RESET_CHAMBER':
      resetInputChamber();
      break;

    case 'NEW_STORY_STARTED':
      startNewStory(false);
      break;

    case 'VOTE_END':
      voteConcludeStory(data.pen, false);
      break;

    case 'UPDATE_NAMES':
      state.penA.name = data.authorA;
      state.penB.name = data.authorB;
      DOM.penAName.value = data.authorA;
      DOM.penBName.value = data.authorB;
      updateAuthorLabels();
      break;

    case 'UPDATE_SETTINGS':
      state.storyTitle = data.title;
      state.genre = data.genre;
      DOM.storyTitleInput.value = data.title;
      DOM.genreSelect.value = data.genre;
      break;
  }
}

function checkUrlForRoomCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');
  if (roomCode) {
    DOM.joinRoomCodeInput.value = roomCode.toUpperCase();
    DOM.onlineModal.classList.remove('hidden');
    joinOnlineRoom(roomCode);
  }
}

function copyShareableLink() {
  if (!state.online.roomCode) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${state.online.roomCode}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast("📋 Shareable room link copied to clipboard!");
  }).catch(() => {
    showToast(`Code: ${state.online.roomCode}`);
  });
}

// Strict Role Lock Enforcement
function updateRolePermissions() {
  if (state.online.isConnected) {
    const isPenA = state.online.role === 'A';
    const isPenB = state.online.role === 'B';

    // Pen A controls
    DOM.penASpark.disabled = !isPenA || state.penA.locked;
    DOM.lockPenABtn.disabled = !isPenA;
    DOM.applyPenAEditBtn.disabled = !isPenA;
    DOM.sealBtnA.disabled = !isPenA;
    DOM.voteEndABtn.disabled = !isPenA;
    DOM.lockCanvasABtn.disabled = !isPenA;
    DOM.pactSignABtn.disabled = !isPenA;

    // Pen B controls
    DOM.penBSpark.disabled = !isPenB || state.penB.locked;
    DOM.lockPenBBtn.disabled = !isPenB;
    DOM.applyPenBEditBtn.disabled = !isPenB;
    DOM.sealBtnB.disabled = !isPenB;
    DOM.voteEndBBtn.disabled = !isPenB;
    DOM.lockCanvasBBtn.disabled = !isPenB;
    DOM.pactSignBBtn.disabled = !isPenB;
  } else {
    // Local Mode: Both roles accessible
    DOM.penASpark.disabled = state.penA.locked;
    DOM.penBSpark.disabled = state.penB.locked;
    DOM.lockPenABtn.disabled = false;
    DOM.lockPenBBtn.disabled = false;
    DOM.applyPenAEditBtn.disabled = false;
    DOM.applyPenBEditBtn.disabled = false;
    DOM.sealBtnA.disabled = false;
    DOM.sealBtnB.disabled = false;
    DOM.voteEndABtn.disabled = false;
    DOM.voteEndBBtn.disabled = false;
    DOM.lockCanvasABtn.disabled = false;
    DOM.lockCanvasBBtn.disabled = false;
    DOM.pactSignABtn.disabled = false;
    DOM.pactSignBBtn.disabled = false;

    DOM.roleTagA.textContent = "(Local)";
    DOM.roleTagB.textContent = "(Local)";
  }
}

function handleLockPen(pen) {
  if (state.online.isConnected) {
    if (state.online.role !== pen) {
      showToast(`⚠️ You are Pen ${state.online.role}. You cannot control Pen ${pen}!`);
      return;
    }
  }

  if (pen === 'A') {
    const sparkVal = DOM.penASpark.value.trim();
    if (!sparkVal && !state.penA.locked) { showToast("Pen A spark required"); return; }
    state.penA.locked = !state.penA.locked;
    state.penA.spark = sparkVal;
    DOM.penABox.classList.toggle('locked', state.penA.locked);
    DOM.lockPenABtn.textContent = state.penA.locked ? "Unlock A" : "🔒 Lock Pen A";
    DOM.penAStatusText.textContent = state.penA.locked ? "Locked" : "Ready";
    DOM.penASpark.disabled = state.penA.locked;

    sendSyncEvent({ type: 'LOCK_SPARK', pen: 'A', locked: state.penA.locked, spark: state.penA.spark });
  } else {
    const sparkVal = DOM.penBSpark.value.trim();
    if (!sparkVal && !state.penB.locked) { showToast("Pen B spark required"); return; }
    state.penB.locked = !state.penB.locked;
    state.penB.spark = sparkVal;
    DOM.penBBox.classList.toggle('locked', state.penB.locked);
    DOM.lockPenBBtn.textContent = state.penB.locked ? "Unlock B" : "🔒 Lock Pen B";
    DOM.penBStatusText.textContent = state.penB.locked ? "Locked" : "Ready";
    DOM.penBSpark.disabled = state.penB.locked;

    sendSyncEvent({ type: 'LOCK_SPARK', pen: 'B', locked: state.penB.locked, spark: state.penB.spark });
  }

  sounds.playLockSound();
  updateUIState();
}

function updateAuthorLabels() {
  DOM.labelPenAName.textContent = state.penA.name;
  DOM.labelPenBName.textContent = state.penB.name;
  DOM.sigLineA.textContent = state.penA.name;
  DOM.sigLineB.textContent = state.penB.name;
  DOM.folioAuthorA.textContent = state.penA.name;
  DOM.folioAuthorB.textContent = state.penB.name;
}

function updateProgressBadge() {
  if (state.targetRounds > 0) {
    DOM.roundProgressBadge.textContent = `Chapter ${state.currentRound} of ${state.targetRounds}`;
  } else {
    DOM.roundProgressBadge.textContent = `Chapter ${state.currentRound}`;
  }
}

function voteConcludeStory(author, isLocalAction) {
  if (state.online.isConnected && state.online.role !== author) {
    showToast(`⚠️ You can only vote for Pen ${state.online.role}`);
    return;
  }

  if (author === 'A') state.penA.voteEnd = !state.penA.voteEnd;
  if (author === 'B') state.penB.voteEnd = !state.penB.voteEnd;

  DOM.voteEndABtn.classList.toggle('active', state.penA.voteEnd);
  DOM.voteEndBBtn.classList.toggle('active', state.penB.voteEnd);

  if (isLocalAction) sendSyncEvent({ type: 'VOTE_END', pen: author });

  sounds.playLockSound();

  if (state.penA.voteEnd && state.penB.voteEnd) {
    showToast("Both pens voted to weave the Finale!");
  }
  updateUIState();
}

function updateUIState() {
  const bothLocked = state.penA.locked && state.penB.locked;
  DOM.weavePassageBtn.disabled = !bothLocked;

  const isFinale = (state.penA.voteEnd && state.penB.voteEnd) || (state.targetRounds > 0 && state.currentRound >= state.targetRounds);
  DOM.weaveBtnText.textContent = bothLocked 
    ? (isFinale ? "Weave Grand Finale Epilogue ✨" : "Weave Passage ✨")
    : "Lock both pens to weave passage";

  updateRolePermissions();
}

window.quickFill = function(targetId, text) {
  const elem = document.getElementById(targetId);
  if (elem && !elem.disabled) {
    elem.value = text;
    showToast("Spark inserted");
  }
};

async function handleWeavePassage() {
  if (!state.penA.locked || !state.penB.locked) return;

  if (!state.apiKey) {
    showToast("⚠️ Missing Gemini API Key. Click '🔑 API Key' to enter your key.");
    DOM.apiKeyModal.classList.remove('hidden');
    return;
  }

  DOM.weavePassageBtn.disabled = true;
  DOM.weaveBtnText.textContent = "Weaving passage...";
  sounds.playWeaveMagicSound();

  const isTensionMode = DOM.tensionModeCheck.checked;
  const isFinale = (state.penA.voteEnd && state.penB.voteEnd) || (state.targetRounds > 0 && state.currentRound >= state.targetRounds);
  const historyContext = state.chapters.map(c => c.text).join("\n\n");

  if (isFinale) {
    await generateFinalePassage(historyContext);
  } else if (isTensionMode) {
    await generateClashOfFates(historyContext);
  } else {
    await generateStandardPassage(historyContext);
  }

  DOM.weavePassageBtn.disabled = false;
  updateUIState();
}

async function generateStandardPassage(historyContext) {
  const prompt = `You are a master story weaver for a co-authored tale titled "${state.storyTitle}" (${state.genre}).
History:
${historyContext || "Start of story."}

Pen A (${state.penA.name}): "${state.penA.spark}".
Pen B (${state.penB.name}): "${state.penB.spark}".

CRITICAL LANGUAGE RULE:
Write in VERY EASY, SIMPLE, EVERYDAY ENGLISH.
Use short sentences and simple words. Do NOT use hard, difficult, or complex vocabulary.

Write 1 short paragraph (4-5 sentences max) weaving both sparks seamlessly.
Return JSON: {"passage": "...", "sparkA_phrase": "...", "sparkB_phrase": "..."}`;

  try {
    const response = await fetchGeminiAPI(prompt);
    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      parsed = { passage: response.replace(/```json|```/g, '').trim(), sparkA_phrase: state.penA.spark, sparkB_phrase: state.penB.spark };
    }
    displayDraftPassage(parsed.passage, parsed.sparkA_phrase, parsed.sparkB_phrase);
    sendSyncEvent({ type: 'PASSAGE_WEAVED', draft: { text: parsed.passage, sparkAPhrase: parsed.sparkA_phrase, sparkBPhrase: parsed.sparkB_phrase } });
  } catch (err) {
    displayAPIError(err.message);
  }
}

async function generateFinalePassage(historyContext) {
  const prompt = `Weave the GRAND FINALE for "${state.storyTitle}".
History: ${historyContext}
Final Spark A: "${state.penA.spark}".
Final Spark B: "${state.penB.spark}".

CRITICAL LANGUAGE RULE:
Write in VERY EASY, SIMPLE, EVERYDAY ENGLISH.
Use short sentences and simple words. Do NOT use hard, difficult, or complex vocabulary.

Write a poetic 1-paragraph finale paragraph bringing the tale to a satisfying conclusion.
Return JSON: {"passage": "...", "sparkA_phrase": "...", "sparkB_phrase": "..."}`;

  try {
    const response = await fetchGeminiAPI(prompt);
    state.isConcluded = true;
    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      parsed = { passage: response.replace(/```json|```/g, '').trim(), sparkA_phrase: state.penA.spark, sparkB_phrase: state.penB.spark };
    }
    displayDraftPassage(`[FINALE] ${parsed.passage}`, parsed.sparkA_phrase, parsed.sparkB_phrase);
    sendSyncEvent({ type: 'PASSAGE_WEAVED', draft: { text: `[FINALE] ${parsed.passage}`, sparkAPhrase: parsed.sparkA_phrase, sparkBPhrase: parsed.sparkB_phrase } });
  } catch (err) {
    displayAPIError(err.message);
  }
}

async function generateClashOfFates(historyContext) {
  const prompt = `Story tension fork between Pen A ("${state.penA.spark}") and Pen B ("${state.penB.spark}").
CRITICAL LANGUAGE RULE: Write in VERY SIMPLE, EASY ENGLISH with short sentences.
Return JSON: {"outcomeA": "2 sentence branch A in simple English...", "outcomeB": "2 sentence branch B in simple English..."}`;

  try {
    const response = await fetchGeminiAPI(prompt);
    state.isClashMode = true;
    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      throw new Error("Unable to parse API response format.");
    }
    showClashUI(parsed.outcomeA, parsed.outcomeB);
  } catch (err) {
    displayAPIError(err.message);
  }
}

async function fetchGeminiAPI(promptText) {
  if (!state.apiKey) {
    throw new Error("No Gemini API key provided. Please click '🔑 API Key' in the top bar to set a valid key.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.modelName}:generateContent?key=${state.apiKey}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
  } catch (netErr) {
    throw new Error("Network connection error. Check your internet connection.");
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(`API Key Error (${response.status}): Your Gemini API Key is invalid or expired. Click '🔑 API Key' to update it.`);
    }
    throw new Error(`Gemini API Error (${response.status}): Failed to generate story passage.`);
  }

  const data = await response.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Gemini API returned empty response.");
  }

  return data.candidates[0].content.parts[0].text;
}

function displayAPIError(errMsg) {
  showToast(`❌ ${errMsg}`);
  DOM.draftPlaceholder.classList.remove('hidden');
  DOM.draftContentCard.classList.add('hidden');
  DOM.clashCard.classList.add('hidden');
  DOM.draftPlaceholder.innerHTML = `<p class="placeholder-text" style="color: #f43f5e;">❌ ${escapeHTML(errMsg)}</p>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

function formatHighlightedPassage(text, sparkAPhrase, sparkBPhrase) {
  let safeText = escapeHTML(text);
  if (sparkAPhrase) {
    const safeA = escapeHTML(sparkAPhrase);
    safeText = safeText.replace(safeA, `<span class="spark-highlight-a">${safeA}</span>`);
  }
  if (sparkBPhrase) {
    const safeB = escapeHTML(sparkBPhrase);
    safeText = safeText.replace(safeB, `<span class="spark-highlight-b">${safeB}</span>`);
  }
  return safeText;
}

function displayDraftPassage(text, sparkAPhrase, sparkBPhrase) {
  state.currentDraft = { text, sparkAPhrase, sparkBPhrase };

  DOM.draftPlaceholder.classList.add('hidden');
  DOM.clashCard.classList.add('hidden');
  DOM.draftContentCard.classList.remove('hidden');

  DOM.roundBadge.textContent = state.isConcluded ? `🏆 Finale` : `Chapter ${state.currentRound}`;
  DOM.sparksUsedSummary.textContent = `${state.penA.name} & ${state.penB.name}`;

  DOM.passageTextBox.innerHTML = formatHighlightedPassage(text, sparkAPhrase, sparkBPhrase);

  state.penA.sealed = false;
  state.penB.sealed = false;
  updateSealUI();
}

function applyAuthorEdit(author, isLocalAction) {
  if (state.online.isConnected && state.online.role !== author) {
    showToast(`⚠️ Only Pen ${author} can propose Pen ${author}'s edit`);
    return;
  }

  const input = author === 'A' ? DOM.penAEditNote : DOM.penBEditNote;
  const val = input.value.trim();
  if (!val) return;

  const authorName = author === 'A' ? state.penA.name : state.penB.name;
  state.currentDraft.text += ` [${authorName}: ${val}]`;
  DOM.passageTextBox.innerHTML = formatHighlightedPassage(state.currentDraft.text, state.currentDraft.sparkAPhrase, state.currentDraft.sparkBPhrase);
  input.value = '';
  showToast(`${authorName} added detail`);
  state.penA.sealed = false; state.penB.sealed = false;
  updateSealUI();

  if (isLocalAction) {
    sendSyncEvent({ type: 'DETAIL_EDIT', authorName, val });
  }
}

function toggleSealAuthor(author, isLocalAction) {
  if (state.online.isConnected && state.online.role !== author) {
    showToast(`⚠️ Only Pen ${author} can stamp Pen ${author}'s seal`);
    return;
  }

  if (author === 'A') state.penA.sealed = !state.penA.sealed;
  else state.penB.sealed = !state.penB.sealed;

  if (isLocalAction) {
    sendSyncEvent({ type: 'SEAL_PASSAGE', pen: author, sealed: author === 'A' ? state.penA.sealed : state.penB.sealed });
  }

  sounds.playSealSound();
  updateSealUI();
}

function updateSealUI() {
  DOM.sealBtnA.classList.toggle('sealed', state.penA.sealed);
  DOM.sealTextA.textContent = state.penA.sealed ? "✓ Pen A Sealed" : "🏛️ Stamp Pen A Seal";

  DOM.sealBtnB.classList.toggle('sealed', state.penB.sealed);
  DOM.sealTextB.textContent = state.penB.sealed ? "✓ Pen B Sealed" : "🏛️ Stamp Pen B Seal";

  const bothSealed = state.penA.sealed && state.penB.sealed;
  if (bothSealed) {
    DOM.sealCenterMessage.textContent = state.isConcluded ? "🏆 Story Complete!" : "✨ Both sealed. Ready for canon.";
    DOM.commitToStoryBtn.classList.remove('hidden');
  } else {
    DOM.sealCenterMessage.textContent = "Requires both seals to commit to canon";
    DOM.commitToStoryBtn.classList.add('hidden');
  }
}

function commitPassageToStory(isLocalAction) {
  if (!state.penA.sealed || !state.penB.sealed) return;

  state.chapters.push({
    round: state.currentRound,
    text: state.currentDraft.text,
    sparkA: state.penA.spark,
    sparkB: state.penB.spark,
    authorA: state.penA.name,
    authorB: state.penB.name,
    isFinale: state.isConcluded
  });
  saveStoryToStorage();

  if (isLocalAction) {
    sendSyncEvent({ type: 'COMMIT_STORY' });
  }

  if (state.isConcluded) {
    openKeepsakeFolio();
  } else {
    state.currentRound++;
    updateProgressBadge();
    showToast(`Chapter ${state.currentRound - 1} added!`);
    resetInputChamber();
    if (isLocalAction) sendSyncEvent({ type: 'RESET_CHAMBER' });
  }
}

function resetInputChamber() {
  state.penA.locked = false; state.penB.locked = false;
  state.penA.voteEnd = false; state.penB.voteEnd = false;
  state.penA.spark = ""; state.penB.spark = "";
  DOM.penASpark.value = ""; DOM.penBSpark.value = "";

  DOM.voteEndABtn.classList.remove('active');
  DOM.voteEndBBtn.classList.remove('active');

  DOM.penABox.classList.remove('locked');
  DOM.penBBox.classList.remove('locked');
  DOM.lockPenABtn.textContent = "🔒 Lock Pen A";
  DOM.lockPenBBtn.textContent = "🔒 Lock Pen B";
  DOM.penAStatusText.textContent = "Ready";
  DOM.penBStatusText.textContent = "Ready";

  DOM.draftContentCard.classList.add('hidden');
  DOM.draftPlaceholder.classList.remove('hidden');
  DOM.draftPlaceholder.innerHTML = `<p class="placeholder-text">The manuscript is clear. Enter sparks in both pens above to write the next chapter.</p>`;
  updateUIState();
  updateStoryCount();
}

// Clean Slate & Reset for New Tale
function startNewStory(isLocalAction) {
  state.currentRound = 1;
  state.isConcluded = false;
  state.chapters = [];
  state.clashes = [];

  resetInputChamber();
  initCanvasPlaceholder();

  try { localStorage.removeItem('two_pen_tales_data'); } catch(e){}

  updateProgressBadge();
  updateStoryCount();

  showToast("✨ Clean slate! New tale started.");

  if (isLocalAction) {
    sendSyncEvent({ type: 'NEW_STORY_STARTED' });
  }
}

function showClashUI(outcomeA, outcomeB) {
  state.clashData = { outcomeA, outcomeB };
  state.clashSignedA = false; state.clashSignedB = false;

  DOM.draftPlaceholder.classList.add('hidden');
  DOM.draftContentCard.classList.add('hidden');
  DOM.clashCard.classList.remove('hidden');

  DOM.branchTextA.textContent = outcomeA;
  DOM.branchTextB.textContent = outcomeB;

  sendSyncEvent({ type: 'CLASH_GENERATED', outcomeA, outcomeB });
}

function signClashPact(author, isLocalAction) {
  if (state.online.isConnected && state.online.role !== author) {
    showToast(`⚠️ Only Pen ${author} can sign as Pen ${author}`);
    return;
  }

  if (author === 'A') state.clashSignedA = true;
  if (author === 'B') state.clashSignedB = true;
  DOM.pactSignABtn.classList.toggle('active', state.clashSignedA);
  DOM.pactSignBBtn.classList.toggle('active', state.clashSignedB);
  sounds.playSealSound();

  if (state.clashSignedA && state.clashSignedB) {
    DOM.pactStatusText.textContent = "Both signed!";
    DOM.executeCompromiseBtn.classList.remove('hidden');
  }
}

function executeClashResolution(isLocalAction) {
  const selectedRadio = document.querySelector('input[name="pactChoice"]:checked').value;
  let resolvedPassage = selectedRadio === "blend"
    ? `${state.clashData.outcomeA} ${state.clashData.outcomeB}`
    : selectedRadio === "pathA" ? state.clashData.outcomeA : state.clashData.outcomeB;

  state.clashes.push({ round: state.currentRound, resolution: resolvedPassage });
  DOM.clashCard.classList.add('hidden');
  displayDraftPassage(resolvedPassage, state.penA.spark, state.penB.spark);

  if (isLocalAction) {
    sendSyncEvent({ type: 'CLASH_RESOLVED', resolvedPassage, sparkA: state.penA.spark, sparkB: state.penB.spark });
  }
}

function checkCanvasReady() {
  DOM.renderCanvasBtn.disabled = !(state.penA.canvasLocked && state.penB.canvasLocked);
}

function renderCoCanvasArtwork() {
  const canvas = DOM.sceneCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e2b857";
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Co-Illuminated Plate: ${state.penA.canvasLighting} & ${state.penB.canvasSubject}`, canvas.width/2, canvas.height/2);
  sounds.playWeaveMagicSound();
}

function initCanvasPlaceholder() {
  const canvas = DOM.sceneCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = "#121620";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveStoryToStorage() {
  try {
    localStorage.setItem('two_pen_tales_data', JSON.stringify({
      title: state.storyTitle, genre: state.genre, targetRounds: state.targetRounds,
      currentRound: state.currentRound, isConcluded: state.isConcluded,
      easyEnglish: state.easyEnglish,
      authorA: state.penA.name, authorB: state.penB.name,
      chapters: state.chapters, clashes: state.clashes
    }));
  } catch(e){}
}

function loadSavedStory() {
  const raw = localStorage.getItem('two_pen_tales_data');
  if (raw) {
    try {
      const data = JSON.parse(raw);
      state.storyTitle = data.title || state.storyTitle;
      state.genre = data.genre || state.genre;
      state.targetRounds = data.targetRounds !== undefined ? data.targetRounds : state.targetRounds;
      state.currentRound = data.currentRound || 1;
      state.isConcluded = !!data.isConcluded;
      state.easyEnglish = data.easyEnglish !== undefined ? data.easyEnglish : true;
      state.penA.name = data.authorA || state.penA.name;
      state.penB.name = data.authorB || state.penB.name;
      state.chapters = Array.isArray(data.chapters) ? data.chapters : [];
      state.clashes = Array.isArray(data.clashes) ? data.clashes : [];

      DOM.storyTitleInput.value = state.storyTitle;
      DOM.genreSelect.value = state.genre;
      DOM.targetRoundsSelect.value = state.targetRounds;
      DOM.penAName.value = state.penA.name;
      DOM.penBName.value = state.penB.name;
      updateAuthorLabels();
      updateProgressBadge();
      updateStoryCount();
    } catch(e) {}
  }
}

function updateStoryCount() { 
  if (DOM.storyCount) DOM.storyCount.textContent = state.chapters.length; 
}

function openKeepsakeFolio() {
  DOM.folioTitleDisplay.textContent = escapeHTML(state.storyTitle);
  DOM.folioGenreDisplay.textContent = escapeHTML(state.genre);
  DOM.folioAuthorA.textContent = escapeHTML(state.penA.name);
  DOM.folioAuthorB.textContent = escapeHTML(state.penB.name);
  DOM.folioDateDisplay.textContent = new Date().toLocaleDateString();

  if (state.chapters.length === 0) {
    DOM.folioChaptersContainer.innerHTML = `<p style="text-align:center; color:#78716c;">No chapters committed to storybook yet.</p>`;
  } else {
    DOM.folioChaptersContainer.innerHTML = state.chapters.map(c => `
      <div style="margin-bottom:2rem;">
        <h3>${c.isFinale ? '🏆 Finale' : `Chapter ${c.round}`}</h3>
        <p>${escapeHTML(c.text)}</p>
        <small style="color:#78716c">Sparks: ${escapeHTML(c.authorA)} ("${escapeHTML(c.sparkA)}") & ${escapeHTML(c.authorB)} ("${escapeHTML(c.sparkB)}")</small>
      </div>
    `).join('');
  }

  DOM.folioModal.classList.remove('hidden');
}

function downloadStandaloneKeepsake() {
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHTML(state.storyTitle)}</title><style>body{background:#faf6ee;color:#1c1917;font-family:serif;padding:3rem;max-width:800px;margin:0 auto;}</style></head><body><h1>${escapeHTML(state.storyTitle)}</h1><p>By ${escapeHTML(state.penA.name)} & ${escapeHTML(state.penB.name)}</p><hr>${state.chapters.map(c=>`<div><h3>Chapter ${c.round}</h3><p>${escapeHTML(c.text)}</p></div>`).join('')}</body></html>`;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${state.storyTitle.replace(/\s+/g, '_')}_Keepsake.html`; a.click();
}

function showToast(msg) {
  if (!DOM.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = msg;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
