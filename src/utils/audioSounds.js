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
