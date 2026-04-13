/**
 * Tipi TypeScript per i dati reali dell'API TickaWS
 * Basati sulla struttura degli endpoint scoperti
 */

// Tipi per le emissioni
export type TickaEmissione = {
  id?: string | number;
  dataEmissione: string;
  oraEmissione: string;
  importo: number;
  quantita: number;
  descrizione?: string;
  eventId?: string | number;
  eventName?: string;
  // TODO: Aggiungere campi reali quando avremo la risposta
};

export type TickaEmissioniResponse = {
  emissioni?: TickaEmissione[];
  totale?: number;
  data?: string;
  // TODO: Aggiungere campi reali quando avremo la risposta
};

// Tipi per il riepilogo giornaliero
export type TickaRiepilogoGiornaliero = {
  data: string;
  fatturatoTotale: number;
  numeroBiglietti: number;
  numeroTransazioni: number;
  numeroEventi?: number;
  mediaPerTransazione?: number;
  // TODO: Aggiungere campi reali quando avremo la risposta
};

// Tipi per le transazioni
export type TickaTransazione = {
  id?: string | number;
  dataTransazione: string;
  oraTransazione: string;
  importo: number;
  tipo?: string;
  stato?: string;
  eventId?: string | number;
  eventName?: string;
  biglietti?: number;
  // TODO: Aggiungere campi reali quando avremo la risposta
};

export type TickaTransazioniResponse = {
  transazioni?: TickaTransazione[];
  totale?: number;
  conteggio?: number;
  data?: string;
  // TODO: Aggiungere campi reali quando avremo la risposta
};

// KPI calcolate dai dati TickaWS
export type TickaKPI = {
  fatturatoTotale: number;
  numeroBiglietti: number;
  numeroTransazioni: number;
  numeroEventi: number;
  mediaPerTransazione: number;
  dataRiferimento: string;
};

// Funzioni di mapping dai dati raw alle KPI
export function mapEmissioniToKPI(emissioni: TickaEmissioniResponse): TickaKPI {
  const emissioniList = emissioni.emissioni || [];
  const totaleFatturato = emissioniList.reduce((sum, e) => sum + (e.importo || 0), 0);
  const totaleBiglietti = emissioniList.reduce((sum, e) => sum + (e.quantita || 0), 0);
  const numeroEventi = new Set(emissioniList.map(e => e.eventId || e.eventName || 'unknown')).size;

  return {
    fatturatoTotale: totaleFatturato,
    numeroBiglietti: totaleBiglietti,
    numeroTransazioni: emissioniList.length,
    numeroEventi,
    mediaPerTransazione: emissioniList.length > 0 ? totaleFatturato / emissioniList.length : 0,
    dataRiferimento: emissioni.data || new Date().toISOString().split('T')[0],
  };
}

export function mapRiepilogoToKPI(riepilogo: TickaRiepilogoGiornaliero): TickaKPI {
  return {
    fatturatoTotale: riepilogo.fatturatoTotale || 0,
    numeroBiglietti: riepilogo.numeroBiglietti || 0,
    numeroTransazioni: riepilogo.numeroTransazioni || 0,
    numeroEventi: riepilogo.numeroEventi || 0,
    mediaPerTransazione: riepilogo.mediaPerTransazione || 0,
    dataRiferimento: riepilogo.data,
  };
}

export function mapTransazioniToKPI(transazioni: TickaTransazioniResponse): TickaKPI {
  const transazioniList = transazioni.transazioni || [];
  const totaleFatturato = transazioniList.reduce((sum, t) => sum + (t.importo || 0), 0);
  const totaleBiglietti = transazioniList.reduce((sum, t) => sum + (t.biglietti || 0), 0);
  const numeroEventi = new Set(transazioniList.map(t => t.eventId || t.eventName || 'unknown')).size;

  return {
    fatturatoTotale: totaleFatturato,
    numeroBiglietti: totaleBiglietti,
    numeroTransazioni: transazioniList.length,
    numeroEventi,
    mediaPerTransazione: transazioniList.length > 0 ? totaleFatturato / transazioniList.length : 0,
    dataRiferimento: transazioni.data || new Date().toISOString().split('T')[0],
  };
}
