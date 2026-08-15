const KEY = "taskmitra_tasks_v1";
let tasks = loadTasks();
let deferredInstall = null;

const $ = id => document.getElementById(id);
const statusEl = $("status");
const heardEl = $("heard");
const inputEl = $("commandInput");
const listEl = $("taskList");

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function saveTasks() {
  localStorage.setItem(KEY, JSON.stringify(tasks));
  render();
}
function say(text) {
  statusEl.textContent = text;
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
}
function formatDate(ms) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday:"short", day:"numeric", month:"short",
    hour:"numeric", minute:"2-digit"
  }).format(new Date(ms));
}
function parseCommand(raw) {
  const original = raw.trim();
  const s = original.toLowerCase();

  if (/^(what are|show|list|read|tell me) (my )?tasks/.test(s)) return {type:"list"};
  if (/^(what is|what's) my next task/.test(s)) return {type:"next"};
  if (/^(help|what can you do)/.test(s)) return {type:"help"};

  const complete = s.match(/^(complete task|finish task|mark task complete|done)\s+(.+)/);
  if (complete) return {type:"complete", query: original.slice(original.toLowerCase().indexOf(complete[2]))};

  const del = s.match(/^(delete task|remove task|delete|remove)\s+(.+)/);
  if (del) return {type:"delete", query: original.slice(original.toLowerCase().indexOf(del[2]))};

  let body = null;
  const prefixes = ["add task ", "create task ", "new task ", "remind me to ", "remind me "];
  for (const p of prefixes) {
    if (s.startsWith(p)) { body = original.slice(p.length).trim(); break; }
  }
  if (!body && (s.startsWith("i need to ") || s.startsWith("i have to "))) {
    body = original.slice(original.toLowerCase().indexOf("to") + 2).trim();
  }
  if (body) {
    const parsed = parseDateTime(body);
    return {type:"add", title:parsed.title, due:parsed.due};
  }
  return {type:"unknown"};
}

function parseDateTime(text) {
  let title = text;
  const now = new Date();
  let due = new Date(now);
  due.setSeconds(0,0);
  let matchedTime = false;

  const tm = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (tm) {
    let h = Number(tm[1]);
    const m = Number(tm[2] || 0);
    const ap = (tm[3] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    due.setHours(h,m,0,0);
    matchedTime = true;
    title = title.replace(tm[0], "").trim();
    if (due <= now && !/tomorrow/i.test(text)) due.setDate(due.getDate()+1);
  } else {
    due.setHours(9,0,0,0);
  }

  if (/tomorrow/i.test(text)) {
    due.setDate(due.getDate()+1);
    title = title.replace(/tomorrow/i, "").trim();
  } else {
    title = title.replace(/\btoday\b/i, "").trim();
  }
  title = title.replace(/\s+/g," ").replace(/^(on|for|at)\s+$/i,"").trim();
  return {title: title || text, due: due.getTime()};
}

function execute(raw) {
  const cmd = parseCommand(raw);
  heardEl.textContent = "You said: " + raw;

  if (cmd.type === "add") {
    const task = {id: Date.now(), title:cmd.title, due:cmd.due, done:false};
    tasks.push(task);
    saveTasks();
    scheduleReminder(task);
    say(`Added ${task.title}. Reminder set for ${formatDate(task.due)}.`);
  } else if (cmd.type === "list") {
    readTasks();
  } else if (cmd.type === "next") {
    const next = tasks.filter(t=>!t.done && t.due > Date.now()).sort((a,b)=>a.due-b.due)[0];
    say(next ? `Your next task is ${next.title}, ${formatDate(next.due)}.` : "You have no upcoming tasks.");
  } else if (cmd.type === "complete") {
    const t = tasks.find(x=>!x.done && x.title.toLowerCase().includes(cmd.query.toLowerCase()));
    if (!t) say("I could not find that task.");
    else { t.done=true; saveTasks(); say(`Completed ${t.title}.`); }
  } else if (cmd.type === "delete") {
    const i = tasks.findIndex(x=>x.title.toLowerCase().includes(cmd.query.toLowerCase()));
    if (i < 0) say("I could not find that task.");
    else { const name=tasks[i].title; tasks.splice(i,1); saveTasks(); say(`Deleted ${name}.`); }
  } else if (cmd.type === "help") {
    say("You can say add task study at 7 PM, what are my tasks, complete task study, or delete task study.");
  } else {
    say("I did not understand. Try add task study at 7 PM.");
  }
}

function readTasks() {
  const pending = tasks.filter(t=>!t.done).sort((a,b)=>a.due-b.due);
  if (!pending.length) { say("You have no pending tasks."); return; }
  let text = `You have ${pending.length} pending task${pending.length===1?"":"s"}. `;
  pending.forEach((t,i)=> text += `${i+1}. ${t.title}, ${formatDate(t.due)}. `);
  say(text);
}

function render() {
  const sorted = [...tasks].sort((a,b)=>a.due-b.due);
  if (!sorted.length) { listEl.innerHTML='<div class="empty">No tasks yet.</div>'; return; }
  listEl.innerHTML = sorted.map(t => `
    <div class="task ${t.done ? "done":""}">
      <div class="taskTitle">${escapeHtml(t.title)}</div>
      <div class="taskTime">${formatDate(t.due)}</div>
      <div class="taskActions">
        ${t.done ? "" : `<button class="complete" data-complete="${t.id}">✓ Complete</button>`}
        <button class="delete" data-delete="${t.id}">Delete</button>
      </div>
    </div>`).join("");
  document.querySelectorAll("[data-complete]").forEach(b=>b.onclick=()=> {
    const t=tasks.find(x=>x.id==b.dataset.complete); if(t){t.done=true;saveTasks();}
  });
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=> {
    tasks=tasks.filter(x=>x.id!=b.dataset.delete);saveTasks();
  });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

/*
 * Browser voice recognition is NOT guaranteed to work with Wi-Fi/mobile data
 * completely disabled. The rest of the app is offline. The typed command box
 * is the guaranteed offline input. If the phone/browser provides offline speech
 * recognition, the microphone button can work offline too.
 */
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  recognition.onstart=()=>{$("micBtn").classList.add("listening");statusEl.textContent="Listening...";};
  recognition.onend=()=>{$("micBtn").classList.remove("listening");};
  recognition.onerror=()=>{say("Voice recognition is unavailable right now. You can type the command below.");};
  recognition.onresult=e=>{
    const text=e.results[0][0].transcript;
    inputEl.value=text;
    execute(text);
  };
  $("micBtn").onclick=()=>recognition.start();
} else {
  $("micBtn").onclick=()=>say("Voice recognition is not available in this browser. You can type commands.");
}

$("runBtn").onclick=()=>{ const v=inputEl.value.trim(); if(v) execute(v); };
inputEl.addEventListener("keydown",e=>{if(e.key==="Enter") $("runBtn").click();});
$("readBtn").onclick=readTasks;
$("clearBtn").onclick=()=>{tasks=tasks.filter(t=>!t.done);saveTasks();say("Completed tasks cleared.");};

function scheduleReminder(task) {
  // Browser timers only work while the page is active. We also use Notification
  // where supported. A future native Android version will provide stronger alarms.
  const delay=task.due-Date.now();
  if(delay>0 && delay<2147483647) {
    setTimeout(()=> {
      if(!task.done) {
        say(`Reminder. ${task.title}.`);
        if("Notification" in window && Notification.permission==="granted")
          new Notification("TaskMitra reminder",{body:task.title});
      }
    }, delay);
  }
}
if ("Notification" in window && Notification.permission==="default") {
  // Do not prompt automatically; user can grant from browser settings if desired.
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
window.addEventListener("beforeinstallprompt", e=>{
  e.preventDefault(); deferredInstall=e; $("installBtn").hidden=false;
});
$("installBtn").onclick=async()=>{
  if(!deferredInstall)return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall=null;
  $("installBtn").hidden=true;
};

function updateNetwork() {
  $("onlineBadge").textContent=navigator.onLine ? "ONLINE" : "OFFLINE";
  $("onlineBadge").style.background=navigator.onLine ? "#dcfce7" : "#e0e7ff";
  $("onlineBadge").style.color=navigator.onLine ? "#166534" : "#3730a3";
}
window.addEventListener("online",updateNetwork);
window.addEventListener("offline",updateNetwork);
updateNetwork();
render();
