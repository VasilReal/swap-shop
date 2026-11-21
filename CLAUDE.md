# Swap Shop app: context for Claude

## What this is
A web app for the Swap Shop at LPCUWC (Li Po Chun United World College, Hong Kong).
The Swap Shop is a room where students leave things they no longer need; it opens
now and again, run by student leaders ("QC leaders") with two teacher supervisors.
The app lets students see what's there without walking over, get notified when it
opens, and reserve items.

The developer is a final-year student with basic coding knowledge. Explain changes
in plain language, keep the code simple and well commented, and avoid adding build
tools or frameworks unless really needed — next year's students must be able to
maintain it.

## Status
- Approved by the Swap Shop supervisor and one QC leader; leaders liked the clickable mockup.
- Version 1 written (sign-in + catalogue). Setup steps are in README.md.
- Next: step 3 (openings + notifications), then step 4 (reservations), then testing with leaders, then launch.

## Tech choices (and why)
- Plain HTML/CSS/JavaScript (ES modules), no build step. Firebase JS SDK 12.12.0 from the gstatic CDN.
- Firebase Authentication with **email + password and email verification**.
  Not email-link sign-in: the free Spark plan allows only 5 sign-in-link emails a day.
  Not "Sign in with Microsoft": the school uses Outlook / Microsoft 365, and school IT would need to approve it.
- Cloud Firestore, location asia-east2 (Hong Kong), free Spark plan.
- **No Cloud Storage**: it now requires the paid Blaze plan. Photos are shrunk in the
  browser and stored as JPEG data URLs in Firestore: a small `thumb` (<50 KB) on the
  item document, and a bigger version in `photos/{itemId}` (<700 KB).
- Hosted on GitHub Pages (no Firebase CLI needed). The Pages domain must be in
  Firebase Auth → Authorized domains.
- Must stay within free tiers. Keep Firestore reads and downloads low (local persistent cache is on).

## Access rules
- Only verified `@lpcuwc.edu.hk` emails can use the app.
- Roles live in the `roles` collection: doc ID = lower-case email, field `role` = `leader` or `supervisor`.
  Anyone without a role doc is a student. Supervisors can edit roles.
- Security is enforced in `firestore.rules`; the client-side checks are only for nicer messages.

## Data model (Firestore)
- `items/{id}`: name, category, description, thumb, status (`submitted` | `available` | `taken`),
  addedBy (uid), addedByEmail, createdAt, statusChangedAt
- `photos/{itemId}`: data (data URL), addedBy
- `roles/{email}`: role
- Categories: Clothes, Bedding, Kitchen, Books, Electronics, Other (kept in both js/config.js and firestore.rules)

## Roles and features
| Role | Can do |
| --- | --- |
| Student | Browse, search and filter items; add items they drop off; reserve items (step 4); get opening notifications (step 3) |
| Leader | All of the above, plus add items straight to the catalogue, confirm student items, mark items taken or put them back, delete, approve or decline reservations, set opening times |
| Supervisor (2 teachers) | Everything a leader can, plus manage who is a leader |

- Items added by students start as `submitted` and are hidden until a leader confirms the
  drop-off. (A decision made by the developer; leaders may ask to change it.)

## Reservation rules (step 4, agreed with the student)
- Reserve any time up to **15 minutes before** an opening.
- **Max 2 per person**, and pending requests count toward the limit.
- A **leader approves** each request.
- An approved item is **held until the next opening**.
- No-show: the item goes back on the list.
- **More than one no-show** means the student can't reserve for **the rest of the term** (resets each term).
- Requests still pending when the shop opens are sorted out in person by the leaders on
  duty; leaders should see a "still pending" list at opening time.

## Openings and notifications (step 3)
- Leaders set the next opening date and time; all students get notified when it's
  announced and reminded before it starts.
- The app should be installable to the home screen (PWA) so phone notifications work.
  Check what's possible on the free plan before choosing how to send them.

## Design
Green theme matching the mockup: primary #1B6B45, dark #124A30, tint #E6F0EA,
Space Grotesk headings, Inter body text. Mobile first, touch targets ≥ 44 px, accessible labels.
