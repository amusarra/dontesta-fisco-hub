/**
 * Calcola la distanza di Levenshtein tra due stringhe.
 * Usiamo l'ottimizzazione a riga singola O(min(m, n)) per risparmiare memoria.
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let str1 = a;
    let str2 = b;

    if (str1.length > str2.length) {
        str1 = b;
        str2 = a;
    }

    const len1 = str1.length;
    const len2 = str2.length;
    let row = Array.from({ length: len1 + 1 }, (_, i) => i);

    for (let i = 1; i <= len2; i++) {
        let prev = i;
        for (let j = 1; j <= len1; j++) {
            const val =
                str2[i - 1] === str1[j - 1]
                    ? row[j - 1]
                    : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
            row[j - 1] = prev;
            prev = val;
        }
        row[len1] = prev;
    }

    return row[len1];
}

/**
 * Esegue un match fuzzy basato su token.
 * Ogni parola della ricerca (query) deve corrispondere a distanza fuzzy ad almeno
 * una parola della descrizione di destinazione.
 *
 * @param query La stringa cercata dall'utente (es. "PANI CASERECCI")
 * @param target La descrizione del bene/servizio (es. "PANE DI TIPO CASERECCIO 1KG")
 * @param maxDistance Distanza massima ammissibile (default: 1 per parole brevi, 2 per parole lunghe)
 */
export function isFuzzyMatch(
    query: string,
    target: string,
    defaultMaxDistance: number = 1
): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase().trim();

    if (!normalizedQuery) return true;

    // Fast-path: controlla prima la sottostringa esatta
    if (normalizedTarget.includes(normalizedQuery)) return true;

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const targetTokens = normalizedTarget.split(/\s+/).filter(Boolean);

    // Ogni parola cercata deve trovare un match vicino tra le parole della descrizione
    return queryTokens.every((qToken) => {
        // Se il token della query è contenuto direttamente nella descrizione, OK
        if (normalizedTarget.includes(qToken)) return true;

        // Adatta la tolleranza in base alla lunghezza della parola cercata:
        // - Parole < 4 caratteri: max 1 errore (es. "PANE" vs "PANI")
        // - Parole >= 4 caratteri: max 1 o 2 errori in base alla configurazione
        const maxAllowedDist = qToken.length <= 3 ? 1 : defaultMaxDistance;

        return targetTokens.some((tToken) => {
            // Ottimizzazione: se la differenza di lunghezza supera la distanza massima, salta
            if (Math.abs(tToken.length - qToken.length) > maxAllowedDist) {
                return false;
            }
            return levenshteinDistance(qToken, tToken) <= maxAllowedDist;
        });
    });
}