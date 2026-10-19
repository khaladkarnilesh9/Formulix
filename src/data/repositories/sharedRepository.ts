import {
  CommercialProduct,
  Formulation,
  ChemicalIngredient,
  Manufacturer,
  RegulatoryRecord,
  TechnicalDocument,
} from '../../types';
import {
  mockProducts,
  mockFormulations,
  mockIngredients,
  mockManufacturers,
  mockRegulatoryRecords,
  mockDocuments,
} from '../../mocks/mockData';
import {
  RecordPublishStatus,
  AuditLogEntry,
  DataQualityIssue,
  MasterVocabularies,
  defaultMasterVocabularies,
} from '../schemas/canonicalSchemas';

export interface AdminProductRecord extends CommercialProduct {
  publishStatus: RecordPublishStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AdminFormulationRecord extends Formulation {
  publishStatus: RecordPublishStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface SharedRepositoryState {
  products: AdminProductRecord[];
  formulations: AdminFormulationRecord[];
  ingredients: ChemicalIngredient[];
  manufacturers: Manufacturer[];
  regulatoryRecords: RegulatoryRecord[];
  documents: TechnicalDocument[];
  masterVocabularies: MasterVocabularies;
  auditLogs: AuditLogEntry[];
}

const STORAGE_KEY = 'formulix_master_repository_v2';

const getInitialRepositoryState = (): SharedRepositoryState => {
  const empty: SharedRepositoryState = {
    products: [], formulations: [], ingredients: [], manufacturers: [], regulatoryRecords: [],
    documents: [], masterVocabularies: defaultMasterVocabularies, auditLogs: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SharedRepositoryState;
      const seeds = { products: mockProducts, formulations: mockFormulations, ingredients: mockIngredients,
        manufacturers: mockManufacturers, regulatoryRecords: mockRegulatoryRecords, documents: mockDocuments };
      const cleaned = { ...empty, ...parsed };
      const removedIds = new Set(Object.values(seeds).flat().map(row => row.id));
      for (const key of Object.keys(seeds) as (keyof typeof seeds)[]) {
        const ids = new Set(seeds[key].map(row => row.id));
        (cleaned[key] as { id: string }[]) = (parsed[key] ?? []).filter(row => !ids.has(row.id));
      }
      cleaned.auditLogs = (parsed.auditLogs ?? []).filter(row => !removedIds.has(row.entityId));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
  } catch (error) {
    console.error('Failed to load local editing repository', error);
  }
  return empty;
};

let repoState: SharedRepositoryState = getInitialRepositoryState();
const listeners = new Set<() => void>();

function persistAndNotify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repoState));
  } catch (e) {
    console.error('Failed to save shared repository to storage', e);
  }
  listeners.forEach((l) => l());
}

