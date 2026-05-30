# Pumps 2026 – Návod na nastavení

## Přehled

```
GitHub Pages  ──→  volá  ──→  Google Apps Script Web App
(HTML/JS)                      (backend API)
                                      │
                                      ↓
                              Google Sheets (data)
```

---

## Krok 1 – Google Sheets

1. Otevři [sheets.google.com](https://sheets.google.com) a vytvoř nový spreadsheet.
2. Přejmenuj ho na **Pumps 2026**.
3. Nastav timezone: **Soubor → Nastavení → Obecné → Časové pásmo → Europe/Prague**
4. Poznač si URL tabulky (ID je část mezi `/d/` a `/edit`).

---

## Krok 2 – Google Apps Script

1. V tabulce klikni **Rozšíření → Apps Script**.
2. Smaž veškerý výchozí kód.
3. Zkopíruj celý obsah souboru `apps-script/Code.gs` z tohoto repozitáře.
4. Vlož do editoru a ulož (Ctrl+S).
5. **Změn admin heslo** na řádku: `const ADMIN_KEY = 'pumps2026admin';`

---

## Krok 3 – Inicializace posádek

1. V Apps Script editoru vyber funkci **`setupSheets`** a klikni ▶ Spustit.  
   → Vytvoří se 4 listy: Posadky, Rozjizdy, Tipy, Vysledky.
2. Vyber funkci **`initCrews`** a klikni ▶ Spustit.  
   → Vytvoří se záznamy pro všech 16 posádek.
3. Klikni na **Zobrazit logy** (⌘+Enter) – zobrazí se URL pro každou posádku.

---

## Krok 4 – Nasazení Apps Script jako Web App

1. V Apps Script editoru klikni **Nasadit → Nové nasazení**.
2. Typ: **Webová aplikace**.
3. Spustit jako: **Já (tom.hnilica@gmail.com)**
4. Kdo má přístup: **Kdokoli**
5. Klikni **Nasadit** a zkopíruj vygenerovanou URL (vypadá jako  
   `https://script.google.com/macros/s/AKfycbxXXXX.../exec`).

---

## Krok 5 – Konfigurace frontendu

1. Otevři soubor `config.js`.
2. Vlož zkopírovanou URL do proměnné `API_URL`.
3. Pokud jsi změnil admin heslo, uprav i `adminKey`.

---

## Krok 6 – GitHub Pages

1. Pushni kód do repozitáře `musla/Pumps2026`.
2. V GitHub → Settings → Pages → Source: `Deploy from branch` → `main` → `/ (root)`.
3. Stránky budou na: `https://musla.github.io/Pumps2026/`

---

## Adresy

| Stránka | URL |
|---------|-----|
| Žebříček (veřejný) | `https://musla.github.io/Pumps2026/leaderboard.html` |
| Admin panel | `https://musla.github.io/Pumps2026/admin.html` |
| Posádka (příklad) | `https://musla.github.io/Pumps2026/?token=nabu26` |

---

## Tokeny posádek (URL parametr `?token=`)

| # | Posádka | Loď | Token |
|---|---------|-----|-------|
| 1 | Polyněšti Tygři | NABU | `nabu26` |
| 2 | Keraservis | IO | `io26ker` |
| 3 | Ebm, Výběr z hroznů | DIA | `dia26ebm` |
| 4 | Hinton | KORE | `kore26hi` |
| 5 | ELOS Sailing team | METIS | `metis26e` |
| 6 | Lumeni | JANUS | `janus26l` |
| 7 | Avrio | MILKY WAY | `milky26a` |
| 8 | Legends sailing team | CERES | `ceres26l` |
| 9 | Invin | KETU | `ketu26in` |
| 10 | Kopyta z Brna | ELARA | `elara26k` |
| 11 | Twinky Holky | NEBULA | `nebul26t` |
| 12 | Ebm, Men over board | ALBEDO | `albed26m` |
| 13 | Futura racing team | CALISTO | `calis26f` |
| 14 | Lokomotiva ČB | MONDO | `mondo26l` |
| 15 | OHLA ŽS | ERIS | `eris26oh` |
| 16 | HY Racing | MIMAS | `mimas26h` |

---

## Denní workflow

| Čas | Akce | Kdo |
|-----|------|-----|
| do 10:00 | Admin zadá počet rozjízd na den | admin.html → záložka Rozjízdy |
| 10:00–12:00 | Posádky tipují pořadí v každé rozjízdě | jejich osobní URL |
| po 12:00 | Tipování se automaticky uzavře | — |
| po závodech | Admin zadá výsledky | admin.html → záložka Výsledky |
| kdykoli | Žebříček se aktualizuje | leaderboard.html |

---

## Bodování

- **Přesný tip** (správné místo) = **3 body**
- **Odchylka ±1 místo** = **1 bod**
- **Jinak** = **0 bodů**

Výsledný vítěz = posádka s nejvíce body za celou regatu.

---

## Při změně nasazení Apps Script

Při každé změně kódu musíš vytvořit **nové nasazení** (ne aktualizovat stávající),
jinak se změny neprojeví. Zkopíruj novou URL a aktualizuj `config.js`.
