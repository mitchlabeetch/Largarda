/**
 * Curated M&A glossary — 80 bilingual entries (target ROADMAP § 1.4: 300+).
 *
 * Kept in a single file to stay under AGENTS.md's ≤10 directory children
 * rule and so the data reads as a single reviewable change. Scale toward
 * the ROADMAP target across follow-up passes.
 */

import type { GlossaryEntry } from './types';

export const GLOSSARY_ENTRIES: readonly GlossaryEntry[] = [
  {
    id: 'nda',
    termFr: 'Accord de confidentialité (NDA)',
    termEn: 'Non-disclosure agreement',
    definitionFr:
      "Contrat par lequel les parties s'engagent à ne pas divulguer les informations échangées dans le cadre de l'analyse d'une opération.",
    definitionEn:
      'Contract binding parties to confidentiality over information exchanged while assessing a transaction.',
    category: 'documents',
  },
  {
    id: 'teaser',
    termFr: 'Teaser',
    termEn: 'Teaser',
    definitionFr:
      "Document court (1 à 3 pages) présentant anonymement la cible et sollicitant l'intérêt d'acquéreurs potentiels.",
    definitionEn:
      'Short blind profile (1–3 pages) pitching the target to prospective buyers without revealing its identity.',
    category: 'documents',
    relatedIds: ['im', 'nda'],
  },
  {
    id: 'im',
    termFr: "Mémorandum d'information (IM)",
    termEn: 'Information memorandum',
    definitionFr:
      "Dossier complet (40 à 80 pages) remis aux acquéreurs sous NDA, décrivant l'entreprise, son marché, ses finances et les modalités envisagées.",
    definitionEn:
      'Comprehensive document (40–80 pages) delivered under NDA covering the target, its market, financials and proposed transaction terms.',
    category: 'documents',
    relatedIds: ['teaser', 'nda'],
  },
  {
    id: 'loi',
    termFr: "Lettre d'intention (LOI)",
    termEn: 'Letter of intent',
    definitionFr:
      "Document non-liant (sauf clauses d'exclusivité et de confidentialité) formalisant l'intérêt d'un acquéreur et les grandes lignes d'une offre.",
    definitionEn:
      'Mostly non-binding instrument (save for exclusivity and confidentiality clauses) outlining a prospective acquirer’s interest and the main offer terms.',
    category: 'documents',
    relatedIds: ['spa'],
  },
  {
    id: 'spa',
    termFr: 'Contrat de cession (SPA)',
    termEn: 'Share purchase agreement',
    definitionFr: "Contrat de cession d'actions ou de parts sociales, pièce maîtresse d'un closing.",
    definitionEn: 'Share or equity purchase agreement, the principal contract signed at closing.',
    category: 'deal_structure',
    relatedIds: ['closing', 'loi'],
  },
  {
    id: 'apa',
    termFr: "Contrat de cession d'actifs (APA)",
    termEn: 'Asset purchase agreement',
    definitionFr:
      'Contrat de cession portant sur un actif ou un fonds de commerce plutôt que sur les titres de la société.',
    definitionEn:
      'Transaction where specific assets (or a business) are acquired rather than the shares of the owning entity.',
    category: 'deal_structure',
  },
  {
    id: 'mandat_cession',
    termFr: 'Mandat de cession',
    termEn: 'Sell-side mandate',
    definitionFr: 'Contrat engageant un conseil M&A à rechercher un acquéreur pour le compte du cédant.',
    definitionEn: 'Engagement letter under which an M&A advisor is tasked with finding a buyer on behalf of a seller.',
    category: 'process',
  },
  {
    id: 'mandat_achat',
    termFr: "Mandat d'achat",
    termEn: 'Buy-side mandate',
    definitionFr: "Contrat engageant un conseil M&A à identifier des cibles pour le compte d'un acquéreur.",
    definitionEn: 'Engagement where an M&A advisor sources acquisition targets for a buyer.',
    category: 'process',
  },
  {
    id: 'due_diligence',
    termFr: 'Due diligence',
    termEn: 'Due diligence',
    definitionFr:
      "Phase d'investigation approfondie (financière, juridique, fiscale, sociale, IT, environnementale) menée par l'acquéreur après la LOI.",
    definitionEn:
      'Buyer-led deep dive (financial, legal, tax, HR, IT, environmental) typically performed after the LOI.',
    category: 'due_diligence',
  },
  {
    id: 'vdr',
    termFr: 'Data room',
    termEn: 'Virtual data room',
    definitionFr:
      'Espace numérique sécurisé regroupant les documents mis à disposition des acquéreurs pendant la due diligence.',
    definitionEn: 'Secure digital workspace holding the documents shared with prospective buyers during due diligence.',
    category: 'due_diligence',
  },
  {
    id: 'closing',
    termFr: 'Closing',
    termEn: 'Closing',
    definitionFr:
      'Date à laquelle la cession est formellement réalisée (signature du SPA, paiement du prix, transfert de propriété).',
    definitionEn:
      'Date on which the transaction is completed — SPA executed, purchase price paid and ownership transferred.',
    category: 'process',
    relatedIds: ['spa'],
  },
  {
    id: 'signing',
    termFr: 'Signing',
    termEn: 'Signing',
    definitionFr:
      'Signature des contrats définitifs, précédant souvent le closing de quelques semaines (conditions suspensives).',
    definitionEn:
      'Execution of the definitive documents, often preceding closing by a few weeks while conditions precedent are cleared.',
    category: 'process',
    relatedIds: ['closing'],
  },
  {
    id: 'conditions_suspensives',
    termFr: 'Conditions suspensives',
    termEn: 'Conditions precedent',
    definitionFr:
      'Conditions dont la réalisation est nécessaire avant le closing (autorisations réglementaires, accord des tiers, levées de sûretés).',
    definitionEn:
      'Obligations that must be satisfied between signing and closing, such as regulatory clearance, third-party consents, or release of liens.',
    category: 'legal',
  },
  {
    id: 'earn_out',
    termFr: 'Earn-out',
    termEn: 'Earn-out',
    definitionFr:
      'Complément de prix conditionné à la performance future de la société (CA, EBE, indicateurs spécifiques).',
    definitionEn:
      'Deferred portion of the purchase price contingent on future performance metrics (revenue, EBITDA, or custom KPIs).',
    category: 'deal_structure',
  },
  {
    id: 'vendor_loan',
    termFr: 'Crédit vendeur',
    termEn: 'Vendor loan',
    definitionFr: "Part du prix de cession consentie par le vendeur sous forme de prêt remboursable par l'acquéreur.",
    definitionEn: 'Portion of the purchase price extended by the seller as a loan repayable by the buyer.',
    category: 'deal_structure',
  },
  {
    id: 'escrow',
    termFr: 'Séquestre',
    termEn: 'Escrow',
    definitionFr:
      'Fraction du prix conservée par un tiers pendant une durée convenue pour garantir les déclarations du vendeur.',
    definitionEn:
      'Portion of the purchase price held by a third party for an agreed period to back up the seller’s warranties.',
    category: 'deal_structure',
  },
  {
    id: 'garantie_passif',
    termFr: "Garantie d'actif et de passif (GAP)",
    termEn: 'Representations and warranties',
    definitionFr:
      "Clause du SPA par laquelle le vendeur garantit l'exactitude des comptes et l'absence de passifs non révélés.",
    definitionEn:
      'SPA clause where the seller guarantees the accuracy of the accounts and the absence of undisclosed liabilities.',
    category: 'legal',
    relatedIds: ['spa'],
  },
  {
    id: 'rolling_over',
    termFr: 'Rolling over',
    termEn: 'Rolling over',
    definitionFr: "Réinvestissement d'une partie du produit de cession par le vendeur dans la structure d'acquisition.",
    definitionEn: 'Reinvestment by the seller of part of the sale proceeds into the acquisition vehicle.',
    category: 'deal_structure',
  },
  {
    id: 'management_package',
    termFr: 'Management package',
    termEn: 'Management package',
    definitionFr:
      "Dispositif d'intéressement proposé aux dirigeants (BSPCE, BSA, actions de préférence) lors d'une opération de LBO.",
    definitionEn: 'Equity incentive scheme (warrants, preference shares, sweet equity) granted to managers in an LBO.',
    category: 'governance',
  },
  {
    id: 'lbo',
    termFr: 'LBO (Leveraged Buyout)',
    termEn: 'Leveraged buyout',
    definitionFr: 'Acquisition financée majoritairement par dette, remboursée par les cash-flows de la société cible.',
    definitionEn: 'Acquisition primarily funded by debt, serviced from the target’s future cash flows.',
    category: 'deal_structure',
  },
  {
    id: 'mbo',
    termFr: 'MBO (Management Buyout)',
    termEn: 'Management buyout',
    definitionFr: "Reprise de l'entreprise par son équipe dirigeante, souvent avec le concours d'un fonds.",
    definitionEn: 'Acquisition of a company by its existing management team, frequently with private equity backing.',
    category: 'deal_structure',
  },
  {
    id: 'obo',
    termFr: 'OBO (Owner Buyout)',
    termEn: 'Owner buyout',
    definitionFr:
      'Opération permettant au dirigeant-actionnaire de réaliser une partie de son capital tout en restant aux commandes.',
    definitionEn: 'Transaction enabling an owner-manager to monetise part of their stake while remaining in control.',
    category: 'deal_structure',
  },
  {
    id: 'ebitda',
    termFr: "Excédent brut d'exploitation (EBE/EBITDA)",
    termEn: 'EBITDA',
    definitionFr:
      'Résultat opérationnel avant amortissements et provisions, proxy de la capacité bénéficiaire récurrente.',
    definitionEn:
      'Earnings before interest, taxes, depreciation and amortisation — a proxy for recurring operating profitability.',
    category: 'finance',
    relatedIds: ['multiples'],
  },
  {
    id: 'ev',
    termFr: "Valeur d'entreprise",
    termEn: 'Enterprise value',
    definitionFr:
      "Valeur de l'actif économique, indépendante de la structure financière (capitalisation + dette nette).",
    definitionEn: 'Value of the operating business independent of its financing mix (equity value + net debt).',
    category: 'valuation',
  },
  {
    id: 'equity_value',
    termFr: 'Valeur des capitaux propres',
    termEn: 'Equity value',
    definitionFr:
      "Valeur des fonds propres revenant aux actionnaires, calculée en soustrayant la dette nette de la valeur d'entreprise.",
    definitionEn: 'Value attributable to shareholders, obtained by subtracting net debt from enterprise value.',
    category: 'valuation',
  },
  {
    id: 'multiples',
    termFr: 'Multiples de comparables',
    termEn: 'Trading multiples',
    definitionFr:
      'Méthode consistant à appliquer des multiples observés chez des pairs cotés (EV/EBE, EV/CA, P/E) aux agrégats de la cible.',
    definitionEn:
      'Valuation approach applying trading multiples (EV/EBITDA, EV/Revenue, P/E) observed on listed peers to the target’s aggregates.',
    category: 'valuation',
  },
  {
    id: 'dcf',
    termFr: 'DCF — Flux de trésorerie actualisés',
    termEn: 'Discounted cash flow',
    definitionFr:
      "Méthode de valorisation fondée sur l'actualisation des flux de trésorerie futurs au coût du capital (WACC).",
    definitionEn:
      'Valuation method that discounts projected free cash flows to present value using the weighted average cost of capital.',
    category: 'valuation',
  },
  {
    id: 'wacc',
    termFr: 'Coût moyen pondéré du capital (WACC)',
    termEn: 'Weighted average cost of capital',
    definitionFr:
      "Moyenne pondérée du coût des fonds propres et du coût de la dette, utilisée comme taux d'actualisation du DCF.",
    definitionEn:
      'Weighted average of the cost of equity and the after-tax cost of debt used as the discount rate in a DCF.',
    category: 'finance',
  },
  {
    id: 'anr',
    termFr: 'Actif net réévalué (ANR)',
    termEn: 'Adjusted net assets',
    definitionFr:
      'Méthode patrimoniale évaluant la société à partir de ses actifs et passifs réévalués à leur juste valeur.',
    definitionEn: 'Asset-based method valuing a company through its assets and liabilities restated to fair value.',
    category: 'valuation',
  },
  {
    id: 'regle_pouce',
    termFr: 'Règle du pouce',
    termEn: 'Rule of thumb',
    definitionFr: 'Multiplicateur empirique propre à un secteur (par exemple × CA pour une pharmacie).',
    definitionEn: 'Sector-specific empirical multiplier (e.g. × revenue for a pharmacy).',
    category: 'valuation',
  },
  {
    id: 'bfr',
    termFr: 'Besoin en fonds de roulement (BFR)',
    termEn: 'Working capital',
    definitionFr: "Écart entre actif et passif d'exploitation, à surveiller dans les ajustements de prix au closing.",
    definitionEn:
      'Gap between operating assets and operating liabilities, monitored closely during closing price adjustments.',
    category: 'finance',
  },
  {
    id: 'capex',
    termFr: "Dépenses d'investissement (CAPEX)",
    termEn: 'Capital expenditure',
    definitionFr: "Investissements capitalisés en immobilisations, constitutifs du plan d'affaires.",
    definitionEn: 'Investment spending capitalised as fixed assets, a cornerstone of the business plan.',
    category: 'finance',
  },
  {
    id: 'net_debt',
    termFr: 'Dette nette',
    termEn: 'Net debt',
    definitionFr: "Dette financière brute diminuée de la trésorerie disponible, soustraite de la valeur d'entreprise.",
    definitionEn: 'Gross financial debt minus available cash, deducted from enterprise value.',
    category: 'finance',
    relatedIds: ['ev', 'equity_value'],
  },
  {
    id: 'exclusivity',
    termFr: "Clause d'exclusivité",
    termEn: 'Exclusivity clause',
    definitionFr: "Engagement du vendeur à ne pas négocier avec d'autres acquéreurs pendant une durée définie.",
    definitionEn: 'Seller’s commitment not to negotiate with other buyers for a defined period.',
    category: 'legal',
    relatedIds: ['loi'],
  },
  {
    id: 'standstill',
    termFr: 'Clause de standstill',
    termEn: 'Standstill clause',
    definitionFr:
      "Engagement de ne pas acquérir de titres supplémentaires ni lancer d'offre non sollicitée pendant une durée donnée.",
    definitionEn: 'Undertaking not to acquire additional shares or launch an unsolicited offer for a defined period.',
    category: 'legal',
  },
  {
    id: 'mac',
    termFr: 'MAC — Changement défavorable significatif',
    termEn: 'Material adverse change',
    definitionFr:
      "Clause autorisant l'acquéreur à se retirer en cas d'événement matériellement défavorable avant closing.",
    definitionEn: 'Clause entitling the buyer to walk away when a materially adverse event occurs before closing.',
    category: 'legal',
  },
  {
    id: 'spa_indemnification',
    termFr: "Clause d'indemnisation",
    termEn: 'Indemnification clause',
    definitionFr:
      "Mécanisme par lequel le vendeur indemnise l'acquéreur pour les pertes liées à un manquement à une déclaration de garantie.",
    definitionEn:
      'Mechanism under which the seller indemnifies the buyer for losses stemming from a breach of a representation or warranty.',
    category: 'legal',
    relatedIds: ['garantie_passif'],
  },
  {
    id: 'locked_box',
    termFr: 'Locked box',
    termEn: 'Locked box',
    definitionFr:
      "Mécanisme de prix fixe calculé à partir d'un bilan de référence antérieur au signing, sans ajustement au closing.",
    definitionEn:
      'Pricing mechanism using a reference balance sheet struck before signing, without closing adjustments.',
    category: 'deal_structure',
  },
  {
    id: 'completion_accounts',
    termFr: 'Completion accounts',
    termEn: 'Completion accounts',
    definitionFr: "Mécanisme de prix ajusté au closing sur la base d'un bilan arrêté à cette date.",
    definitionEn: 'Pricing mechanism adjusted at closing against a balance sheet drawn up at that date.',
    category: 'deal_structure',
  },
  {
    id: 'sha',
    termFr: "Pacte d'actionnaires (SHA)",
    termEn: 'Shareholders’ agreement',
    definitionFr:
      'Convention organisant les relations entre actionnaires post-closing (gouvernance, sorties, préemption).',
    definitionEn:
      'Post-closing contract governing the relationships between shareholders (governance, exit, pre-emption).',
    category: 'governance',
  },
  {
    id: 'drag_along',
    termFr: 'Clause de sortie forcée (drag-along)',
    termEn: 'Drag-along right',
    definitionFr:
      "Droit permettant à un actionnaire majoritaire d'obliger les minoritaires à céder leurs titres aux mêmes conditions.",
    definitionEn: 'Right enabling a majority shareholder to force minorities to sell on the same terms.',
    category: 'governance',
  },
  {
    id: 'tag_along',
    termFr: 'Clause de sortie conjointe (tag-along)',
    termEn: 'Tag-along right',
    definitionFr: 'Droit permettant aux minoritaires de céder leurs titres aux conditions obtenues par le majoritaire.',
    definitionEn: 'Right allowing minority shareholders to sell on the same terms as the majority shareholder.',
    category: 'governance',
  },
  {
    id: 'preemption',
    termFr: 'Droit de préemption',
    termEn: 'Pre-emption right',
    definitionFr: "Droit prioritaire d'achat en cas de cession de titres par un autre actionnaire.",
    definitionEn: 'Priority right to purchase shares being transferred by another shareholder.',
    category: 'governance',
  },
  {
    id: 'bsa',
    termFr: "Bons de souscription d'actions (BSA)",
    termEn: 'Share warrants',
    definitionFr: 'Titres donnant le droit de souscrire à des actions à un prix et dans des délais convenus.',
    definitionEn:
      'Securities granting the right to subscribe to shares at an agreed price and within an agreed period.',
    category: 'finance',
  },
  {
    id: 'bspce',
    termFr: 'BSPCE',
    termEn: 'Founder / employee warrants (BSPCE)',
    definitionFr:
      "Bons réservés aux dirigeants et salariés de PME innovantes, permettant l'acquisition d'actions à un prix fixe.",
    definitionEn:
      'Warrants reserved for founders and employees of qualifying French startups, allowing share purchases at a fixed strike.',
    category: 'finance',
  },
  {
    id: 'forme_juridique',
    termFr: 'Forme juridique',
    termEn: 'Legal form',
    definitionFr:
      'Structure juridique de la société (SAS, SARL, SA, SCI, EURL, etc.) qui détermine gouvernance et fiscalité.',
    definitionEn:
      'Legal structure of the company (SAS, SARL, SA, SCI, EURL, etc.) driving governance and tax treatment.',
    category: 'legal',
  },
  {
    id: 'kbis',
    termFr: 'Kbis',
    termEn: 'Kbis extract',
    definitionFr:
      "Extrait officiel d'immatriculation au Registre du Commerce et des Sociétés, attestant l'existence légale d'une société.",
    definitionEn: 'Official extract from the Trade and Companies Register evidencing a company’s legal existence.',
    category: 'legal',
  },
  {
    id: 'beneficial_owner',
    termFr: 'Bénéficiaire effectif',
    termEn: 'Beneficial owner',
    definitionFr:
      'Personne physique qui, in fine, contrôle une société via une chaîne de participation (au-delà de 25%).',
    definitionEn:
      'Natural person who ultimately owns or controls a company through a chain of ownership exceeding 25%.',
    category: 'governance',
  },
  {
    id: 'procedure_collective',
    termFr: 'Procédure collective',
    termEn: 'Collective insolvency proceeding',
    definitionFr: 'Procédure judiciaire (sauvegarde, redressement, liquidation) visant une société en difficulté.',
    definitionEn: 'Judicial proceeding (safeguard, reorganisation, liquidation) opened against a distressed company.',
    category: 'legal',
  },
  {
    id: 'pai',
    termFr: "Processus d'appels d'offres (process)",
    termEn: 'Sale process',
    definitionFr: 'Processus structuré de cession, enchaînant teaser, IM, offres indicatives, offres fermes et DD.',
    definitionEn: 'Structured sale process running teaser → IM → non-binding offers → binding offers → due diligence.',
    category: 'process',
    relatedIds: ['teaser', 'im'],
  },
  {
    id: 'term_sheet',
    termFr: 'Term sheet',
    termEn: 'Term sheet',
    definitionFr:
      "Résumé des principales conditions d'une transaction, intermédiaire entre discussion et LOI formelle.",
    definitionEn: 'Summary of a transaction’s main conditions, bridging early discussions and a formal LOI.',
    category: 'documents',
  },
  {
    id: 'kyc',
    termFr: 'KYC',
    termEn: 'KYC',
    definitionFr:
      "Procédures d'identification des parties (Know Your Customer), requises pour lutter contre le blanchiment.",
    definitionEn: 'Counterparty-identification procedures required by anti-money-laundering regulations.',
    category: 'due_diligence',
  },
  {
    id: 'aml',
    termFr: 'LCB-FT',
    termEn: 'AML/CFT',
    definitionFr:
      'Lutte contre le blanchiment de capitaux et le financement du terrorisme — obligations réglementaires des conseils.',
    definitionEn: 'Anti-money-laundering and counter-terrorist-financing regime imposing obligations on advisors.',
    category: 'due_diligence',
  },
  {
    id: 'competition_clearance',
    termFr: "Autorisation de l'Autorité de la concurrence",
    termEn: 'Competition authority clearance',
    definitionFr: "Notification obligatoire au-delà de seuils de chiffre d'affaires — condition suspensive fréquente.",
    definitionEn: 'Mandatory merger notification above revenue thresholds, a frequent condition precedent.',
    category: 'legal',
  },
  {
    id: 'synergies',
    termFr: 'Synergies',
    termEn: 'Synergies',
    definitionFr:
      "Gains (coûts ou revenus) attendus du rapprochement, justifiant tout ou partie d'une prime d'acquisition.",
    definitionEn: 'Revenue or cost savings expected from the combination, justifying part of the acquisition premium.',
    category: 'finance',
  },
  {
    id: 'ltm',
    termFr: 'LTM — Douze derniers mois',
    termEn: 'Last twelve months',
    definitionFr:
      "Indicateur financier calculé sur la période glissante des douze derniers mois, souvent utilisé pour le chiffre d'affaires et l'EBE.",
    definitionEn: 'Trailing twelve-month financial metric, commonly used for revenue and EBITDA.',
    category: 'finance',
  },
  {
    id: 'ntm',
    termFr: 'NTM — Douze prochains mois',
    termEn: 'Next twelve months',
    definitionFr: 'Projection financière sur les douze prochains mois, servant de base aux multiples forward.',
    definitionEn: 'Forward twelve-month projection commonly used as the base for forward multiples.',
    category: 'finance',
  },
  {
    id: 'run_rate',
    termFr: 'Run rate',
    termEn: 'Run rate',
    definitionFr:
      "Extrapolation annualisée d'une performance récente (souvent un mois ou un trimestre) pour estimer un niveau normatif.",
    definitionEn:
      'Annualised extrapolation of a recent period (month or quarter) used to estimate a steady-state level.',
    category: 'finance',
  },
  {
    id: 'fcf',
    termFr: 'Flux de trésorerie disponible',
    termEn: 'Free cash flow',
    definitionFr:
      "Trésorerie générée par l'exploitation, après impôts, variation du BFR et CAPEX, disponible pour les apporteurs de capitaux.",
    definitionEn:
      'Cash generated by operations, net of taxes, working-capital changes and capex — available to capital providers.',
    category: 'finance',
    relatedIds: ['dcf', 'wacc'],
  },
  {
    id: 'working_capital_peg',
    termFr: 'Niveau normatif de BFR',
    termEn: 'Working capital peg',
    definitionFr:
      'Niveau cible de BFR convenu entre parties, utilisé pour déclencher des ajustements de prix au closing.',
    definitionEn: 'Target working-capital level agreed between the parties, used to trigger closing price adjustments.',
    category: 'deal_structure',
    relatedIds: ['completion_accounts', 'bfr'],
  },
  {
    id: 'moic',
    termFr: 'MOIC — Multiple sur capital investi',
    termEn: 'Multiple on invested capital',
    definitionFr:
      'Ratio entre la valeur de sortie (cash retourné + valeur résiduelle) et le capital investi, indicateur clé du private equity.',
    definitionEn:
      'Ratio of total value returned (cash + residual) to invested capital, a headline private-equity metric.',
    category: 'finance',
  },
  {
    id: 'irr',
    termFr: 'TRI — Taux de rentabilité interne',
    termEn: 'Internal rate of return',
    definitionFr:
      "Taux d'actualisation qui annule la valeur actuelle nette d'une série de cash-flows — mesure de performance temporelle.",
    definitionEn:
      'Discount rate that zeroes out the net present value of a cash-flow series — measures time-weighted performance.',
    category: 'finance',
    relatedIds: ['moic'],
  },
  {
    id: 'dividend_recap',
    termFr: 'Dividend recap',
    termEn: 'Dividend recapitalisation',
    definitionFr:
      "Opération consistant à refinancer la dette d'un LBO pour distribuer un dividende exceptionnel aux actionnaires.",
    definitionEn: 'Transaction refinancing an LBO’s debt to distribute a one-off dividend to shareholders.',
    category: 'deal_structure',
    relatedIds: ['lbo'],
  },
  {
    id: 'leveraged_recap',
    termFr: 'Leveraged recap',
    termEn: 'Leveraged recapitalisation',
    definitionFr:
      'Restructuration du passif visant à lever de la dette pour réduire les fonds propres ou racheter des actionnaires.',
    definitionEn: 'Balance-sheet restructuring raising new debt to buy out shareholders or reduce equity.',
    category: 'deal_structure',
  },
  {
    id: 'carve_out',
    termFr: 'Carve-out',
    termEn: 'Carve-out',
    definitionFr:
      "Cession d'une division ou filiale non stratégique, souvent assortie d'un schéma transitoire de services partagés.",
    definitionEn:
      'Disposal of a non-core division or subsidiary, typically accompanied by a transition services agreement.',
    category: 'deal_structure',
    relatedIds: ['tsa'],
  },
  {
    id: 'tsa',
    termFr: 'Transition services agreement',
    termEn: 'Transition services agreement',
    definitionFr:
      'Contrat par lequel le cédant continue à fournir des services (IT, paie, achats) à la cible après le closing pendant une période transitoire.',
    definitionEn:
      'Agreement under which the seller continues to provide services (IT, payroll, procurement) to the target for a transitional period post-closing.',
    category: 'deal_structure',
  },
  {
    id: 'roll_up',
    termFr: 'Build-up / roll-up',
    termEn: 'Roll-up',
    definitionFr:
      'Stratégie de croissance externe consistant à enchaîner les acquisitions de petites cibles dans un même secteur fragmenté.',
    definitionEn: 'External-growth strategy chaining small-target acquisitions within a fragmented sector.',
    category: 'deal_structure',
  },
  {
    id: 'cim',
    termFr: "Mémorandum d'information confidentiel (CIM)",
    termEn: 'Confidential information memorandum',
    definitionFr: "Variante anglo-saxonne de l'IM, souvent utilisée dans les processus cross-border.",
    definitionEn: 'Anglophone variant of the IM, common in cross-border processes.',
    category: 'documents',
    relatedIds: ['im'],
  },
  {
    id: 'fairness_opinion',
    termFr: "Attestation d'équité",
    termEn: 'Fairness opinion',
    definitionFr:
      "Avis indépendant rendu par une banque ou un expert sur le caractère équitable financièrement d'une transaction.",
    definitionEn: 'Independent opinion issued by a bank or expert on the financial fairness of a transaction.',
    category: 'legal',
  },
  {
    id: 'mnpi',
    termFr: 'Information privilégiée (MNPI)',
    termEn: 'Material non-public information',
    definitionFr:
      "Information non publique susceptible d'influencer le cours d'un instrument financier ; son utilisation est encadrée par le règlement MAR.",
    definitionEn:
      'Non-public information likely to affect the price of a financial instrument; use is restricted under MAR.',
    category: 'legal',
  },
  {
    id: 'mar',
    termFr: 'Règlement MAR',
    termEn: 'Market abuse regulation',
    definitionFr:
      "Règlement européen 596/2014 encadrant les abus de marché, les listes d'initiés et la déclaration des opérations.",
    definitionEn: 'EU regulation 596/2014 governing market abuse, insider lists and transaction reporting.',
    category: 'legal',
    relatedIds: ['mnpi'],
  },
  {
    id: 'due_diligence_financial',
    termFr: 'Due diligence financière',
    termEn: 'Financial due diligence',
    definitionFr: 'Analyse de la qualité des comptes : EBE normatif, BFR, dette nette, engagements hors bilan.',
    definitionEn:
      'Quality-of-earnings review: normalised EBITDA, working capital, net debt, off-balance-sheet commitments.',
    category: 'due_diligence',
  },
  {
    id: 'due_diligence_legal',
    termFr: 'Due diligence juridique',
    termEn: 'Legal due diligence',
    definitionFr: 'Revue des contrats matériels, titres, litiges et de la conformité réglementaire.',
    definitionEn: 'Review of material contracts, corporate title, litigation and regulatory compliance.',
    category: 'due_diligence',
  },
  {
    id: 'due_diligence_tax',
    termFr: 'Due diligence fiscale',
    termEn: 'Tax due diligence',
    definitionFr: 'Analyse des risques fiscaux, positions incertaines, intégration fiscale et impôts latents.',
    definitionEn: 'Assessment of tax risks, uncertain positions, tax grouping and deferred taxes.',
    category: 'due_diligence',
  },
  {
    id: 'warranty_insurance',
    termFr: 'Assurance garantie de passif (W&I)',
    termEn: 'Warranty & indemnity insurance',
    definitionFr:
      "Police d'assurance couvrant les éventuelles violations de la garantie de passif, permettant un clean exit pour le vendeur.",
    definitionEn:
      'Insurance policy covering breaches of the representation and warranty clauses, enabling a clean exit for the seller.',
    category: 'legal',
    relatedIds: ['garantie_passif'],
  },
  {
    id: 'reverse_break_fee',
    termFr: 'Indemnité de rupture acquéreur',
    termEn: 'Reverse break fee',
    definitionFr:
      "Indemnité due par l'acquéreur au vendeur en cas de rupture de la transaction à son initiative (p. ex. défaut de financement).",
    definitionEn:
      'Fee payable by the buyer to the seller if the deal collapses through the buyer’s fault (e.g. financing failure).',
    category: 'deal_structure',
  },
  {
    id: 'break_fee',
    termFr: 'Indemnité de rupture vendeur',
    termEn: 'Break fee',
    definitionFr:
      "Indemnité due par le vendeur à l'acquéreur lorsqu'une opération échoue à la suite d'un engagement non tenu côté cédant.",
    definitionEn: 'Fee payable by the seller to the buyer when the deal collapses due to seller-side default.',
    category: 'deal_structure',
  },
  {
    id: 'quality_of_earnings',
    termFr: 'Qualité des résultats (QoE)',
    termEn: 'Quality of earnings',
    definitionFr:
      "Rapport d'audit financier mesurant la soutenabilité du résultat opérationnel après retraitements normatifs.",
    definitionEn:
      'Financial audit report gauging the sustainability of operating earnings after normalising adjustments.',
    category: 'due_diligence',
    relatedIds: ['due_diligence_financial'],
  },
  {
    id: 'key_man_clause',
    termFr: "Clause d'homme-clé",
    termEn: 'Key-man clause',
    definitionFr:
      "Clause prévoyant un mécanisme de protection (ajustement, gouvernance) en cas de départ d'un dirigeant stratégique.",
    definitionEn:
      'Clause triggering protective measures (price adjustment, governance) if a strategic executive departs.',
    category: 'governance',
  },
  {
    id: 'non_compete',
    termFr: 'Clause de non-concurrence',
    termEn: 'Non-compete covenant',
    definitionFr:
      "Engagement du cédant à ne pas exercer d'activité concurrente pendant une durée et dans un périmètre géographique convenu.",
    definitionEn:
      'Seller’s undertaking not to engage in a competing business for a defined period and geographic scope.',
    category: 'legal',
  },
];
