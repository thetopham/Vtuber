const avatar = document.getElementById("avatar");
const mouth = document.getElementById("mouth");
const statusText = document.getElementById("status");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatLog = document.getElementById("chat-log");
const messageTemplate = document.getElementById("message-template");
const voiceToggle = document.getElementById("voice-toggle");
const moodToggle = document.getElementById("mood-toggle");

const state = {
  voiceEnabled: true,
  mood: "chill"
};

const moods = {
  chill: {
    label: "Chill",
    intro: "Calm mode active."
  },
  hype: {
    label: "Hype",
    intro: "LET'S GOOOO!"
  }
};

const cannedTopics = {
  gaming: ["roguelike", "speedrun", "co-op", "boss fight"],
  coding: ["JavaScript", "Python", "game AI", "debugging"],
  streamer: ["chat", "clips", "lore", "collab"]
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

function addMessage(speaker, text) {
  const node = messageTemplate.content.cloneNode(true);
  node.querySelector(".speaker").textContent = speaker;
  node.querySelector(".text").textContent = text;
  chatLog.prepend(node);
}

function blinkLoop() {
  const delay = 1800 + Math.random() * 2500;
  setTimeout(() => {
    avatar.classList.add("blink");
    setTimeout(() => avatar.classList.remove("blink"), 130);
    blinkLoop();
  }, delay);
}

function setSpeaking(enabled) {
  avatar.classList.toggle("speaking", enabled);
  mouth.style.transform = enabled ? "scaleY(1.2)" : "scaleY(1)";
}

function generateReply(input) {
  const normalized = input.toLowerCase();
  const moodPrefix = state.mood === "hype" ? "[HYPE] " : "";

  if (normalized.includes("hello") || normalized.includes("hi")) {
    return `${moodPrefix}Hi chat! NovaAI online and ready to vibe.`;
  }

  if (normalized.includes("game")) {
    return `${moodPrefix}Let's do a ${randomItem(cannedTopics.gaming)} challenge and blame lag if I lose.`;
  }

  if (normalized.includes("code") || normalized.includes("ai")) {
    return `${moodPrefix}Today we build ${randomItem(cannedTopics.coding)} on stream, then ship it live.`;
  }

  if (normalized.includes("collab") || normalized.includes("friend")) {
    return `${moodPrefix}Collab idea accepted. I'll bring ${randomItem(cannedTopics.streamer)} energy.`;
  }

  return `${moodPrefix}Chat heard: "${input}". My next move is maximum ${randomItem(cannedTopics.streamer)}.`;
}

function speak(text) {
  if (!state.voiceEnabled || !("speechSynthesis" in window)) {
    setSpeaking(false);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = state.mood === "hype" ? 1.15 : 0.95;
  utterance.pitch = state.mood === "hype" ? 1.25 : 1.05;

  utterance.onstart = () => {
    statusText.textContent = "Speaking to chat...";
    setSpeaking(true);
  };

  utterance.onend = () => {
    statusText.textContent = "Idle — waiting for chat";
    setSpeaking(false);
  };

  window.speechSynthesis.speak(utterance);
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = chatInput.value.trim();
  if (!input) {
    return;
  }

  const reply = generateReply(input);
  addMessage("Viewer", input);
  addMessage("NovaAI", reply);
  statusText.textContent = "Thinking...";
  speak(reply);
  chatInput.value = "";
});

voiceToggle.addEventListener("click", () => {
  state.voiceEnabled = !state.voiceEnabled;
  voiceToggle.textContent = `Voice: ${state.voiceEnabled ? "On" : "Off"}`;
  if (!state.voiceEnabled) {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    statusText.textContent = "Voice disabled";
  }
});

moodToggle.addEventListener("click", () => {
  state.mood = state.mood === "chill" ? "hype" : "chill";
  moodToggle.textContent = `Mood: ${moods[state.mood].label}`;
  addMessage("System", moods[state.mood].intro);
});

blinkLoop();
addMessage("System", "NovaAI boot complete. Send a chat message to begin.");
