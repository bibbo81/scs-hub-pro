# ⚙️ SCS Hub Pro — Contributor & Agent Workflow

Benvenuto!  
Questo documento definisce **le regole unificate** per **chiunque contribuisce** (umano o Codex/AI agent) al progetto **SCS Hub Pro**.

---

## 🚦 Linee guida uniche (Code, Commit, Branch, Deploy)

### ✅ 1️⃣ Stile codice
- Usa **4 spazi** per l’indentazione.
- Termina sempre le istruzioni JavaScript con `;`.
- Preferisci `const` e `let` a `var`.
- Mantieni le righe sotto **120 caratteri**.
- Usa funzioni arrow dove sensato.
- Commenta funzioni pubbliche in modo chiaro.

---

### ✅ 2️⃣ Testing
- Esegui `npm test` **prima di ogni commit**.
- Usa Node.js **v18**.
- Se mancano dipendenze: `npm install`.
- Risolvi tutti i test falliti prima di pushare.

---

### ✅ 3️⃣ Commit
- Segui formato: `type: breve descrizione` → es: `feat: add search module`.
- Tipi consentiti: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- Scrivi messaggi brevi, in forma imperativa.
- Raggruppa modifiche correlate in un solo commit.

---

### ✅ 4️⃣ Workflow Branch & Push (Niente branch patch!)

- Lavora **sempre** su `feature/complete-update`:
  ```bash
  git checkout feature/complete-update
  git pull origin feature/complete-update
