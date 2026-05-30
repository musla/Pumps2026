# Nasazení – 4 kroky (cca 10 min na mobilu)

## Krok 1 – Otevři Apps Script přes Google Sheet

1. Otevři svůj Google Sheet:  
   `https://docs.google.com/spreadsheets/d/164rkNgIWwNbeL7arpYTIIGQiC11SKw2i5DKuM_vv87E`
2. Klikni: **Rozšíření → Apps Script**
3. Otevře se editor – pokračuj krokem 2.

---

## Krok 2 – Vlož soubory

V Apps Script editoru:

### Code.gs
- Smaž veškerý existující kód
- Vlož celý obsah souboru **`Code.gs`**
- Ulož (Ctrl+S / ikona diskety)

### 4 HTML soubory
Pro každý soubor (`styles.html`, `crew.html`, `admin.html`, `leaderboard.html`):
1. Klikni **+** vedle „Soubory" → **HTML**
2. Pojmenuj přesně (bez přípony, editor ji přidá): `styles`, `crew`, `admin`, `leaderboard`
3. Smaž výchozí obsah, vlož obsah příslušného souboru
4. Ulož

---

## Krok 3 – Inicializuj data

1. V editoru vyber funkci **`setupSheets`** → klikni ▶ **Spustit**  
   *(Při prvním spuštění povol přístup – klikni „Povolit")*
2. Vyber funkci **`initCrews`** → klikni ▶ **Spustit**
3. Klikni **Zobrazit protokol** – uvidíš URL pro každou posádku 🎉

---

## Krok 4 – Nasaď jako Web App

1. Klikni **Nasadit** (vpravo nahoře) → **Nové nasazení**
2. Typ: **Webová aplikace**
3. Nastavení:
   - Spustit jako: **Já**
   - Přístup: **Kdokoli**
4. Klikni **Nasadit** → zkopíruj URL

**Hotovo!** Tvoje URL vypadá takto:  
`https://script.google.com/macros/s/AKfycb.../exec`

---

## URL stránek

| Stránka | URL |
|---------|-----|
| Posádka | `<tvoje-url>?token=nabu26` |
| Admin   | `<tvoje-url>?page=admin` |
| Žebříček | `<tvoje-url>?page=leaderboard` |

---

## Tokeny posádek

| # | Posádka | Token |
|---|---------|-------|
| 1 | Polyněšti Tygři | `nabu26` |
| 2 | Keraservis | `io26ker` |
| 3 | Ebm, Výběr z hroznů | `dia26ebm` |
| 4 | Hinton | `kore26hi` |
| 5 | ELOS Sailing team | `metis26e` |
| 6 | Lumeni | `janus26l` |
| 7 | Avrio | `milky26a` |
| 8 | Legends sailing team | `ceres26l` |
| 9 | Invin | `ketu26in` |
| 10 | Kopyta z Brna | `elara26k` |
| 11 | Twinky Holky | `nebul26t` |
| 12 | Ebm, Men over board | `albed26m` |
| 13 | Futura racing team | `calis26f` |
| 14 | Lokomotiva ČB | `mondo26l` |
| 15 | OHLA ŽS | `eris26oh` |
| 16 | HY Racing | `mimas26h` |

---

## Denní postup

| Čas | Akce |
|-----|------|
| do 10:00 | Admin: `?page=admin` → záložka Rozjízdy → nastav počet |
| 10:00–12:00 | Posádky tipují přes svůj odkaz |
| po závodě | Admin: záložka Výsledky → zadej pořadí |
| kdykoli | Žebříček: `?page=leaderboard` |

---

## Bodování

🎯 Přesné místo = **3 body** · ±1 místo = **1 bod** · jinak = **0 bodů**
