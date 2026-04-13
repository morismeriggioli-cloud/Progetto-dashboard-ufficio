/**
 * API Route per diagnostico formule KPI
 */

import { NextResponse } from "next/server";
import { fetchTicka } from "@/lib/ticka";

export const dynamic = "force-dynamic";

type FormulaCheckApiResponse = {
    result?: TickaFormulaRecord[];
};

type TickaFormulaRecord = {
    annullamento?: string;
    tipoTitolo?: string;
    causale?: string;
    partnerId?: string | number;
    tipoOperazione?: string;
    descrizione?: string;
    nomeEvento?: string;
    importo?: number;
    codiceRichiedenteEmissioneSigillo?: string;
    stato?: string;
    statoPagamento?: string;
    regolato?: boolean;
    classePagamento?: string | number;
    [key: string]: unknown;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date') || '2026-03-09';
        
        console.log(`🔍 DIAGNOSTICO FORMULE per data: ${dateParam}`);

        const results = {
            annulli: [] as Array<{
                formula: string;
                value: number;
                deltaAbs: number;
                deltaPct: number;
                status: 'confirmed' | 'candidate' | 'missing';
                sorgente: string;
                filtri: string;
            }>,
            cartaDelDocente: [] as Array<{
                formula: string;
                value: number;
                deltaAbs: number;
                deltaPct: number;
                status: 'confirmed' | 'candidate' | 'missing';
                sorgente: string;
                filtri: string;
            }>,
            cartaCultura: [] as Array<{
                formula: string;
                value: number;
                deltaAbs: number;
                deltaPct: number;
                status: 'confirmed' | 'candidate' | 'missing';
                sorgente: string;
                filtri: string;
            }>,
            fido: [] as Array<{
                formula: string;
                value: number;
                deltaAbs: number;
                deltaPct: number;
                status: 'confirmed' | 'candidate' | 'missing';
                sorgente: string;
                filtri: string;
            }>
        };

        // TARGETS DI RIFERIMENTO
        const targets = {
            annulli: 2,
            cartaDelDocente: 370.17,
            cartaCultura: null, // Non abbiamo target
            fido: 1020.00
        };

        // FASE 1 - ANNULLI
        console.log(`🔍 RICERCA ANNULLI...`);
        
        try {
            // Test 1: Filtri diretti su emissioni
            const emissioniResponse = await fetchTicka<FormulaCheckApiResponse>(`/ReportEmissioni/EmissioniPerData?data=${dateParam}`);
            if (emissioniResponse?.result) {
                const annulliS = emissioniResponse.result.filter((e) => e.annullamento === 'S');
                results.annulli.push({
                    formula: 'emissioni.filter(annullamento === "S")',
                    value: annulliS.length,
                    deltaAbs: Math.abs(annulliS.length - targets.annulli),
                    deltaPct: targets.annulli > 0 ? Math.abs((annulliS.length - targets.annulli) / targets.annulli * 100) : 0,
                    status: annulliS.length === targets.annulli ? 'confirmed' : 'candidate',
                    sorgente: '/ReportEmissioni/EmissioniPerData',
                    filtri: 'data + annullamento=S'
                });

                // Test 2: Per TipoTitolo
                const tipiTitolo = [...new Set(emissioniResponse.result.map((e) => e.tipoTitolo))];
                for (const tipo of tipiTitolo) {
                    const annulliTipo = emissioniResponse.result.filter((e) =>
                        e.annullamento === 'S' && e.tipoTitolo === tipo
                    );
                    if (annulliTipo.length > 0) {
                        results.annulli.push({
                            formula: `emissioni.filter(annullamento === "S" && tipoTitolo === "${tipo}")`,
                            value: annulliTipo.length,
                            deltaAbs: Math.abs(annulliTipo.length - targets.annulli),
                            deltaPct: targets.annulli > 0 ? Math.abs((annulliTipo.length - targets.annulli) / targets.annulli * 100) : 0,
                            status: annulliTipo.length === targets.annulli ? 'confirmed' : 'candidate',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + annullamento=S + tipoTitolo=${tipo}`
                        });
                    }
                }

                // Test 3: Per Causale
                const causali = [...new Set(emissioniResponse.result.map((e) => e.causale))];
                for (const causale of causali) {
                    const annulliCausale = emissioniResponse.result.filter((e) =>
                        e.annullamento === 'S' && e.causale === causale
                    );
                    if (annulliCausale.length > 0 && Math.abs(annulliCausale.length - targets.annulli) < 10) {
                        results.annulli.push({
                            formula: `emissioni.filter(annullamento === "S" && causale === "${causale}")`,
                            value: annulliCausale.length,
                            deltaAbs: Math.abs(annulliCausale.length - targets.annulli),
                            deltaPct: targets.annulli > 0 ? Math.abs((annulliCausale.length - targets.annulli) / targets.annulli * 100) : 0,
                            status: annulliCausale.length === targets.annulli ? 'confirmed' : 'candidate',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + annullamento=S + causale=${causale}`
                        });
                    }
                }

                // Test 4: Per PartnerId
                const partnerIds = [...new Set(emissioniResponse.result.map((e) => e.partnerId))];
                for (const partnerId of partnerIds) {
                    const annulliPartner = emissioniResponse.result.filter((e) =>
                        e.annullamento === 'S' && e.partnerId === partnerId
                    );
                    if (annulliPartner.length > 0 && Math.abs(annulliPartner.length - targets.annulli) < 5) {
                        results.annulli.push({
                            formula: `emissioni.filter(annullamento === "S" && partnerId === "${partnerId}")`,
                            value: annulliPartner.length,
                            deltaAbs: Math.abs(annulliPartner.length - targets.annulli),
                            deltaPct: targets.annulli > 0 ? Math.abs((annulliPartner.length - targets.annulli) / targets.annulli * 100) : 0,
                            status: annulliPartner.length === targets.annulli ? 'confirmed' : 'candidate',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + annullamento=S + partnerId=${partnerId}`
                        });
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error emissioni annulli:`, error);
        }

        // Test con logtransazioni
        try {
            const transazioniResponse = await fetchTicka<FormulaCheckApiResponse>(`/logtransazioni/date/data/${dateParam}`);
            if (transazioniResponse?.result) {
                const annulliTrans = transazioniResponse.result.filter((t) =>
                    t.annullamento === 'S' || t.tipoOperazione?.includes('ANNULL')
                );
                if (annulliTrans.length > 0) {
                    results.annulli.push({
                        formula: 'logtransazioni.filter(annullamento === "S" || tipoOperazione.includes("ANNULL"))',
                        value: annulliTrans.length,
                        deltaAbs: Math.abs(annulliTrans.length - targets.annulli),
                        deltaPct: targets.annulli > 0 ? Math.abs((annulliTrans.length - targets.annulli) / targets.annulli * 100) : 0,
                        status: annulliTrans.length === targets.annulli ? 'confirmed' : 'candidate',
                        sorgente: '/logtransazioni/date/data/{data}',
                        filtri: 'data + annullamento=S + tipoOperazione=ANNULL'
                    });
                }
            }
        } catch (error) {
            console.log(`❌ Error transazioni annulli:`, error);
        }

        // FASE 2 - CARTA DEL DOCENTE
        console.log(`🔍 RICERCA CARTA DEL DOCENTE...`);
        
        // Test su emissioni per pattern carta del docente
        try {
            const emissioniResponse = await fetchTicka<FormulaCheckApiResponse>(`/ReportEmissioni/EmissioniPerData?data=${dateParam}`);
            if (emissioniResponse?.result) {
                // Pattern 1: Descrizioni contenenti docente/18app
                const docenteKeywords = ['docente', '18app', '18app', 'carta', 'bonus', 'ministero'];
                for (const keyword of docenteKeywords) {
                    const docenteRecords = emissioniResponse.result.filter((e) =>
                        e.descrizione?.toLowerCase().includes(keyword) ||
                        e.tipoTitolo?.toLowerCase().includes(keyword) ||
                        e.causale?.toLowerCase().includes(keyword) ||
                        e.nomeEvento?.toLowerCase().includes(keyword)
                    );
                    
                    if (docenteRecords.length > 0) {
                        const importoDocente = docenteRecords.reduce((sum, e) => sum + (e.importo || 0), 0);
                        results.cartaDelDocente.push({
                            formula: `emissioni.filter(descrizione.toLowerCase().includes("${keyword}"))`,
                            value: importoDocente,
                            deltaAbs: Math.abs(importoDocente - targets.cartaDelDocente),
                            deltaPct: targets.cartaDelDocente > 0 ? Math.abs((importoDocente - targets.cartaDelDocente) / targets.cartaDelDocente * 100) : 0,
                            status: Math.abs(importoDocente - targets.cartaDelDocente) < 50 ? 'candidate' : 'missing',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + descrizione contains ${keyword}`
                        });
                    }
                }

                // Pattern 2: PartnerId specifici per docente
                const partnerIds = [...new Set(emissioniResponse.result.map((e) => e.partnerId))];
                for (const partnerId of partnerIds) {
                    const partnerRecords = emissioniResponse.result.filter((e) => e.partnerId === partnerId);
                    const importoPartner = partnerRecords.reduce((sum, e) => sum + (e.importo || 0), 0);
                    
                    if (Math.abs(importoPartner - targets.cartaDelDocente) < 100) {
                        results.cartaDelDocente.push({
                            formula: `emissioni.filter(partnerId === "${partnerId}")`,
                            value: importoPartner,
                            deltaAbs: Math.abs(importoPartner - targets.cartaDelDocente),
                            deltaPct: targets.cartaDelDocente > 0 ? Math.abs((importoPartner - targets.cartaDelDocente) / targets.cartaDelDocente * 100) : 0,
                            status: Math.abs(importoPartner - targets.cartaDelDocente) < 10 ? 'candidate' : 'missing',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + partnerId=${partnerId}`
                        });
                    }
                }

                // Pattern 3: CodiceRichiedenteEmissioneSigillo
                const codiciRichiedente = [...new Set(emissioniResponse.result.map((e) => e.codiceRichiedenteEmissioneSigillo))];
                for (const codice of codiciRichiedente) {
                    if (codice && codice.toLowerCase().includes('docente')) {
                        const codiceRecords = emissioniResponse.result.filter((e) => e.codiceRichiedenteEmissioneSigillo === codice);
                        const importoCodice = codiceRecords.reduce((sum, e) => sum + (e.importo || 0), 0);
                        
                        results.cartaDelDocente.push({
                            formula: `emissioni.filter(codiceRichiedenteEmissioneSigillo contains "docente")`,
                            value: importoCodice,
                            deltaAbs: Math.abs(importoCodice - targets.cartaDelDocente),
                            deltaPct: targets.cartaDelDocente > 0 ? Math.abs((importoCodice - targets.cartaDelDocente) / targets.cartaDelDocente * 100) : 0,
                            status: Math.abs(importoCodice - targets.cartaDelDocente) < 50 ? 'candidate' : 'missing',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + codiceRichiedenteEmissioneSigillo contains docente`
                        });
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error ricerca carta del docente:`, error);
        }

        // FASE 3 - CARTA CULTURA
        console.log(`🔍 RICERCA CARTA CULTURA...`);
        
        try {
            const emissioniResponse = await fetchTicka<FormulaCheckApiResponse>(`/ReportEmissioni/EmissioniPerData?data=${dateParam}`);
            if (emissioniResponse?.result) {
                // Pattern per cultura
                const culturaKeywords = ['cultura', 'cultura', 'cultural', 'museo', 'teatro', 'cinema', 'libri', 'spettacolo'];
                for (const keyword of culturaKeywords) {
                    const culturaRecords = emissioniResponse.result.filter((e) =>
                        e.descrizione?.toLowerCase().includes(keyword) ||
                        e.tipoTitolo?.toLowerCase().includes(keyword) ||
                        e.causale?.toLowerCase().includes(keyword) ||
                        e.nomeEvento?.toLowerCase().includes(keyword)
                    );
                    
                    if (culturaRecords.length > 0) {
                        const importoCultura = culturaRecords.reduce((sum, e) => sum + (e.importo || 0), 0);
                        results.cartaCultura.push({
                            formula: `emissioni.filter(descrizione.toLowerCase().includes("${keyword}"))`,
                            value: importoCultura,
                            deltaAbs: 0, // Non abbiamo target
                            deltaPct: 0,
                            status: 'candidate',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + descrizione contains ${keyword}`
                        });
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error ricerca carta cultura:`, error);
        }

        // FASE 4 - FIDO
        console.log(`🔍 RICERCA FIDO...`);
        
        try {
            const emissioniResponse = await fetchTicka<FormulaCheckApiResponse>(`/ReportEmissioni/EmissioniPerData?data=${dateParam}`);
            if (emissioniResponse?.result) {
                // Pattern 1: Differenza tra totale e componenti pagate
                // Pattern 2: Record con stato sospeso/non regolato
                const sospesi = emissioniResponse.result.filter((e) =>
                    e.stato?.toLowerCase().includes('sospeso') ||
                    e.statoPagamento?.toLowerCase().includes('sospeso') ||
                    e.regolato === false
                );
                const importoSospesi = sospesi.reduce((sum, e) => sum + (e.importo || 0), 0);
                
                if (Math.abs(importoSospesi - targets.fido) < 200) {
                    results.fido.push({
                        formula: 'emissioni.filter(stato includes "sospeso").sum(importo)',
                        value: importoSospesi,
                        deltaAbs: Math.abs(importoSospesi - targets.fido),
                        deltaPct: targets.fido > 0 ? Math.abs((importoSospesi - targets.fido) / targets.fido * 100) : 0,
                        status: Math.abs(importoSospesi - targets.fido) < 50 ? 'candidate' : 'missing',
                        sorgente: '/ReportEmissioni/EmissioniPerData',
                        filtri: 'data + stato contains sospeso'
                    });
                }

                // Pattern 3: Per classe pagamento
                const classiPagamento = [...new Set(emissioniResponse.result.map((e) => e.classePagamento))];
                for (const classe of classiPagamento) {
                    const classeRecords = emissioniResponse.result.filter((e) => e.classePagamento === classe);
                    const importoClasse = classeRecords.reduce((sum, e) => sum + (e.importo || 0), 0);
                    
                    if (Math.abs(importoClasse - targets.fido) < 200) {
                        results.fido.push({
                            formula: `emissioni.filter(classePagamento === "${classe}").sum(importo)`,
                            value: importoClasse,
                            deltaAbs: Math.abs(importoClasse - targets.fido),
                            deltaPct: targets.fido > 0 ? Math.abs((importoClasse - targets.fido) / targets.fido * 100) : 0,
                            status: Math.abs(importoClasse - targets.fido) < 50 ? 'candidate' : 'missing',
                            sorgente: '/ReportEmissioni/EmissioniPerData',
                            filtri: `data + classePagamento=${classe}`
                        });
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error ricerca fido:`, error);
        }

        // Ordina risultati per delta minore
        Object.keys(results).forEach(key => {
            results[key as keyof typeof results].sort((a, b) => a.deltaAbs - b.deltaAbs);
        });

        return NextResponse.json({
            success: true,
            date: dateParam,
            targets,
            results,
            summary: {
                annulli: {
                    best: results.annulli[0],
                    totalCandidates: results.annulli.length,
                    target: targets.annulli
                },
                cartaDelDocente: {
                    best: results.cartaDelDocente[0],
                    totalCandidates: results.cartaDelDocente.length,
                    target: targets.cartaDelDocente
                },
                cartaCultura: {
                    best: results.cartaCultura[0],
                    totalCandidates: results.cartaCultura.length,
                    target: targets.cartaCultura
                },
                fido: {
                    best: results.fido[0],
                    totalCandidates: results.fido.length,
                    target: targets.fido
                }
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Errore in /api/ticka/formula-check:", error);
        
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Errore interno del server",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
