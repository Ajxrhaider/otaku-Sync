// apps/extension/contents/sync-watcher.ts
// apps/extension/contents/sync-watcher.ts
// ... imports

// Add this at the very top of the file
alert("Otaku Sync extension is active on this page!");

// ... rest of your code
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.crunchyroll.com/*"],
  all_frames: true,
}

// 1. Visual Debugger
const style = document.createElement("div");
style.style.position = "fixed";
style.style.top = "10px";
style.style.right = "10px";
style.style.background = "lime";
style.style.padding = "5px";
style.style.zIndex = "9999";
style.innerText = "Otaku Sync: Active";
document.body.appendChild(style);

console.log("Otaku Sync: Script injected and active.");

// 2. Data Scout
setInterval(() => {
  const title = document.querySelector("h1")?.innerText;
  console.log("Looking for anime title...", title);
  
  if (title) {
    style.innerText = `Otaku Sync: Found ${title}`;
    // Fetch logic goes here
  }
}, 5000);