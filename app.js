// Swap Shop app: sign-in and catalogue.
// Each section below starts with a comment saying what it does.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
  signOut, reload
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, query, where, onSnapshot, getDoc, updateDoc,
  writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { firebaseConfig, SCHOOL_DOMAIN, CATEGORIES } from "./config.js";

// ───────── Connect to Firebase ─────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// The local cache keeps items on the phone, so the app opens fast and
// uses less of Firebase's free daily allowance.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// ───────── Small helpers ─────────
const $ = (id) => document.getElementById(id);

// Builds an HTML element. User text always goes in with textContent,
// never innerHTML, so nobody can sneak code into an item name.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child != null) node.append(child);
  return node;
}

function show(viewId) {
  for (const id of ["loading-view", "auth-view", "verify-view", "app-view"]) {
    $(id).hidden = id !== viewId;
  }
}

function isSchoolEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@" + SCHOOL_DOMAIN);
}

let toastTimer;
function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
}

// Turns Firebase's error codes into plain English.
function friendlyError(err) {
  const messages = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "That doesn't look like an email address.",
    "auth/email-already-in-use": "There's already an account with this email. Try signing in.",
    "auth/weak-password": "Please choose a longer password.",
    "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
    "auth/network-request-failed": "No internet connection.",
    "permission-denied": "You don't have permission to do that."
  };
  return messages[err.code] || "Something went wrong. Please try again.";
}

// ───────── Sign in / create account ─────────
let authMode = "signin";

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("tab-signin").classList.toggle("active", !signup);
  $("tab-signup").classList.toggle("active", signup);
  $("tab-signin").setAttribute("aria-pressed", String(!signup));
  $("tab-signup").setAttribute("aria-pressed", String(signup));
  $("auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-hint").hidden = !signup;
  $("forgot-btn").hidden = signup;
  $("auth-msg").textContent = "";
}

$("tab-signin").addEventListener("click", () => setAuthMode("signin"));
$("tab-signup").addEventListener("click", () => setAuthMode("signup"));

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("auth-email").value.trim().toLowerCase();
  const password = $("auth-password").value;
  const msg = $("auth-msg");

  if (!isSchoolEmail(email)) {
    msg.textContent = `Please use your @${SCHOOL_DOMAIN} email.`;
    return;
  }
  if (authMode === "signup" && password.length < 8) {
    msg.textContent = "Your password needs at least 8 characters.";
    return;
  }

  $("auth-submit").disabled = true;
  msg.textContent = "";
  try {
    if (authMode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    // onAuthStateChanged (below) takes it from here.
  } catch (err) {
    msg.textContent = friendlyError(err);
  } finally {
    $("auth-submit").disabled = false;
  }
});

$("forgot-btn").addEventListener("click", async () => {
  const email = $("auth-email").value.trim().toLowerCase();
  if (!isSchoolEmail(email)) {
    $("auth-msg").textContent = "Type your school email above first.";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    $("auth-msg").textContent = "If there's an account for that email, a reset link is on its way.";
  } catch (err) {
    $("auth-msg").textContent = friendlyError(err);
  }
});

// ───────── Email verification ─────────
$("verified-btn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await reload(user);
  if (user.emailVerified) {
    await user.getIdToken(true); // refresh so the database sees "verified"
    handleUser(user);
  } else {
    $("verify-msg").textContent = "Not verified yet. Click the link in the email first.";
  }
});

$("resend-btn").addEventListener("click", async () => {
  try {
    await sendEmailVerification(auth.currentUser);
    $("verify-msg").textContent = "Sent! Check your inbox (and Junk).";
  } catch (err) {
    $("verify-msg").textContent = friendlyError(err);
  }
});

$("verify-signout").addEventListener("click", () => signOut(auth));
$("signout-btn").addEventListener("click", () => signOut(auth));

// ───────── What happens when someone signs in or out ─────────
let currentUser = null;
let role = "student"; // "student", "leader" or "supervisor"
let isStaff = false;

onAuthStateChanged(auth, handleUser);

async function handleUser(user) {
  stopListening();
  currentUser = user;

  if (!user) {
    show("auth-view");
    return;
  }
  if (!isSchoolEmail(user.email)) {
    await signOut(auth);
    $("auth-msg").textContent = `Please use your @${SCHOOL_DOMAIN} email.`;
    return;
  }
  if (!user.emailVerified) {
    $("verify-email").textContent = user.email;
    $("verify-msg").textContent = "";
    show("verify-view");
    return;
  }

  show("loading-view");
  role = await loadRole(user.email);
  isStaff = role === "leader" || role === "supervisor";

  $("role-badge").hidden = !isStaff;
  $("role-badge").textContent = role === "supervisor" ? "Supervisor" : "Leader";
  currentCat = "All";
  startListening();
  show("app-view");
}

