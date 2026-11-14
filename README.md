# Orbis

Monthly station report generator – **Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui-style components · PostgreSQL (Drizzle)**.
Fill in the report once a month, preview it, export a designed **PDF** or **Word** file.

## Run it

```bash
npm install
npm run setup:pdf          # one-time: downloads Chromium used for PDF export
npm run db:up              # starts Postgres in Docker (or point DATABASE_URL to your own Postgres)
cp .env.example .env
npm run dev                # http://localhost:3000
```

Tables are created automatically on first load, and your **October 2026 report is imported** as the first report and starter template.

## How it works

| Concept | What it is |
|---|---|
| **Template** | JSON (stored in Postgres `jsonb`): cover fields + sections + fields. Edit it in **Templates → Edit**. |
| **Report** | Only the *values*, stored by field key. Change the template and every report updates. |
| **New report → Copy data from** | Start next month from last month, change only what differs. |

### Template builder – everything is dynamic
* Add / rename / reorder / duplicate / delete **sections** (with optional "start on new page").
* Add / edit / reorder / delete **fields** of 13 types: text, paragraph, number, %, date, dropdown, yes/no, bullet list, **table** (you define the columns), images, **calculated** (formulas), **chart**, sub-heading.
* Number fields can show as stat cards, progress rings or plain lines; any field can be hidden from the export.
* **Formulas:** `{loss_kwh}/{lv_sold}*100`, `sum({fault_log.duration})`, `avg()`, `count()`, `min()`, `max()`, `round()`.
* **Charts** from fields/formulas (bar, horizontal bars, donut, gauge) or from a table (bar, stacked bar, line, smooth area, risk matrix).
* Branding tab: company name, logo letters, footer, two brand colours – the whole export re-colours.
* Tables accept **Paste from Excel**.