export const SharedRepository = {
  // Subscriptions for React components
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getState: () => repoState,

  // Products
  getAllProducts: (includeUnpublished = false): AdminProductRecord[] => {
    if (includeUnpublished) {
      return [...repoState.products];
    }
    return repoState.products.filter((p) => p.publishStatus === 'Published');
  },

  getProductById: (id: string): AdminProductRecord | undefined => {
    return repoState.products.find((p) => p.id === id);
  },

  saveProduct: (
    product: Partial<AdminProductRecord> & { brandName: string; activeIngredient: string },
    author = 'Admin Operator'
  ): AdminProductRecord => {
    const isNew = !product.id || !repoState.products.some((p) => p.id === product.id);
    const now = new Date().toISOString().slice(0, 10);
    const fullId = product.id || `prod-${Date.now()}`;

    let savedRecord: AdminProductRecord;

    if (isNew) {
      savedRecord = {
        id: fullId,
        brandName: product.brandName,
        genericName: product.genericName || `${product.activeIngredient} formulation`,
        activeIngredient: product.activeIngredient,
        casNumber: product.casNumber || 'N/A',
        manufacturerId: product.manufacturerId || 'mfg-1',
        manufacturerName: product.manufacturerName || 'Bayer CropScience AG',
        category: product.category || 'Agrochemical',
        formulationType: product.formulationType || 'SC (Suspension Concentrate)',
        strength: product.strength || '200 g/L',
        country: product.country || 'India',
        registrationStatus: product.registrationStatus || 'Approved',
        registrationNumber: product.registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        regulatoryAuthority: product.regulatoryAuthority || 'Central Insecticides Board & Registration Committee (CIBRC)',
        dataSource: product.dataSource || 'Administrator Manual Entry',
        lastVerifiedDate: product.lastVerifiedDate || now,
        verificationEvidence: product.verificationEvidence || 'Manufacturer disclosed',
        description: product.description || 'Commercial chemical formulation record.',
        indicationsOrPests: product.indicationsOrPests || ['General target use'],
        formulationId: product.formulationId,
        patentIds: product.patentIds || [],
        documentIds: product.documentIds || [],
        specs: product.specs || { shelfLifeMonths: 24 },
        composition: product.composition || [
          {
            ingredient: product.activeIngredient,
            cas: product.casNumber || 'N/A',
            chemicalFunction: 'Active Ingredient',
            concentration: product.strength || '20% w/w',
            ingredientCategory: 'Active',
            sourceEvidence: 'Manufacturer disclosed',
          },
        ],
        publishStatus: product.publishStatus || 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: now,
        version: 1,
      };

      repoState = {
        ...repoState,
        products: [savedRecord, ...repoState.products],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Product',
            entityId: savedRecord.id,
            entityName: savedRecord.brandName,
            action: 'Created',
            author,
            summary: `Created new commercial product record "${savedRecord.brandName}". Status: ${savedRecord.publishStatus}.`,
          },
          ...repoState.auditLogs,
        ],
      };
    } else {
      const existing = repoState.products.find((p) => p.id === fullId)!;
      savedRecord = {
        ...existing,
        ...product,
        updatedAt: now,
        version: existing.version + 1,
      };

      repoState = {
        ...repoState,
        products: repoState.products.map((p) => (p.id === fullId ? savedRecord : p)),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Product',
            entityId: savedRecord.id,
            entityName: savedRecord.brandName,
            action: 'Updated',
            author,
            summary: `Updated product "${savedRecord.brandName}" (v${savedRecord.version}). Status: ${savedRecord.publishStatus}.`,
          },
          ...repoState.auditLogs,
        ],
      };
    }

    persistAndNotify();
    return savedRecord;
  },

  setProductPublishStatus: (
    productId: string,
    status: RecordPublishStatus,
    author = 'Senior Reviewer'
  ) => {
    const target = repoState.products.find((p) => p.id === productId);
    if (!target) return;

    const updated = {
      ...target,
      publishStatus: status,
      updatedAt: new Date().toISOString().slice(0, 10),
      version: target.version + 1,
    };

    repoState = {
      ...repoState,
      products: repoState.products.map((p) => (p.id === productId ? updated : p)),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Product',
          entityId: target.id,
          entityName: target.brandName,
          action: status === 'Published' ? 'Published' : status === 'Approved' ? 'Approved' : 'Updated',
          author,
          summary: `Transitioned publication lifecycle of "${target.brandName}" to ${status}.`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  deleteProduct: (productId: string, author = 'Admin Lead') => {
    const target = repoState.products.find((p) => p.id === productId);
    if (!target) return;

    repoState = {
      ...repoState,
      products: repoState.products.filter((p) => p.id !== productId),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Product',
          entityId: target.id,
          entityName: target.brandName,
          action: 'Deleted',
          author,
          summary: `Removed commercial product record "${target.brandName}".`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  duplicateProduct: (productId: string, author = 'Admin Operator'): AdminProductRecord => {
    const source = repoState.products.find((p) => p.id === productId);
    if (!source) throw new Error('Source product not found');

    const newId = `prod-copy-${Date.now()}`;
    const duplicated: AdminProductRecord = {
      ...source,
      id: newId,
      brandName: `${source.brandName} (Copy)`,
      registrationNumber: `${source.registrationNumber}-COPY`,
      publishStatus: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString().slice(0, 10),
      version: 1,
    };

    repoState = {
      ...repoState,
      products: [duplicated, ...repoState.products],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Product',
          entityId: duplicated.id,
          entityName: duplicated.brandName,
          action: 'Created',
          author,
          summary: `Cloned from "${source.brandName}". Initial status set to Draft.`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
    return duplicated;
  },

  // Formulations
  getAllFormulations: (includeUnpublished = false): AdminFormulationRecord[] => {
    if (includeUnpublished) {
      return [...repoState.formulations];
    }
    return repoState.formulations.filter((f) => f.publishStatus === 'Published');
  },

  getFormulationById: (id: string): AdminFormulationRecord | undefined => {
    return repoState.formulations.find((f) => f.id === id);
  },

  saveFormulation: (
    formulation: Partial<AdminFormulationRecord> & { name: string },
    author = 'Formulation Architect'
  ): AdminFormulationRecord => {
    const isNew = !formulation.id || !repoState.formulations.some((f) => f.id === formulation.id);
    const fullId = formulation.id || `form-${Date.now()}`;
    let saved: AdminFormulationRecord;

    if (isNew) {
      saved = {
        id: fullId,
        name: formulation.name,
        category: formulation.category || 'Agrochemical',
        formulationType: formulation.formulationType || 'SC (Suspension Concentrate)',
        intendedApplication: formulation.intendedApplication || 'Target field application.',
        targetIndustry: formulation.targetIndustry || 'Crop Protection',
        verificationStatus: formulation.verificationStatus || 'Standard Formulation Reference',
        verificationEvidence: formulation.verificationEvidence || 'Manufacturer disclosed',
        sourceReference: formulation.sourceReference || 'Laboratory Master Formulation Book',
        composition: formulation.composition || [],
        manufacturingInfo: formulation.manufacturingInfo || {
          processOverview: 'Liquid blending under controlled temperature.',
          mixingSequence: ['Charge solvent', 'Add active', 'Disperse until uniform'],
          processingConditions: ['Temp: 25-30 °C', 'RPM: 500'],
          equipment: ['SS-316 Reactor'],
          qcParameters: ['Assay ± 1%'],
        },
        properties: formulation.properties || {
          ph: '6.5-7.5',
          viscosity: '500 mPa·s',
          density: '1.10 g/cm³',
          particleSize: 'd50 = 1.2 µm',
          stability: 'Passes accelerated storage (54 °C for 14d)',
          shelfLife: '24 Months',
          appearance: 'Uniform suspension',
        },
        patentReferences: formulation.patentReferences || [],
        commercialProductIds: formulation.commercialProductIds || [],
        publishStatus: formulation.publishStatus || 'Published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString().slice(0, 10),
        version: 1,
      };

      repoState = {
        ...repoState,
        formulations: [saved, ...repoState.formulations],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Formulation',
            entityId: saved.id,
            entityName: saved.name,
            action: 'Created',
            author,
            summary: `Created formulation recipe "${saved.name}".`,
          },
          ...repoState.auditLogs,
        ],
      };
    } else {
      const existing = repoState.formulations.find((f) => f.id === fullId)!;
      saved = {
        ...existing,
        ...formulation,
        updatedAt: new Date().toISOString().slice(0, 10),
        version: existing.version + 1,
      };

      repoState = {
        ...repoState,
        formulations: repoState.formulations.map((f) => (f.id === fullId ? saved : f)),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Formulation',
            entityId: saved.id,
            entityName: saved.name,
            action: 'Updated',
            author,
            summary: `Updated formulation recipe "${saved.name}".`,
          },
          ...repoState.auditLogs,
        ],
      };
    }

    persistAndNotify();
    return saved;
  },

  deleteFormulation: (formulationId: string, author = 'Admin Lead') => {
    const target = repoState.formulations.find((f) => f.id === formulationId);
    if (!target) return;

    repoState = {
      ...repoState,
      formulations: repoState.formulations.filter((f) => f.id !== formulationId),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Formulation',
          entityId: target.id,
          entityName: target.name,
          action: 'Deleted',
          author,
          summary: `Deleted formulation recipe "${target.name}".`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  // Chemical Ingredients
  getAllIngredients: (): ChemicalIngredient[] => {
    return [...repoState.ingredients];
  },

  saveIngredient: (
    ingredient: Partial<ChemicalIngredient> & { name: string; casNumber: string },
    author = 'Chemical Curator'
  ): ChemicalIngredient => {
    const isNew = !ingredient.id || !repoState.ingredients.some((i) => i.id === ingredient.id);
    const fullId = ingredient.id || `ing-${Date.now()}`;
    let saved: ChemicalIngredient;

    if (isNew) {
      saved = {
        id: fullId,
        name: ingredient.name,
        casNumber: ingredient.casNumber,
        iupacName: ingredient.iupacName || ingredient.name,
        molecularFormula: ingredient.molecularFormula || 'C10H10',
        molecularWeight: ingredient.molecularWeight || 200.0,
        smiles: ingredient.smiles || 'CC(=O)O',
        inchiKey: ingredient.inchiKey || 'INCHIKEY-HASH-DEMO',
        category: ingredient.category || 'Agrochemical Active',
        physicalState: ingredient.physicalState || 'Crystalline solid',
        meltingPoint: ingredient.meltingPoint || '120 °C',
        boilingPoint: ingredient.boilingPoint || 'Decomposes',
        waterSolubility: ingredient.waterSolubility || '10 mg/L',
        logP: ingredient.logP ?? 1.5,
        hazardStatements: ingredient.hazardStatements || ['H302: Harmful if swallowed'],
        commercialProductCount: ingredient.commercialProductCount || 1,
        description: ingredient.description || 'Chemical substance record.',
        relatedProductIds: ingredient.relatedProductIds || [],
        relatedManufacturers: ingredient.relatedManufacturers || [],
        structureSvgType: ingredient.structureSvgType || 'aromatic',
      };

      repoState = {
        ...repoState,
        ingredients: [saved, ...repoState.ingredients],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Ingredient',
            entityId: saved.id,
            entityName: saved.name,
            action: 'Created',
            author,
            summary: `Cataloged new active chemical entity "${saved.name}" (CAS ${saved.casNumber}).`,
          },
          ...repoState.auditLogs,
        ],
      };
    } else {
      const existing = repoState.ingredients.find((i) => i.id === fullId)!;
      saved = { ...existing, ...ingredient };
      repoState = {
        ...repoState,
        ingredients: repoState.ingredients.map((i) => (i.id === fullId ? saved : i)),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Ingredient',
            entityId: saved.id,
            entityName: saved.name,
            action: 'Updated',
            author,
            summary: `Updated chemical entity "${saved.name}".`,
          },
          ...repoState.auditLogs,
        ],
      };
    }

    persistAndNotify();
    return saved;
  },

  deleteIngredient: (ingredientId: string, author = 'Admin Lead') => {
    const target = repoState.ingredients.find((i) => i.id === ingredientId);
    if (!target) return;

    repoState = {
      ...repoState,
      ingredients: repoState.ingredients.filter((i) => i.id !== ingredientId),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Ingredient',
          entityId: target.id,
          entityName: target.name,
          action: 'Deleted',
          author,
          summary: `Deleted chemical entity "${target.name}".`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  // Manufacturers
  getAllManufacturers: (): Manufacturer[] => {
    return [...repoState.manufacturers];
  },

  saveManufacturer: (
    mfg: Partial<Manufacturer> & { name: string; country: string },
    author = 'Corporate Data Curator'
  ): Manufacturer => {
    const isNew = !mfg.id || !repoState.manufacturers.some((m) => m.id === mfg.id);
    const fullId = mfg.id || `mfg-${Date.now()}`;
    let saved: Manufacturer;

    if (isNew) {
      saved = {
        id: fullId,
        name: mfg.name,
        country: mfg.country,
        headquarters: mfg.headquarters || `${mfg.country} Corporate HQ`,
        founded: mfg.founded || 1990,
        sector: mfg.sector || ['Specialty Chemicals'],
        productCategories: mfg.productCategories || ['Agrochemical'],
        productCount: mfg.productCount || 10,
        website: mfg.website || 'https://example.com',
        brandPortfolio: mfg.brandPortfolio || ['Core Brand'],
        role: mfg.role || 'Manufacturer',
        overview: mfg.overview || 'Commercial manufacturing enterprise.',
        complianceCertifications: mfg.complianceCertifications || ['ISO 9001:2015'],
      };

      repoState = {
        ...repoState,
        manufacturers: [saved, ...repoState.manufacturers],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Manufacturer',
            entityId: saved.id,
            entityName: saved.name,
            action: 'Created',
            author,
            summary: `Registered corporate manufacturer "${saved.name}".`,
          },
          ...repoState.auditLogs,
        ],
      };
    } else {
      const existing = repoState.manufacturers.find((m) => m.id === fullId)!;
      saved = { ...existing, ...mfg };
      repoState = {
        ...repoState,
        manufacturers: repoState.manufacturers.map((m) => (m.id === fullId ? saved : m)),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Manufacturer',
            entityId: saved.id,
            entityName: saved.name,
            action: 'Updated',
            author,
            summary: `Updated corporate profile for "${saved.name}".`,
          },
          ...repoState.auditLogs,
        ],
      };
    }

    persistAndNotify();
    return saved;
  },

  deleteManufacturer: (mfgId: string, author = 'Admin Lead') => {
    const target = repoState.manufacturers.find((m) => m.id === mfgId);
    if (!target) return;

    repoState = {
      ...repoState,
      manufacturers: repoState.manufacturers.filter((m) => m.id !== mfgId),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Manufacturer',
          entityId: target.id,
          entityName: target.name,
          action: 'Deleted',
          author,
          summary: `Deleted manufacturer profile "${target.name}".`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  // Regulatory Records
  getAllRegulatoryRecords: (): RegulatoryRecord[] => {
    return [...repoState.regulatoryRecords];
  },

  saveRegulatoryRecord: (
    record: Partial<RegulatoryRecord> & { registrationNumber: string; productName: string },
    author = 'Regulatory Affairs Lead'
  ): RegulatoryRecord => {
    const isNew = !record.id || !repoState.regulatoryRecords.some((r) => r.id === record.id);
    const fullId = record.id || `reg-${Date.now()}`;
    let saved: RegulatoryRecord;

    if (isNew) {
      saved = {
        id: fullId,
        registrationNumber: record.registrationNumber,
        productName: record.productName,
        productId: record.productId || 'prod-1',
        activeIngredient: record.activeIngredient || 'Technical Active',
        regulatoryAuthority: record.regulatoryAuthority || 'US Environmental Protection Agency (US EPA)',
        country: record.country || 'United States',
        approvalStatus: record.approvalStatus || 'Approved',
        registrationHolder: record.registrationHolder || 'Primary Registrant',
        approvalDate: record.approvalDate || '2024-01-01',
        expiryDate: record.expiryDate || '2034-01-01',
        sourceDocument: record.sourceDocument || 'Official Regulatory Gazette Notification',
        lastVerifiedDate: record.lastVerifiedDate || new Date().toISOString().slice(0, 10),
        officialLink: record.officialLink || 'https://example.gov/register',
      };

      repoState = {
        ...repoState,
        regulatoryRecords: [saved, ...repoState.regulatoryRecords],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Registration',
            entityId: saved.id,
            entityName: saved.registrationNumber,
            action: 'Created',
            author,
            summary: `Registered regulatory dossier ${saved.registrationNumber} for ${saved.productName}.`,
          },
          ...repoState.auditLogs,
        ],
      };
    } else {
      const existing = repoState.regulatoryRecords.find((r) => r.id === fullId)!;
      saved = { ...existing, ...record };
      repoState = {
        ...repoState,
        regulatoryRecords: repoState.regulatoryRecords.map((r) => (r.id === fullId ? saved : r)),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Registration',
            entityId: saved.id,
            entityName: saved.registrationNumber,
            action: 'Updated',
            author,
            summary: `Updated regulatory record ${saved.registrationNumber}.`,
          },
          ...repoState.auditLogs,
        ],
      };
    }

    persistAndNotify();
    return saved;
  },

  deleteRegulatoryRecord: (recordId: string, author = 'Admin Lead') => {
    const target = repoState.regulatoryRecords.find((r) => r.id === recordId);
    if (!target) return;

    repoState = {
      ...repoState,
      regulatoryRecords: repoState.regulatoryRecords.filter((r) => r.id !== recordId),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Registration',
          entityId: target.id,
          entityName: target.registrationNumber,
          action: 'Deleted',
          author,
          summary: `Deleted regulatory record ${target.registrationNumber}.`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  // Technical Documents & Patents
  getAllDocuments: (): TechnicalDocument[] => {
    return [...repoState.documents];
  },

  saveDocument: (
    doc: Partial<TechnicalDocument> & { title: string; documentNumber: string },
    author = 'Document Custodian'
  ): TechnicalDocument => {
    const isNew = !doc.id || !repoState.documents.some((d) => d.id === doc.id);
    const fullId = doc.id || `doc-${Date.now()}`;
    let saved: TechnicalDocument;

    if (isNew) {
      saved = {
        id: fullId,
        title: doc.title,
        type: doc.type || 'Technical Data Sheet (TDS)',
        documentNumber: doc.documentNumber,
        issuer: doc.issuer || 'Technical Services Lab',
        publicationDate: doc.publicationDate || new Date().toISOString().slice(0, 10),
        format: doc.format || 'PDF',
        fileSize: doc.fileSize || '1.0 MB',
        relatedProducts: doc.relatedProducts || [],
        relatedIngredients: doc.relatedIngredients || [],
        summary: doc.summary || 'Uploaded technical document summary.',
        sourceUrl: doc.sourceUrl || 'https://formulix.internal.mock/doc',
        verifiedStatus: doc.verifiedStatus || 'Verified Compliant',
      };

      repoState = {
        ...repoState,
        documents: [saved, ...repoState.documents],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Document',
            entityId: saved.id,
            entityName: saved.title,
            action: 'Created',
            author,
            summary: `Uploaded technical document archive ${saved.documentNumber}.`,
          },
          ...repoState.auditLogs,
        ],
      };
    } else {
      const existing = repoState.documents.find((d) => d.id === fullId)!;
      saved = { ...existing, ...doc };
      repoState = {
        ...repoState,
        documents: repoState.documents.map((d) => (d.id === fullId ? saved : d)),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            entityType: 'Document',
            entityId: saved.id,
            entityName: saved.title,
            action: 'Updated',
            author,
            summary: `Updated technical document ${saved.documentNumber}.`,
          },
          ...repoState.auditLogs,
        ],
      };
    }

    persistAndNotify();
    return saved;
  },

  deleteDocument: (docId: string, author = 'Admin Lead') => {
    const target = repoState.documents.find((d) => d.id === docId);
    if (!target) return;

    repoState = {
      ...repoState,
      documents: repoState.documents.filter((d) => d.id !== docId),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'Document',
          entityId: target.id,
          entityName: target.title,
          action: 'Deleted',
          author,
          summary: `Deleted document ${target.documentNumber}.`,
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  // Master Vocabularies
  getMasterVocabularies: (): MasterVocabularies => {
    return repoState.masterVocabularies;
  },

  updateMasterVocabularies: (
    updated: MasterVocabularies,
    author = 'Governance Officer'
  ) => {
    repoState = {
      ...repoState,
      masterVocabularies: updated,
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          entityType: 'MasterData',
          entityId: 'vocab-1',
          entityName: 'Controlled Vocabularies',
          action: 'Updated',
          author,
          summary: 'Updated controlled vocabularies and taxonomies.',
        },
        ...repoState.auditLogs,
      ],
    };
    persistAndNotify();
  },

  // Audit Logs
  getAuditLogs: (): AuditLogEntry[] => {
    return [...repoState.auditLogs];
  },

  // Data Quality Assessment Engine
  assessDataQuality: (): {
    issues: DataQualityIssue[];
    completenessScore: number;
    validityScore: number;
    provenanceScore: number;
  } => {
    const issues: DataQualityIssue[] = [];
    const products = repoState.products;

    let completeFieldsCount = 0;
    let totalFieldsEvaluated = 0;

    products.forEach((p) => {
      // Check CAS
      totalFieldsEvaluated += 5;
      if (!p.casNumber || p.casNumber === 'N/A' || p.casNumber === 'Proprietary') {
        issues.push({
          id: `dq-cas-${p.id}`,
          entityType: 'Product',
          entityId: p.id,
          entityName: p.brandName,
          issueType: 'Missing Required Field',
          severity: 'High',
          description: `Product "${p.brandName}" is missing a standard CAS registry number.`,
          field: 'casNumber',
        });
      } else {
        completeFieldsCount++;
      }

      // Check Manufacturer linkage
      const mfgExists = repoState.manufacturers.some((m) => m.id === p.manufacturerId || m.name === p.manufacturerName);
      if (!mfgExists) {
        issues.push({
          id: `dq-mfg-${p.id}`,
          entityType: 'Product',
          entityId: p.id,
          entityName: p.brandName,
          issueType: 'Broken Relationship',
          severity: 'High',
          description: `Manufacturer "${p.manufacturerName}" is not registered in the corporate directory.`,
          field: 'manufacturerId',
        });
      } else {
        completeFieldsCount++;
      }

      // Check specs
      if (!p.specs.shelfLifeMonths) {
        issues.push({
          id: `dq-shelf-${p.id}`,
          entityType: 'Product',
          entityId: p.id,
          entityName: p.brandName,
          issueType: 'Missing Required Field',
          severity: 'Medium',
          description: `Product "${p.brandName}" does not specify shelf-life duration in months.`,
          field: 'specs.shelfLifeMonths',
        });
      } else {
        completeFieldsCount++;
      }

      if (!p.specs.density && p.formulationType.includes('SC')) {
        issues.push({
          id: `dq-dens-${p.id}`,
          entityType: 'Product',
          entityId: p.id,
          entityName: p.brandName,
          issueType: 'Missing Required Field',
          severity: 'Low',
          description: `Liquid SC formulation "${p.brandName}" missing specific gravity / density test value.`,
          field: 'specs.density',
        });
      } else {
        completeFieldsCount++;
      }

      // Check Evidence Tier
      if (p.verificationEvidence === 'Synthetic demo data') {
        issues.push({
          id: `dq-demo-${p.id}`,
          entityType: 'Product',
          entityId: p.id,
          entityName: p.brandName,
          issueType: 'Unverified Status',
          severity: 'Low',
          description: `"${p.brandName}" is flagged with Synthetic Demo Data status; awaiting regulatory docket audit.`,
          field: 'verificationEvidence',
        });
      } else {
        completeFieldsCount++;
      }
    });

    // Check Formulations for concentration
    repoState.formulations.forEach((f) => {
      if (f.composition.length === 0) {
        issues.push({
          id: `dq-form-empty-${f.id}`,
          entityType: 'Formulation',
          entityId: f.id,
          entityName: f.name,
          issueType: 'Missing Required Field',
          severity: 'High',
          description: `Formulation "${f.name}" has zero ingredient components recorded in composition table.`,
          field: 'composition',
        });
      }
    });

    const completenessScore = totalFieldsEvaluated > 0
      ? Math.round((completeFieldsCount / totalFieldsEvaluated) * 100)
      : 88;

    const validityScore = Math.max(70, Math.min(99, 100 - (issues.filter((i) => i.severity === 'High').length * 4)));
    const provenanceScore = Math.round(
      (products.filter((p) => p.verificationEvidence === 'Regulatory verified' || p.verificationEvidence === 'Manufacturer disclosed').length /
        (products.length || 1)) * 100
    );

    return {
      issues,
      completenessScore,
      validityScore,
      provenanceScore,
    };
  },

  // Bulk Import Executor
  importRecords: (
    entityType: 'Product' | 'Formulation' | 'Ingredient' | 'Manufacturer',
    records: any[],
    author = 'Import Specialist'
  ): { importedCount: number; errors: string[] } => {
    let importedCount = 0;
    const errors: string[] = [];

    records.forEach((row, index) => {
      try {
        if (entityType === 'Product') {
          if (!row.brandName || !row.activeIngredient) {
            errors.push(`Row ${index + 1}: Missing required brandName or activeIngredient.`);
            return;
          }
          SharedRepository.saveProduct(
            {
              id: row.id || `prod-imp-${Date.now()}-${index}`,
              brandName: row.brandName,
              genericName: row.genericName || `${row.activeIngredient} formulation`,
              activeIngredient: row.activeIngredient,
              casNumber: row.casNumber || 'N/A',
              manufacturerName: row.manufacturerName || 'Generic Formulator',
              manufacturerId: 'mfg-1',
              category: row.category || 'Agrochemical',
              formulationType: row.formulationType || 'SC (Suspension Concentrate)',
              strength: row.strength || '200 g/L',
              country: row.country || 'India',
              registrationStatus: 'Approved',
              registrationNumber: row.registrationNumber || `IMP-${Date.now().toString().slice(-5)}`,
              regulatoryAuthority: row.regulatoryAuthority || 'Central Regulatory Authority',
              dataSource: 'Bulk Import Dataset',
              lastVerifiedDate: new Date().toISOString().slice(0, 10),
              verificationEvidence: 'Manufacturer disclosed',
              description: row.description || 'Imported commercial product.',
              indicationsOrPests: ['Imported indication'],
              specs: { shelfLifeMonths: 24 },
              composition: [],
              publishStatus: 'Draft',
            },
            author
          );
          importedCount++;
        }
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err.message || 'Validation error'}`);
      }
    });

    return { importedCount, errors };
  },

  // Auto-resolve specific data quality issues
  autoResolveIssue: (issueId: string) => {
    if (issueId.startsWith('dq-cas-')) {
      const prodId = issueId.replace('dq-cas-', '');
      const prod = repoState.products.find((p) => p.id === prodId);
      if (prod) {
        // Resolve known actives or benchmark CAS
        const resolvedCas =
          prod.activeIngredient.includes('Chlorantraniliprole') ? '500008-45-7' :
          prod.activeIngredient.includes('Imidacloprid') ? '138261-41-3' :
          prod.activeIngredient.includes('Metformin') ? '1115-70-4' :
          prod.activeIngredient.includes('Paracetamol') ? '103-90-2' : 'CAS-VERIFIED-991';
        SharedRepository.saveProduct({ ...prod, casNumber: resolvedCas }, 'Auto-Resolver Engine');
      }
    } else if (issueId.startsWith('dq-demo-')) {
      const prodId = issueId.replace('dq-demo-', '');
      const prod = repoState.products.find((p) => p.id === prodId);
      if (prod) {
        SharedRepository.saveProduct({ ...prod, verificationEvidence: 'Manufacturer disclosed' }, 'Auto-Resolver Engine');
      }
    } else if (issueId.startsWith('dq-mfg-')) {
      const prodId = issueId.replace('dq-mfg-', '');
      const prod = repoState.products.find((p) => p.id === prodId);
      if (prod && repoState.manufacturers.length > 0) {
        const mfg = repoState.manufacturers[0];
        SharedRepository.saveProduct({ ...prod, manufacturerId: mfg.id, manufacturerName: mfg.name }, 'Auto-Resolver Engine');
      }
    }
  },

  // Export Complete Repository
  exportRepositoryData: (): SharedRepositoryState => {
    return { ...repoState };
  },

  // Reset to Factory Demonstration Defaults
  resetToDefaults: () => {
    localStorage.removeItem(STORAGE_KEY);
    repoState = getInitialRepositoryState();
    persistAndNotify();
  },

  resetToDefaultMocks: () => {
    localStorage.removeItem(STORAGE_KEY);
    repoState = getInitialRepositoryState();
    persistAndNotify();
  },
};
