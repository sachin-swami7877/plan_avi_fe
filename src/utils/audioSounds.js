// Audio sound effects using preloaded Audio elements

const crashAudio = new Audio('/crash.wav');
const winAudio = new Audio('/sounds/win.wav');
const notificationAudio = new Audio('/sounds/notification.wav');
const planeRunAudio = new Audio('/planrun.mp3');

// Preload
crashAudio.preload = 'auto';
winAudio.preload = 'auto';
notificationAudio.preload = 'auto';
planeRunAudio.preload = 'auto';

// Mobile browsers block audio until a user gesture (tap/click).
// Unlock all audio elements on first interaction so useEffect-triggered
// sounds (crash, planerun) work on phones.
let unlocked = false;
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  [crashAudio, winAudio, notificationAudio, planeRunAudio].forEach((a) => {
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });
  document.removeEventListener('touchstart', unlockAudio, true);
  document.removeEventListener('click', unlockAudio, true);
}
document.addEventListener('touchstart', unlockAudio, true);
document.addEventListener('click', unlockAudio, true);

// Debounce guard — prevent same sound playing twice within 500ms
const lastPlayed = {};

function playSound(audio, key) {
  try {
    const now = Date.now();
    if (lastPlayed[key] && now - lastPlayed[key] < 500) return;
    lastPlayed[key] = now;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

export function playCrashSound() {
  playSound(crashAudio, 'crash');
}

export function playWinSound() {
  playSound(winAudio, 'win');
}

export function playNotificationSound() {
  playSound(notificationAudio, 'notification');
}

export function playPlaneRunSound() {
  try {
    planeRunAudio.currentTime = 0;
    planeRunAudio.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

export function stopPlaneRunSound() {
  try {
    planeRunAudio.pause();
    planeRunAudio.currentTime = 0;
  } catch (e) { /* ignore */ }
}