### Themes
App: light + **pure-black (#000) dark** (toggle top-right). Exports are always light.

### Export
`/api/reports/:id/pdf` (Chromium, A4, page numbers, repeating table headers) and `/api/reports/:id/docx` (Word, real tables, headings, TOC links, charts embedded as images).

## Entries logs (photos, persons, conditional fields)
A new field type, **Entries log**, is for things you add over the month: inductions, visitors, PTWs, site photos…
Each entry has the fields *you* define – text, number, date, dropdown, yes/no, **photos** (exactly 1, or up to N, or unlimited) and **nested lists**.
Any field can be shown **only when** a dropdown has a certain value.

The built-in **Induction register** (Templates → Add field → ★ Induction register) is exactly your workflow:
per induction → *1 document photo*, *1 persons photo*, and a list of persons; each person is **In Karm / Out of Karm** –
only **Out of Karm** persons get *National ID number + ID front photo + ID back photo*. One entry can hold many persons.
In the report it appears as a summary table in Safety and as photo cards in Annex 6 (a second block "linked" to the same log).

## Add section wizard
Templates → *Add section*: tick what it should contain (notes, key numbers, table, entries log with photos, 1 or several photos), then refine every field.

## Saving safely
* Every edit saves **only the fields you changed** (merged into the stored JSON), so adding things on different days or devices never overwrites other fields.
* Failed saves are retried automatically and mirrored in the browser; unsaved edits are recovered next time you open the report; the tab warns before closing with unsaved changes.
* Photos are compressed in the browser and stored in their own Postgres table (`assets`), not inside the report JSON.
* **History** button: automatic snapshots (at most every 30 min while editing) you can restore – a restore snapshots the current state first.
* Limitation: two people editing the *same* field/table at the same moment – last save wins.
* Already ran an earlier version? Its stored template has the old induction table. Either `docker compose down -v` (wipes data) or add the preset via the template builder.

## Notes
* Daily-generation table/charts are empty until you paste data (the Word file had none) – paste columns *Day, PV, Gensets, Peak* from Excel.
* No login is included – put it behind your network/VPN or add auth before exposing it.

## Annexes, tokens, best-day curve, page layout

- **Every section starts on a new page** (PDF and Word). This is always on.
- **At a glance page**: the tiles/rings come from the template's *At a glance* tab (label, formula, unit, look).
- **Annexes**: use *Add annex* in any section of the template builder, then *Add field to Annex* inside it. Numbers (Annex 1, 2, …) are automatic, following template order. Placement: *end of report* (a reference card stays in the section) or *here* (own page inside the section).
- **Tokens**: write `{{annex:<key>}}` in any text, label, caption or table cell → prints "Annex N" and stays correct after re-ordering. `{{field_key}}` inserts a field value in template labels/captions.
- **Best-day curve**: the Overview section has an image block (`best_day_curve`). Upload an SVG or PNG; if empty, a framed slot is printed (toggle in the block settings).
- Existing templates already stored in the database are not changed automatically: reset the starter template or re-add the preset.

## Saving & photo downloads

- **Save button** (report editor and template builder, also Ctrl/Cmd+S): saves immediately. Autosave still runs in the background; the button shows "Saved" when nothing is pending.
- **Photos inside the PDF**: every uploaded original (induction documents, group photos, national IDs, PTWs, any image field) is embedded as an attachment of the exported PDF. Open the *Attachments* panel (paperclip) of the PDF reader and save them. The file name is printed under each photo, e.g. `01_01-10-2026_Person-2_Ahmed_National-ID-number…jpg`. (`pdf-lib` is a new dependency: run `npm install`.)
- **Photos ZIP** button: all originals in one ZIP, grouped in folders per section/field (`/api/reports/<id>/photos`).
- Report colours were lightened (same blue/teal theme) for cover, banners and table headers.

## Accounts, roles, landing site, settings (v3)

- **First run**: open the app → you are sent to **/setup** to create the first **administrator** (first name, last name, date of birth, username, password). After that, sign in at **/login**.
- **Roles**: *Admin* = everything (templates, Settings, Users, Inbox). *User* = dashboard, reports, exports. Admins add users in **Users** (names, date of birth, profile photo, role, active switch, password reset). Everyone edits their own photo/password in **My profile**.
- Passwords are hashed with scrypt; sessions are random tokens stored (hashed) in Postgres, in an httpOnly cookie (14 days). Login is throttled (5 failures → 1 min). When running `next start` over plain HTTP (no HTTPS) set `INSECURE_COOKIES=1`.
- Tables `users`, `sessions`, `messages` are created automatically on first use.
- **Public website** (no sign-in): `/` home, `/about`, `/contact`. Contact messages arrive in the admin **Inbox**.
- **Sidebar** layout: Dashboard (overview), Reports, Templates, Settings, Users, Inbox, My profile; collapsible, mobile drawer, light/pure-black dark.
- **Settings** (admin): *Appearance* (Ocean blue, **Sunset orange**, Emerald, Violet, or custom colours), *Company* (name, footer, page header), *Cover & layout* (cover style, A4/Letter, page numbers, contents page, At-a-glance page), *Export & photos* (attach originals to PDF, file names), *Live preview*. Stored per template, applied to PDF and Word.
- Existing templates keep working: new options default to the previous look.

## Deploying to Vercel
PDF export runs headless Chromium. On Vercel the app automatically uses `@sparticuz/chromium` (a serverless build) with `puppeteer-core`; locally it uses normal Playwright.

1. `npm install` (adds `@sparticuz/chromium`, `puppeteer-core`), commit, push, redeploy.
2. Set `DATABASE_URL` to a hosted Postgres (Neon, Supabase, Vercel Postgres) in Project -> Settings -> Environment Variables.
3. The PDF function needs memory: Project -> Settings -> Functions -> Memory 2048 MB or more; `maxDuration` is 60 s (Hobby plan max is 60 s).
4. Inter fonts are embedded from `fonts/`, so the PDF looks the same as locally.
5. If a PDF still fails, open Vercel -> Logs for `/api/reports/.../pdf` and read the error; the app shows it in the toast too.
Downloads are streamed, so Vercel's 4.5 MB response limit does not apply.
