const $ = id => document.getElementById(id);
const SAVE_KEY = "isigi-kapat-checkpoint";
let sceneIdx = 0, lineIdx = 0, typing = null, fullLine = "";

function show(id) {
  ["start", "story", "choice", "death", "end"].forEach(s => $(s).hidden = s !== id);
}

function playVideo(src) {
  const v = $("bg");
  if (!src) { v.removeAttribute("src"); v.style.display = "none"; return; }
  v.style.display = "block";
  if (!v.src.endsWith(src)) { v.src = src; }
  v.play().catch(() => {});
}

let currentPic = "";
function imgFor(s, i) {
  if (!s.images) return "";
  const k = (s.imageAt && s.imageAt[i] !== undefined) ? s.imageAt[i] : 0;
  return s.images[k] || "";
}
const IMG_CACHE = {};
function preloadImages() {
  STORY.scenes.forEach(s => (s.images || []).forEach(src => {
    if (!IMG_CACHE[src]) { const i = new Image(); i.src = src; IMG_CACHE[src] = i; }
  }));
}
const layers = [$("pic"), $("pic2")];
let topLayer = 1;
function setImage(src) {
  if (src === currentPic) return;
  currentPic = src;
  const old = layers[topLayer];
  if (!src) { old.classList.remove("show"); return; }
  topLayer = 1 - topLayer;
  const nl = layers[topLayer];
  nl.classList.remove("show", "drift");
  const reveal = () => {
    if (currentPic !== src) return;
    void nl.offsetWidth;
    nl.classList.add("show", "drift");
    old.classList.remove("show");
  };
  nl.onerror = () => nl.classList.remove("show", "drift");
  nl.onload = reveal;
  if (nl.getAttribute("src") === src && nl.complete) reveal(); else nl.src = src;
}

function typeLine(text) {
  clearInterval(typing);
  fullLine = text;
  const el = $("text"); el.textContent = "";
  let i = 0;
  typing = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typing);
  }, 22);
}

function startScene(i, fromCheckpoint) {
  sceneIdx = i; lineIdx = 0;
  const s = STORY.scenes[i];
  clearInterval(typing);
  playVideo(s.video);
  setImage(imgFor(s, (fromCheckpoint && s.choice) ? s.lines.length - 1 : 0));
  if (fromCheckpoint && s.choice) { showChoice(); return; }
  $("chapter").textContent = s.chapter;
  show("story");
  typeLine(s.lines[0]);
}

function advance() {
  const s = STORY.scenes[sceneIdx];
  if (typing && $("text").textContent !== fullLine) { // yazı bitmediyse hemen tamamla
    clearInterval(typing); $("text").textContent = fullLine; return;
  }
  if (++lineIdx < s.lines.length) { typeLine(s.lines[lineIdx]); setImage(imgFor(s, lineIdx)); return; }
  if (s.choice) { localStorage.setItem(SAVE_KEY, String(sceneIdx)); showChoice(); }
  else if (sceneIdx + 1 < STORY.scenes.length) startScene(sceneIdx + 1);
}

function showChoice() {
  const c = STORY.scenes[sceneIdx].choice;
  $("question").textContent = c.question;
  c.options.forEach((o, n) => {
    const b = $("c" + n);
    b.textContent = o.text;
    b.onclick = () => o.correct ? win() : die(o);
  });
  show("choice");
}

function die(o) {
  $("death-text").textContent = o.death || "Yanlış seçim.";
  show("death");
}

function win() {
  if (sceneIdx + 1 < STORY.scenes.length) {      // sıradaki bölüm varsa devam et
    localStorage.setItem(SAVE_KEY, String(sceneIdx + 1));
    startScene(sceneIdx + 1);
    return;
  }
  localStorage.removeItem(SAVE_KEY);
  $("end-title").textContent = STORY.ending.title;
  $("end-text").textContent = STORY.ending.text;
  playVideo(""); setImage("");
  show("end");
}

$("btn-new").onclick = () => { localStorage.removeItem(SAVE_KEY); startScene(0); };
$("btn-continue").onclick = () => startScene(Number(localStorage.getItem(SAVE_KEY)), true);
$("next").onclick = advance;
$("retry").onclick = showChoice;               // ölünce aynı seçimden devam
$("restart").onclick = () => startScene(0);
document.addEventListener("keydown", e => {
  if (!$("story").hidden && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); advance(); }
});

if (localStorage.getItem(SAVE_KEY) !== null) $("btn-continue").hidden = false;
show("start");

// ---- Seçenekler menüsü: istediğin bölüme / seçime atla ----
function buildMenu() {
  const list = $("menu-list"); list.textContent = "";
  STORY.scenes.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = s.chapter;
    if (i === sceneIdx && !$("start").hidden === false) b.classList.add("current");
    b.onclick = () => { closeMenu(); startScene(i); };
    list.appendChild(b);
    if (s.choice) {
      const k = document.createElement("button");
      k.className = "jump-choice";
      k.textContent = "Seçime git: " + s.choice.question;
      k.onclick = () => { closeMenu(); startScene(i, true); };
      list.appendChild(k);
    }
  });
}
function openMenu() { buildMenu(); $("menu").hidden = false; $("menu-btn").setAttribute("aria-expanded", "true"); }
function closeMenu() { $("menu").hidden = true; $("menu-btn").setAttribute("aria-expanded", "false"); }
$("menu-btn").onclick = () => $("menu").hidden ? openMenu() : closeMenu();
$("menu-close").onclick = closeMenu;
$("menu-home").onclick = () => { closeMenu(); clearInterval(typing); playVideo(""); setImage(""); show("start"); };
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

preloadImages();