import { apiClient } from "../api/client";

// Speaks English text aloud, picking the best available option:
//   1. A network-backed local voice, if the browser/OS exposes one and
//      actually works (Chrome on Windows/macOS/most mobile — these sound
//      natural).
//   2. Otherwise, server-side TTS (see PronounceView on the backend) — the
//      path taken on Linux desktops (whose only *working* local voice is a
//      robotic offline synthesizer, e.g. espeak-ng, regardless of what
//      getVoices() metadata claims) and any other setup with no usable
//      local voice at all.
// Kept as a single choke point so swapping the underlying engine later —
// e.g. a native TTS plugin for a mobile build, or a user-chosen voice —
// only touches this file.

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let currentAudio: HTMLAudioElement | null = null;
let generation = 0;

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const timeout = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

// Chrome on Linux lists a "Google US English" voice with localService:false
// in getVoices() (as if it were the good network voice), but actually
// speaking through it still comes out as the robotic offline synthesizer —
// the metadata lies about what's really going to play. So Linux desktops
// are routed to the server fallback unconditionally, rather than trusting
// that flag. Android/ChromeOS (which report "Linux" in the UA string too,
// but have working native TTS) are excluded.
function isLinuxDesktop(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) return uaData.platform === "Linux";

  const ua = navigator.userAgent;
  if (/android/i.test(ua) || /cros/i.test(ua)) return false;
  return /linux/i.test(ua);
}

// `localService: false` is the browser's own signal that a voice is
// network-backed (e.g. Chrome's "Google US English") rather than the OS's
// offline synthesizer. Reasonably reliable outside Linux (see above).
async function pickGoodLocalVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await waitForVoices();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  return english.find((v) => !v.localService) ?? null;
}

async function speakViaServer(text: string, onEnd: () => void): Promise<void> {
  try {
    const { data } = await apiClient.get("/practice/pronounce/", {
      params: { text },
      responseType: "blob",
    });
    const url = URL.createObjectURL(data as Blob);
    const audio = new Audio(url);
    currentAudio = audio;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      onEnd();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await audio.play();
  } catch {
    onEnd();
  }
}

// Speaks `text`, calling `onEnd` when playback finishes on its own (not
// called if a later speak()/stop() call interrupts this one first).
export async function speak(text: string, onEnd: () => void): Promise<void> {
  stop();
  const myGeneration = generation;
  const finish = () => {
    if (myGeneration === generation) onEnd();
  };

  const trimmed = text.trim();
  if (!trimmed) {
    finish();
    return;
  }

  if (!isSpeechSupported() || isLinuxDesktop()) {
    await speakViaServer(trimmed, finish);
    return;
  }

  const voice = await pickGoodLocalVoice();
  if (!voice) {
    await speakViaServer(trimmed, finish);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = "en-US";
  utterance.voice = voice;
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.speak(utterance);
}

export function stop(): void {
  generation++;
  if (isSpeechSupported()) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}
