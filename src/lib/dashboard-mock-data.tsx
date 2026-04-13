import {
  IconCalendar as Calendar,
  IconCashBanknote as Banknote,
  IconChecklist as CheckSquare,
  IconFolderUp as FolderUp,
  IconHeadphones as HeadphonesIcon,
  IconReceipt as Receipt,
  IconShoppingCart as ShoppingCart,
  IconSpeakerphone as Megaphone,
  IconBriefcase as BriefcaseBusiness,
  IconTicket as Ticket,
  IconTrendingUp as TrendingUp,
  IconUpload as Upload,
} from "@tabler/icons-react";
import type { UserRole } from "@/lib/roles";
import type { ComponentType, SVGProps } from "react";

export type DashboardMetric = {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accentClass: string;
};

export type DashboardSection = {
  title: string;
  description: string;
  type: "bars" | "table" | "list";
  actionLabel?: string;
  bars?: { label: string; value: string; percentage: number }[];
  list?: { title: string; subtitle: string; meta: string }[];
  columns?: { key: string; header: string }[];
  rows?: Record<string, string>[];
};

export type DashboardDefinition = {
  title: string;
  subtitle: string;
  metrics: DashboardMetric[];
  sections: DashboardSection[];
  quickActions: {
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
  }[];
  activities: {
    title: string;
    description: string;
    time: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
  }[];
};

