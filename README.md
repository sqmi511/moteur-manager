# Moteur Manager

Local-only MERN app (TypeScript, MongoDB) for electricity generator ("moteur") owners: manage subscribers, enter monthly readings, and print Arabic invoices on A4 (10 per page).
Nothing is deployed or hosted: everything runs on your own machine.

* **UI**: English by default, Arabic on demand (RTL layout). Fonts are bundled locally (Inter + Cairo via `@fontsource`), no CDN.
* **Invoices**: always Arabic RTL, dark ink only (prints well on white, yellow and pink paper).
* **Roles**: `admin` creates and disables moteur accounts; each `moteur` owner only sees his own data (JWT + bcrypt, every query filtered by `ownerId`).

## Requirements

* Node.js 18 or newer
* MongoDB running locally (default `mongodb://127.0.0.1:27017`)

## Run it

```bash
# 1. environment file
cp .env.example .env          # Windows: copy .env.example .env

# 2. install everything (root + server + client)
npm run install:all

# 3. sample data: 1 admin, 1 owner, 15 subscribers, 2 months of bills
npm run seed

# 4. start API (port 5000) and client (port 5173) together
npm run dev
```

Open **http://localhost:5173**

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | `admin`  | `admin123` |
| Owner | `moteur1`| `owner123` |

Re-running `npm run seed` wipes the database and recreates the sample data.

Other scripts: `npm run typecheck`, `npm run build`.

## How to use

1. **Settings** (owner): pick per-kWh and/or per-amp billing, prices (in USD), fixed fee, currency (USD / LBP / both) and exchange rate, name, phone, address, footer note and logo (PNG/JPG, stored in `server/uploads`).
2. **Subscribers**: add, edit, delete, search. Each subscriber is billed per kWh or per amp.
3. **Monthly billing**: choose the month. Previous readings are filled in automatically. Type the current reading and press **Enter** (or the arrow keys) to move down. Per-amp rows have a checkbox and the amps value prefilled. The total updates live. Press **Generate** to create all bills at once. Use **Payment** on any row to record a full or partial payment.
4. **Print invoices**: choose month, invoices and copy type, then press **Print**.
5. **Dashboard**: total billed, collected, unpaid, top consumers, unpaid invoices.

### Printing on an HP printer

In the browser print dialog choose: **Paper A4**, **Margins: None**, **Scale: 100%**. Background graphics are forced on by the page CSS.

* Copy types: **Subscriber** (نسخة المشترك), **Owner** (نسخة المالك), **Archive** (نسخة الأرشيف).
* **All 3** prints the full sheet three times in a row: load **white** paper first (subscriber), then **yellow** (owner), then **pink** (archive).
* The white/yellow/pink toggle only tints the on-screen preview and is never printed.
* The logo is printed with `grayscale(1) contrast(1.1)`.
* Layout: 2 columns x 5 rows = 10 invoices per A4 page, dashed cut lines, a new page every 10 invoices.

## Notes on money

* Prices and totals are stored in **USD**. LBP amounts are computed as `USD x exchangeRate`.
* Each bill keeps a **snapshot** of unit price, fixed fee, currency and rate, so changing settings never alters old invoices. Tick "Recalculate with current prices" before generating to refresh an existing month.
* `status` is derived from the paid amount: `paid`, `partial` or `unpaid`.
* Invoice numbers are sequential per owner.

## Project structure

```
.env.example
package.json            root scripts (npm run dev starts both)
server/                 Express + Mongoose + Zod (TypeScript)
  src/models            User, Settings, Subscriber, Bill (+ invoice counter)
  src/routes            auth, users (admin), settings, subscribers, bills, dashboard
  src/seed.ts           sample data
  uploads/              uploaded logos (served at /uploads)
client/                 Vite + React + TypeScript
  src/components        Invoice/Sheet, Modal, AnimatedNumber, MonthPicker...
  src/pages             Login, Dashboard, Subscribers, Billing, Print, Settings, Owners
  src/i18n              en.json, ar.json
  src/styles            app.css, print.css (A4 + invoice design)
```

## API summary (all under `/api`, JWT bearer token)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login`, GET `/auth/me` | |
| GET/POST/PATCH | `/users`, `/users/:id` | admin only; owners are disabled, not deleted |
| GET/PUT | `/settings` | owner |
| POST/DELETE | `/settings/logo` | multipart field `logo`, PNG/JPG up to 2 MB |
| GET/POST/PUT/DELETE | `/subscribers`, `/subscribers/:id` | `?q=` search |
| GET | `/bills?month=YYYY-MM` | |
| GET | `/bills/entries?month=YYYY-MM` | grid data with previous readings |
| POST | `/bills/bulk` | generate or update many bills |
| POST/GET/PUT/DELETE | `/bills`, `/bills/:id` | |
| PATCH | `/bills/:id/payment` | `{ paidAmount }` |
| GET | `/dashboard?month=YYYY-MM` | |

## Troubleshooting

* *"Could not connect to MongoDB"*: start the MongoDB service (`mongod`), or change `MONGO_URI` in `.env`.
* *Login says the server cannot be reached*: check that the API is running and that `PORT` in `.env` is the one the client proxies to (it reads the same `.env`).
* Change `JWT_SECRET` in `.env` to your own random string.