// Leaders and supervisors are listed in the "roles" collection,
// one document per email. Everyone else is a student.
async function loadRole(email) {
  try {
    const snap = await getDoc(doc(db, "roles", email.toLowerCase()));
    return snap.exists() ? snap.data().role : "student";
  } catch {
    return "student";
  }
}

// ───────── Live item lists from the database ─────────
let unsubscribers = [];
let sources = {}; // each live list, kept separately, merged in allItems()

function listen(name, q) {
  sources[name] = new Map();
  const unsub = onSnapshot(q, (snap) => {
    const map = new Map();
    snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
    sources[name] = map;
    render();
  }, (err) => {
    console.error(err);
    toast("Couldn't load items. Check your connection.");
  });
  unsubscribers.push(unsub);
}

function startListening() {
  const items = collection(db, "items");
  if (isStaff) {
    listen("all", items); // leaders see everything
  } else {
    listen("available", query(items, where("status", "==", "available")));
    listen("mine", query(items, where("addedBy", "==", currentUser.uid)));
  }
}

function stopListening() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  sources = {};
}

function allItems() {
  const merged = new Map();
  for (const map of Object.values(sources)) for (const [id, item] of map) merged.set(id, item);
  return merged;
}

const timeOf = (item) => item.createdAt?.toMillis?.() ?? Date.now();

// ───────── Drawing the catalogue ─────────
let currentCat = "All";
$("search").addEventListener("input", render);

function render() {
  const items = [...allItems().values()];
  const search = $("search").value.trim().toLowerCase();

  // Category chips (leaders also get "Taken" to see what's gone)
  const chipNames = ["All", ...CATEGORIES, ...(isStaff ? ["Taken"] : [])];
  $("chips").replaceChildren(...chipNames.map((name) =>
    el("button", {
      type: "button",
      class: "chip" + (name === currentCat ? " active" : ""),
      "aria-pressed": String(name === currentCat),
      text: name,
      onclick: () => { currentCat = name; render(); }
    })
  ));

  // The main grid
  const wantedStatus = currentCat === "Taken" ? "taken" : "available";
  const visible = items
    .filter((i) => i.status === wantedStatus)
    .filter((i) => currentCat === "All" || currentCat === "Taken" || i.category === currentCat)
    .filter((i) => !search || i.name.toLowerCase().includes(search) || (i.description || "").toLowerCase().includes(search))
    .sort((a, b) => timeOf(b) - timeOf(a));

  $("grid").replaceChildren(...visible.map(itemCard));
  $("empty-msg").hidden = visible.length > 0;

  // Leaders: items waiting for drop-off confirmation
  const waiting = items.filter((i) => i.status === "submitted").sort((a, b) => timeOf(a) - timeOf(b));
  $("staff-queue").hidden = !isStaff || waiting.length === 0;
  if (isStaff) $("queue-list").replaceChildren(...waiting.map(queueRow));

  // Students: their own items still waiting
  const mine = items.filter((i) => i.status === "submitted" && i.addedBy === currentUser.uid);
  $("my-submissions").hidden = isStaff || mine.length === 0;
  if (!isStaff) $("mine-list").replaceChildren(...mine.map((i) =>
    el("div", { class: "row" },
      el("img", { class: "row-thumb", src: i.thumb, alt: "" }),
      el("div", { class: "row-text" },
        el("strong", { text: i.name }),
        el("span", { class: "muted", text: "Waiting for a leader" }))
    )
  ));
}

function itemCard(item) {
  return el("button", { type: "button", class: "item-card", onclick: () => openItem(item.id) },
    el("img", { src: item.thumb, alt: "", loading: "lazy" }),
    el("span", { class: "item-card-name", text: item.name }),
    el("span", { class: "muted small", text: item.category })
  );
}

function queueRow(item) {
  return el("div", { class: "row" },
    el("img", { class: "row-thumb", src: item.thumb, alt: "" }),
    el("div", { class: "row-text" },
      el("strong", { text: item.name }),
      el("span", { class: "muted small", text: `${item.category} · from ${item.addedByEmail}` })),
    el("div", { class: "row-actions" },
      el("button", { type: "button", class: "btn small primary", text: "Confirm", onclick: () => setStatus(item.id, "available", "Added to the catalogue") }),
      el("button", { type: "button", class: "btn small secondary", text: "Reject", onclick: () => deleteItem(item.id) }))
  );
}

// ───────── Item details ─────────
let openItemId = null;

