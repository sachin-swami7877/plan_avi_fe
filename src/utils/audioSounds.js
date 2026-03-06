// Audio sound effects using preloaded Audio elements

let winAudio = null;
let notificationAudio = null;

// Lazy-init audio elements on first actual play (avoids browser autoplay issues)
function getWinAudio() {
  if (!winAudio) {
    winAudio = new Audio('/sounds/win.wav');
    winAudio.preload = 'auto';
  }
  return winAudio;
}
function getNotificationAudio() {
  if (!notificationAudio) {
    notificationAudio = new Audio('/sounds/notification.wav');
    notificationAudio.preload = 'auto';
  }
  return notificationAudio;
}

// Debounce guard — prevent same sound playing twice within 500ms
const lastPlayed = {};

function playSound(audioGetter, key) {
  try {
    const now = Date.now();
    if (lastPlayed[key] && now - lastPlayed[key] < 500) return;
    lastPlayed[key] = now;
    const audio = audioGetter();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

export function playWinSound() {
  playSound(getWinAudio, 'win');
}

export function playNotificationSound() {
  playSound(getNotificationAudio, 'notification');
}

