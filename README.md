# AIDA Break-Even Getränkepauschale

Mobile-first Web-App zum Erfassen und Auswerten der AIDA ALL IN Getränkepauschale im Team.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS v4, Radix UI (shadcn-Pattern), Lucide Icons
- **Backend/DB:** Supabase (PostgreSQL), Zugriff direkt per `@supabase/supabase-js` vom Client aus (kein Login nötig)

## Setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY eintragen
npm run dev
```

Die produktive Datenbank samt Schema (`teams`, `members`, `beverages`, `consumptions`) und den 213 importierten AIDA-Getränken ist bereits unter dem in `.env.local` hinterlegten Supabase-Projekt eingerichtet.

## Funktionen

- **Onboarding:** Team erstellen (mit Join-Code) oder per Code beitreten, Session wird im LocalStorage gehalten.
- **Erfassen:** Getränke nach Kategorie/Suche filtern, Mitglied wechseln, Menge per +/- buchen.
- **Dashboard:** Break-Even-Fortschritt pro Person und Team, Ranking, Historie mit Löschfunktion.

## Build & Lint

```bash
npm run lint
npm run build
```