async function openItem(id) {
  const item = allItems().get(id);
  if (!item) return;
  openItemId = id;

  $("item-photo").src = item.thumb; // small version first, sharp one loads below
  $("item-photo").alt = item.name;
  $("item-cat").textContent = item.category;
  $("item-name").textContent = item.name;
  $("item-desc").textContent = item.description || "";
  $("item-status").textContent = {
    available: "Available",
    taken: "Taken",
    submitted: "Waiting for drop-off confirmation"
  }[item.status] || "";

  const actions = [];
  if (isStaff) {
    if (item.status === "available") actions.push(["Mark as taken", "primary", () => setStatus(id, "taken", "Marked as taken")]);
    if (item.status === "taken") actions.push(["Put back in catalogue", "primary", () => setStatus(id, "available", "Back in the catalogue")]);
    if (item.status === "submitted") actions.push(["Confirm drop-off", "primary", () => setStatus(id, "available", "Added to the catalogue")]);
    actions.push(["Delete", "danger", () => deleteItem(id)]);
  }
  $("item-actions").replaceChildren(...actions.map(([label, kind, fn]) =>
    el("button", { type: "button", class: `btn ${kind}`, text: label, onclick: async () => { await fn(); $("item-dialog").close(); } })
  ));

  $("item-dialog").showModal();

  try {
    const photo = await getDoc(doc(db, "photos", id));
    if (photo.exists() && openItemId === id) $("item-photo").src = photo.data().data;
  } catch { /* the small photo is fine */ }
}

// ───────── Leader actions ─────────
async function setStatus(id, status, doneMessage) {
  try {
    await updateDoc(doc(db, "items", id), { status, statusChangedAt: serverTimestamp() });
    toast(doneMessage);
  } catch (err) {
    toast(friendlyError(err));
  }
}

async function deleteItem(id) {
  if (!confirm("Delete this item for good?")) return;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, "items", id));
    batch.delete(doc(db, "photos", id));
    await batch.commit();
    toast("Deleted");
  } catch (err) {
    toast(friendlyError(err));
  }
}

// ───────── Adding an item ─────────
$("add-cat").replaceChildren(...CATEGORIES.map((c) => el("option", { value: c, text: c })));

$("add-btn").addEventListener("click", () => {
  $("add-form").reset();
  $("add-preview").hidden = true;
  $("add-msg").textContent = "";
  $("add-note").textContent = isStaff
    ? "It shows in the catalogue straight away."
    : "Dropping something off? Add it here. A leader confirms it once it's in the Swap Shop.";
  $("add-dialog").showModal();
});

$("add-photo").addEventListener("change", () => {
  const file = $("add-photo").files[0];
  if (!file) return;
  $("add-preview").src = URL.createObjectURL(file);
  $("add-preview").hidden = false;
});

$("add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = $("add-photo").files[0];
  const name = $("add-name").value.trim();
  const msg = $("add-msg");

  if (!file) { msg.textContent = "Please add a photo."; return; }
  if (!name) { msg.textContent = "Please give the item a name."; return; }

  $("add-submit").disabled = true;
  $("add-submit").textContent = "Adding…";
  msg.textContent = "";

  try {
    // Two versions of the photo: a small one for the grid, a bigger one for the details view
    const thumb = await shrinkPhoto(file, 360, 50000);
    const full = await shrinkPhoto(file, 1100, 700000);

    const itemRef = doc(collection(db, "items"));
    const batch = writeBatch(db);
    batch.set(itemRef, {
      name,
      category: $("add-cat").value,
      description: $("add-desc").value.trim(),
      thumb,
      status: isStaff ? "available" : "submitted",
      addedBy: currentUser.uid,
      addedByEmail: currentUser.email,
      createdAt: serverTimestamp()
    });
    batch.set(doc(db, "photos", itemRef.id), { data: full, addedBy: currentUser.uid });
    await batch.commit();

    $("add-dialog").close();
    toast(isStaff ? "Item added" : "Thanks! A leader will confirm it.");
  } catch (err) {
    console.error(err);
    msg.textContent = err.message === "bad-photo"
      ? "Couldn't read that photo. Try a JPG or PNG."
      : friendlyError(err);
  } finally {
    $("add-submit").disabled = false;
    $("add-submit").textContent = "Add item";
  }
});

// Shrinks a photo on the phone so it fits in the free database.
// maxSide = longest side in pixels; maxChars = size limit of the result.
async function shrinkPhoto(file, maxSide, maxChars) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  try { await img.decode(); } catch { throw new Error("bad-photo"); }

  let scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    for (let quality = 0.8; quality >= 0.4; quality -= 0.1) {
      const result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= maxChars) return result;
    }
    scale *= 0.75; // still too big: make it smaller and try again
  }
  throw new Error("bad-photo");
}

// ───────── Close buttons in pop-ups ─────────
document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => btn.closest("dialog").close())
);
$("item-dialog").addEventListener("close", () => { openItemId = null; });