export const dashboardContent: Record<UserRole, DashboardDefinition> = {
  ceo: {
    title: "Dashboard direzionale",
    subtitle: "Vista strategica su performance commerciali, volumi di vendita e priorita operative.",
    metrics: [
      {
        title: "Fatturato totale",
        value: "EUR 2,48 M",
        description: "+14.2% rispetto al mese scorso",
        icon: Banknote,
        accentClass: "bg-primary",
      },
      {
        title: "Biglietti venduti",
        value: "184,320",
        description: "Media sell-through del 82%",
        icon: Ticket,
        accentClass: "bg-secondary",
      },
      {
        title: "Ordini totali",
        value: "62,410",
        description: "Ordini processati negli ultimi 30 giorni",
        icon: ShoppingCart,
        accentClass: "bg-emerald-500",
      },
      {
        title: "Pipeline attive",
        value: "128",
        description: "Linee commerciali e campagne in monitoraggio",
        icon: Calendar,
        accentClass: "bg-orange-500",
      },
      {
        title: "Ticket clienti aperti",
        value: "48",
        description: "Richieste clienti aperte da monitorare",
        icon: HeadphonesIcon,
        accentClass: "bg-slate-500",
      },
    ],
    sections: [
      {
        title: "Grafici vendite",
        description: "Andamento vendite per area di business.",
        type: "bars",
        bars: [
          { label: "Concerti", value: "EUR 1,1 M", percentage: 92 },
          { label: "Teatro", value: "EUR 640 K", percentage: 68 },
          { label: "Sport", value: "EUR 510 K", percentage: 55 },
          { label: "Festival", value: "EUR 230 K", percentage: 34 },
        ],
      },
      {
        title: "Top performance",
        description: "Voci che stanno guidando ricavi e volumi.",
        type: "table",
        columns: [
          { key: "event", header: "Evento" },
          { key: "city", header: "Citta" },
          { key: "tickets", header: "Biglietti" },
          { key: "revenue", header: "Ricavi" },
        ],
        rows: [
          { event: "Vasco Live 2026", city: "Milano", tickets: "42,100", revenue: "EUR 618K" },
          { event: "Arena Opera Week", city: "Verona", tickets: "28,320", revenue: "EUR 401K" },
          { event: "Grand Prix Night", city: "Monza", tickets: "18,900", revenue: "EUR 355K" },
        ],
      },
    ],
    quickActions: [
      { label: "Nuovo lead", icon: BriefcaseBusiness },
      { label: "Import amministrazione", icon: FolderUp },
      { label: "Apri ticket cliente", icon: Ticket },
      { label: "Nuovo task interno", icon: CheckSquare },
    ],
    activities: [
      {
        title: "Report ricavi aggiornato",
        description: "Il consolidato giornaliero e stato sincronizzato con la direzione.",
        time: "5 minuti fa",
        icon: Banknote,
      },
      {
        title: "Linea top performer",
        description: "Vasco Live 2026 resta la voce con il maggiore contributo ai ricavi.",
        time: "18 minuti fa",
        icon: TrendingUp,
      },
      {
        title: "Monitoraggio customer care",
        description: "Ridotti i ticket aperti ad alta priorita rispetto a ieri.",
        time: "42 minuti fa",
        icon: HeadphonesIcon,
      },
    ],
  },
  admin: {
    title: "Dashboard amministrazione",
    subtitle: "Controllo finanziario, gestione documentale e import operativi.",
    metrics: [
      {
        title: "Fatturato totale",
        value: "EUR 842 K",
        description: "Cash-in previsto nelle prossime 2 settimane",
        icon: Banknote,
        accentClass: "bg-primary",
      },
      {
        title: "Biglietti venduti",
        value: "94,280",
        description: "43 da verificare prima della chiusura",
        icon: Ticket,
        accentClass: "bg-secondary",
      },
      {
        title: "Ordini totali",
        value: "18,620",
        description: "Job di import completati questa settimana",
        icon: ShoppingCart,
        accentClass: "bg-emerald-500",
      },
      {
        title: "Pratiche aperte",
        value: "64",
        description: "Controlli manuali su file finanziari",
        icon: Calendar,
        accentClass: "bg-orange-500",
      },
      {
        title: "Ticket clienti aperti",
        value: "12",
        description: "Pratiche con impatto amministrativo",
        icon: HeadphonesIcon,
        accentClass: "bg-slate-500",
      },
    ],
    sections: [
      {
        title: "Panoramica fatture",
        description: "Ultime fatture e stato di approvazione.",
        type: "table",
        actionLabel: "Importa file finanziario",
        columns: [
          { key: "invoice", header: "Fattura" },
          { key: "supplier", header: "Fornitore" },
          { key: "amount", header: "Importo" },
          { key: "status", header: "Stato" },
        ],
        rows: [
          { invoice: "INV-2026-104", supplier: "Arena Services", amount: "EUR 18,200", status: "Da approvare" },
          { invoice: "INV-2026-099", supplier: "Media Partner", amount: "EUR 7,450", status: "Pagata" },
          { invoice: "INV-2026-092", supplier: "Security Group", amount: "EUR 12,980", status: "In revisione" },
        ],
      },
      {
        title: "Gestione import",
        description: "Monitoraggio dei file caricati e delle riconciliazioni.",
        type: "list",
        list: [
          { title: "orders_march.xlsx", subtitle: "Ultimo upload 09:42", meta: "Validazione completata" },
          { title: "refunds_week11.csv", subtitle: "Ultimo upload 08:15", meta: "2 warning da controllare" },
          { title: "settlements_q1.xlsx", subtitle: "Ultimo upload ieri", meta: "In attesa di conferma" },
        ],
      },
    ],
    quickActions: [
      { label: "Nuovo ordine manuale", icon: ShoppingCart },
      { label: "Import amministrazione", icon: FolderUp },
      { label: "Apri ticket cliente", icon: Ticket },
      { label: "Nuovo task interno", icon: CheckSquare },
    ],
    activities: [
      {
        title: "File finanziario importato",
        description: "Completato l'upload di settlements_q1.xlsx senza errori critici.",
        time: "11 minuti fa",
        icon: FolderUp,
      },
      {
        title: "Fattura in revisione",
        description: "INV-2026-092 richiede un controllo prima dell'approvazione.",
        time: "27 minuti fa",
        icon: Receipt,
      },
      {
        title: "Nuova riconciliazione",
        description: "Aggiornati gli ordini della mattina per il controllo incassi.",
        time: "1 ora fa",
        icon: BriefcaseBusiness,
      },
    ],
  },
  marketing: {
    title: "Dashboard marketing",
    subtitle: "Campagne, trend di vendita e performance per canale.",
    metrics: [
      {
        title: "Fatturato totale",
        value: "4.8x",
        description: "Rendimento medio delle campagne attive",
        icon: Megaphone,
        accentClass: "bg-primary",
      },
      {
        title: "Biglietti venduti",
        value: "38 campagne",
        description: "Con crescita positiva nell'ultima settimana",
        icon: Ticket,
        accentClass: "bg-secondary",
      },
      {
        title: "Ordini totali",
        value: "+21%",
        description: "Incremento dei biglietti venduti da paid media",
        icon: ShoppingCart,
        accentClass: "bg-emerald-500",
      },
      {
        title: "Audience attive",
        value: "12,480",
        description: "Audience retargeting pronta per il weekend",
        icon: Calendar,
        accentClass: "bg-orange-500",
      },
      {
        title: "Ticket clienti aperti",
        value: "9",
        description: "Segnalazioni su campagne e comunicazioni",
        icon: HeadphonesIcon,
        accentClass: "bg-slate-500",
      },
    ],
    sections: [
      {
        title: "Vendite per campagna",
        description: "Campagne con la migliore risposta commerciale.",
        type: "bars",
        bars: [
          { label: "Summer Beats", value: "6.420 biglietti", percentage: 87 },
          { label: "Roma Comedy Fest", value: "4.180 biglietti", percentage: 63 },
          { label: "Derby Weekend", value: "3.210 biglietti", percentage: 52 },
        ],
      },
      {
        title: "Performance campagne",
        description: "Snapshot delle campagne principali.",
        type: "table",
        columns: [
          { key: "campaign", header: "Campagna" },
          { key: "channel", header: "Canale" },
          { key: "conversion", header: "Conversione" },
          { key: "roas", header: "ROAS" },
        ],
        rows: [
          { campaign: "Lancio primavera", channel: "Meta Ads", conversion: "5.4%", roas: "4.9x" },
          { campaign: "Concerti always on", channel: "Google Ads", conversion: "4.8%", roas: "4.2x" },
          { campaign: "Retention Gold Fans", channel: "Email", conversion: "8.1%", roas: "6.6x" },
        ],
      },
    ],
    quickActions: [
      { label: "Nuova campagna", icon: Megaphone },
      { label: "Import amministrazione", icon: FolderUp },
      { label: "Apri ticket cliente", icon: Ticket },
      { label: "Nuovo task interno", icon: CheckSquare },
    ],
    activities: [
      {
        title: "Campagna con ROI in crescita",
        description: "Spring Launch ha superato il target conversione previsto.",
        time: "9 minuti fa",
        icon: Megaphone,
      },
      {
        title: "Nuovo trend vendita",
        description: "Aumentano le prenotazioni da campagne email sui concerti.",
        time: "34 minuti fa",
        icon: TrendingUp,
      },
      {
        title: "Segmento audience aggiornato",
        description: "Preparato il retargeting per le campagne del weekend.",
        time: "58 minuti fa",
        icon: BriefcaseBusiness,
      },
    ],
  },
  customer_care: {
    title: "Dashboard customer care",
    subtitle: "Sezione legacy non piu esposta nella navigazione principale.",
    metrics: [
      {
        title: "Ticket aperti",
        value: "0",
        description: "Placeholder tecnico mantenuto per compatibilita ruoli.",
        icon: HeadphonesIcon,
        accentClass: "bg-slate-500",
      },
      {
        title: "Biglietti venduti",
        value: "0",
        description: "Dato non utilizzato in questa sezione.",
        icon: Ticket,
        accentClass: "bg-secondary",
      },
      {
        title: "Ordini totali",
        value: "0",
        description: "Dato non utilizzato in questa sezione.",
        icon: ShoppingCart,
        accentClass: "bg-emerald-500",
      },
      {
        title: "Pratiche aperte",
        value: "0",
        description: "Dato non utilizzato in questa sezione.",
        icon: Calendar,
        accentClass: "bg-orange-500",
      },
      {
        title: "Attivita recenti",
        value: "0",
        description: "Dato non utilizzato in questa sezione.",
        icon: CheckSquare,
        accentClass: "bg-primary",
      },
    ],
    sections: [
      {
        title: "Sezione non attiva",
        description: "Questa dashboard non e piu utilizzata nel flusso corrente.",
        type: "list",
        list: [
          {
            title: "Nessun contenuto operativo",
            subtitle: "Ruolo mantenuto solo per compatibilita",
            meta: "Legacy",
          },
        ],
      },
    ],
    quickActions: [{ label: "Nuovo task interno", icon: CheckSquare }],
    activities: [
      {
        title: "Compatibilita ruoli",
        description: "Entry mantenuta per evitare regressioni di build.",
        time: "ora",
        icon: HeadphonesIcon,
      },
    ],
  },
  data_entry: {
    title: "Dashboard operativa ordini",
    subtitle: "Monitoraggio ordini, disponibilita e operazioni di aggiornamento catalogo.",
    metrics: [
      {
        title: "Fatturato totale",
        value: "128",
        description: "Ordini e flussi operativi da monitorare",
        icon: Banknote,
        accentClass: "bg-primary",
      },
      {
        title: "Biglietti venduti",
        value: "74%",
        description: "Disponibilita media residua sui prossimi 30 giorni",
        icon: Ticket,
        accentClass: "bg-secondary",
      },
      {
        title: "Ordini totali",
        value: "16",
        description: "Ordini con verifica manuale in attesa di completamento",
        icon: ShoppingCart,
        accentClass: "bg-emerald-500",
      },
      {
        title: "Code attive",
        value: "43",
        description: "Modifiche eseguite da data entry nelle ultime 24 ore",
        icon: Calendar,
        accentClass: "bg-orange-500",
      },
      {
        title: "Ticket clienti aperti",
        value: "6",
        description: "Segnalazioni collegate a ordini o anagrafiche prodotto",
        icon: HeadphonesIcon,
        accentClass: "bg-slate-500",
      },
    ],
    sections: [
      {
        title: "Elenco ordini da verificare",
        description: "Ordini da controllare, completare o aggiornare.",
        type: "table",
        actionLabel: "Crea ordine",
        columns: [
          { key: "order", header: "Ordine" },
          { key: "channel", header: "Canale" },
          { key: "amount", header: "Importo" },
          { key: "status", header: "Stato" },
        ],
        rows: [
          { order: "ORD-2026-421", channel: "Web", amount: "EUR 12,400", status: "Da verificare" },
          { order: "ORD-2026-388", channel: "Box office", amount: "EUR 1,240", status: "Aggiornamento dati" },
          { order: "ORD-2026-365", channel: "Partner", amount: "EUR 18,900", status: "In revisione" },
        ],
      },
      {
        title: "Canali di vendita",
        description: "Distribuzione dei volumi sui principali canali in lavorazione.",
        type: "bars",
        bars: [
          { label: "Web", value: "62% volumi", percentage: 62 },
          { label: "Box office", value: "18% volumi", percentage: 18 },
          { label: "Partner", value: "74% volumi", percentage: 74 },
        ],
      },
    ],
    quickActions: [
      { label: "Nuovo ordine manuale", icon: ShoppingCart },
      { label: "Import amministrazione", icon: FolderUp },
      { label: "Apri ticket cliente", icon: Ticket },
      { label: "Nuovo task interno", icon: CheckSquare },
    ],
    activities: [
      {
        title: "Nuovo ordine in bozza",
        description: "Creato il record iniziale per ORD-2026-421.",
        time: "7 minuti fa",
        icon: ShoppingCart,
      },
      {
        title: "Canale aggiornato",
        description: "Sincronizzati i dati operativi del canale box office.",
        time: "23 minuti fa",
        icon: Upload,
      },
      {
        title: "Controllo catalogo",
        description: "Verificata la coerenza dei prezzi per i prodotti partner.",
        time: "1 ora fa",
        icon: BriefcaseBusiness,
      },
    ],
  },
};
