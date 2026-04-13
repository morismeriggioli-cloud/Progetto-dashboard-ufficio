/**
 * Tipi TypeScript per l'integrazione con TickaWS API
 */

// Tipi per la risposta di login
export type TickaLoginResponse = {
  id: string;
  token: string;
  userName: string;
  expireDate: string;
  validity: string;
};

// Tipi per gli errori API
export type TickaErrorResponse = {
  error?: string;
  message?: string;
  statusCode?: number;
};

// Tipi base per le risposte Ticka (estendibile quando scopriamo altri endpoint)
export type TickaEvent = {
  id: string;
  name: string;
  date: string;
  venue?: string;
  isActive?: boolean;
  // TODO: Aggiungere altri campi quando disponibili dalla documentazione API
};

export type TickaOrder = {
  id: string;
  eventId: string;
  eventName: string;
  orderDate: string;
  amount: number;
  tickets: number;
  status?: string;
  // TODO: Aggiungere altri campi quando disponibili dalla documentazione API
};

export type TickaVenue = {
  id: string;
  name: string;
  city?: string;
  address?: string;
  // TODO: Aggiungere altri campi quando disponibili dalla documentazione API
};

// Struttura dati per salvataggio su Supabase (futura implementazione)
export type TickaDataset = {
  events: TickaEvent[];
  orders: TickaOrder[];
  venues: TickaVenue[];
  lastSync: string;
  // TODO: Estendere con altri dati quando disponibili
};

// Metadati per il sync con Supabase
export type TickaSyncMetadata = {
  syncDate: string;
  recordCount: {
    events: number;
    orders: number;
    venues: number;
  };
  apiVersion: string;
  // TODO: Aggiungere altri metadati se necessari
};
