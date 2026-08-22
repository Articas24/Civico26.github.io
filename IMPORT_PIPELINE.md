# Civico 26 · Pipeline import dati

## Obiettivo
Aggiornare statistiche Booking/Airbnb senza sovrascritture distruttive e senza duplicati, usando lo stesso motore per upload manuale, email e future API ufficiali.

## Fase 0 · Punto di ripristino
Prima dell'introduzione dell'importer è stato creato il branch GitHub:

`backup/pre-auto-import-2026-08-22`

Commit di riferimento: `ca1a031a58da4b0ae97b7af153912df7b4f8323f`.

In Supabase sono stati inoltre copiati, nello schema privato non esposto alla Data API:

- `private.backup_booking_history_20260822_1425` — 94 righe
- `private.backup_platform_finance_ledger_20260822_1425` — 139 righe

Queste copie non devono essere modificate e servono esclusivamente come recovery di emergenza.

## Fase 1 · Import manuale sicuro
La sezione Statistiche espone `Aggiorna dati`.

Flusso:
1. selezione CSV Booking/Airbnb;
2. parsing e normalizzazione;
3. confronto con i dati esistenti;
4. classificazione `new / unchanged / update / conflict / error`;
5. salvataggio di una simulazione separata;
6. conferma esplicita dell'admin.

Regole:
- una riga identica non viene riscritta;
- lo stesso ID esterno viene aggiornato, non duplicato;
- i campi mancanti nel nuovo report non cancellano valori già presenti;
- un dato assente dal nuovo file non viene eliminato dal database;
- conflitti/errori bloccano l'applicazione;
- l'applicazione è una singola transazione PostgreSQL: tutto o niente;
- prima di un update viene ricontrollato che il record non sia cambiato dopo la simulazione.

## Fase 2 · Audit, rielaborazione e rollback
Ogni import conserva:
- file originale;
- hash file;
- righe normalizzate;
- classificazione;
- valore precedente e successivo per ogni modifica;
- timestamp e canale d'origine.

Dal Registro import è possibile rielaborare il file oppure annullare un batch applicato.

Il rollback viene bloccato interamente se una riga è stata modificata da un import successivo: non può quindi cancellare accidentalmente dati più recenti.

## Fase 3 · Email automatica
La Edge Function Supabase `import-email-reports` usa la stessa pipeline dell'upload.

L'endpoint è destinato a un provider email/webhook esterno ed è protetto da un segreto server-side `x-import-secret`; il segreto non deve mai essere inserito nel frontend o nel repository.

Stato iniziale:
- `email_auto_apply = false`
- `webhook_enabled = false`

Finché non viene configurato un provider inbound reale, l'automazione email va considerata predisposta ma non collegata.

Quando verrà collegata, è preferibile iniziare lasciando `email_auto_apply = false`, verificare alcuni batch nel Registro import e solo dopo valutare l'auto-applicazione dei batch con zero conflitti/errori.

## Fase 4 · API ufficiali
`import_batches.channel` supporta già `api`. Un futuro adapter Booking/Airbnb dovrà produrre gli stessi record normalizzati e passare dallo stesso controllo di deduplicazione/audit.

Le API non sono collegate finché non vengono fornite/approvate credenziali partner ufficiali.

## Recovery di emergenza
### Codice
Ripristinare il codice dal branch `backup/pre-auto-import-2026-08-22` oppure revertire esclusivamente il commit/PR dell'importer.

### Singolo import
Usare `Annulla import` nel Registro. È il metodo preferito perché ripristina soltanto le modifiche del batch interessato.

### Snapshot globale pre-import
Solo in caso di recovery straordinario, confrontare prima i dati live con le due copie nello schema `private` e ripristinare in una transazione controllata. Non eseguire mai un restore globale senza aver verificato cosa è successo dopo lo snapshot.

## Principio fondamentale
Nessun canale (manuale, email o API) scrive direttamente nelle statistiche: tutti producono prima un batch auditabile e deduplicato.