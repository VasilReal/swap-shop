# Swap Shop app (LPCUWC)

A web app for the LPCUWC Swap Shop. Students browse what's in the Swap Shop
from their phones, and leaders keep the catalogue up to date.

**Done so far:** sign-in with school email, the catalogue (photos, categories,
search), adding items, leaders confirming student items and marking items as taken.
**Coming next:** opening times and notifications, then reservations.

## What's in this folder

| File | What it does |
| --- | --- |
| `index.html` | The screens: sign-in, catalogue, pop-ups |
| `styles.css` | How everything looks (colours at the top) |
| `js/app.js` | Everything the app does |
| `js/config.js` | Your Firebase settings, plus the list of categories |
| `firestore.rules` | Security: who can see and change what |

---

## Setup (about 30 minutes, once)

### 1. Add a web app to your Firebase project
1. Open console.firebase.google.com and go into your `swap-shop` project.
2. On the project home page, click the **`</>`** (Web) icon.
3. Nickname: `swap-shop-web`. Leave "Firebase Hosting" unticked. Click **Register app**.
4. You'll see a block of code with `const firebaseConfig = { ... }`.
   Copy the six values (apiKey, authDomain, ...) into `js/config.js`, replacing each `PASTE-HERE`.

### 2. Turn on sign-in
1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → switch on the first toggle only → **Save**.
3. Optional but nice: **Templates** tab → edit the "Email address verification" email and
   set the sender name to `LPCUWC Swap Shop`.

### 3. Create the database
1. Left menu: **Build → Firestore Database → Create database**.
2. Location: pick **asia-east2 (Hong Kong)**. You can't change this later.
3. Start in **production mode** → **Create**.
4. Open the **Rules** tab, delete what's there, paste the whole of `firestore.rules`, click **Publish**.

### 4. Put the app online with GitHub Pages
1. On github.com click **+ → New repository**. Name it `swap-shop`, set it to **Public**, click **Create repository**.
2. Click **uploading an existing file**, drag in everything from this folder
   (including the `js` folder), then click **Commit changes**.
3. In the repository go to **Settings → Pages**. Under "Branch" choose **main** and **/ (root)** → **Save**.
4. After a minute or two the page shows your address, like `https://YOUR-USERNAME.github.io/swap-shop/`.

### 5. Let Firebase accept sign-ins from that address
Firebase → **Authentication → Settings → Authorized domains → Add domain** →
type `YOUR-USERNAME.github.io` (no `https://`, no `/swap-shop`) → **Add**.

### 6. Create your account and make yourself a supervisor
1. Open your app's address, choose **Create account**, use your school email.
2. Click the link in the email (check Junk), then **I've clicked the link**.
   You're in as a normal student.
3. In Firebase → **Firestore Database → Data → + Start collection**:
   - Collection ID: `roles`
   - Document ID: your school email, all lower case (e.g. `vasil27@lpcuwc.edu.hk`)
   - Field: `role`, type string, value `supervisor`
   - **Save**
4. Back in the app, sign out and in again. You now see a "Supervisor" badge.

### Adding leaders and the teacher supervisors
Same as step 6.3: one document in `roles` per person, ID = their email in lower case,
`role` = `leader` or `supervisor`. They need to create their own account in the app too.

---

## Making changes later
- Edit the files in VS Code, then upload the changed ones to GitHub again
  (**Add file → Upload files**). The site updates in a minute or two.
- To test on your own laptop first, install the VS Code extension **Live Server**,
  right-click `index.html` → **Open with Live Server**. (Opening the file by
  double-clicking won't work.)
- Changing categories: edit the list in `js/config.js` **and** the matching
  list in `firestore.rules` (then publish the rules again).

## Good to know
- **It's free.** Everything runs on Firebase's free plan. Photos are shrunk on the
  phone and stored in the database, because Firebase's separate photo storage
  needs a paid plan.
- **The Firebase settings in `config.js` aren't secret.** They're meant to be in the
  page. What keeps the data safe is `firestore.rules`: only verified
  `@lpcuwc.edu.hk` accounts get in, and only leaders can confirm, mark taken or delete.
- **Verification emails** come from `noreply@...firebaseapp.com`. If students
  can't find theirs, it's probably in Junk.
