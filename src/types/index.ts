export type ProductCategory = 'Agrochemical' | 'Pharmaceutical' | 'Industrial';

export type VerificationEvidence =
  | 'Regulatory verified'
  | 'Manufacturer disclosed'
  | 'Patent disclosed'
  | 'Literature reported'
  | 'Imported unverified'
  | 'Synthetic demo data';

export type RegistrationStatus =
  | 'Unverified'
  | 'Approved'
  | 'Under Review'
  | 'Active'
  | 'Conditional'
  | 'Withdrawn';

export interface CompositionItem {
  ingredient: string;
  cas: string;
  chemicalFunction: string;
  concentration: string;
  unit?: string;
  ingredientCategory:
    | 'Active'
    | 'API'
    | 'Surfactant'
    | 'Solvent'
    | 'Carrier'
    | 'Adjuvant'
    | 'Polymer'
    | 'Binder'
    | 'Dispersant'
    | 'Stabilizer'
    | 'Preservative';
  sourceEvidence: VerificationEvidence;
}

export interface CommercialProduct {
  recordKind?: string;
  publishStatus?: string;
  marketData?: Record<string, string>;
  id: string;
  brandName: string;
  genericName: string;
  activeIngredient: string;
  casNumber: string;
  manufacturerId: string;
  manufacturerName: string;
  category: ProductCategory;
  formulationType: string; // EC, SC, SL, WG, Tablet, Controlled-release, etc.
  strength: string;
  country: string;
  registrationStatus: RegistrationStatus;
  registrationNumber: string;
  regulatoryAuthority: string;
  dataSource: string;
  lastVerifiedDate: string;
  verificationEvidence: VerificationEvidence;
  description: string;
  indicationsOrPests: string[];
  formulationId?: string;
  patentIds: string[];
  documentIds: string[];
  specs: {
    ph?: string;
    density?: string;
    viscosity?: string;
    flashPoint?: string;
    shelfLifeMonths?: number;
    storageTemp?: string;
  };
  composition: CompositionItem[];
}

export interface Formulation {
  publishStatus?: string;
  marketData?: Record<string, string>;
  id: string;
  name: string;
  category: ProductCategory;
  formulationType: string;
  intendedApplication: string;
  targetIndustry: string;
  verificationStatus: string;
  verificationEvidence: VerificationEvidence;
  sourceReference: string;
  composition: CompositionItem[];
  manufacturingInfo: {
    processOverview: string;
    mixingSequence: string[];
    processingConditions: string[];
    equipment: string[];
    qcParameters: string[];
  };
  properties: {
    ph: string;
    viscosity: string;
    density: string;
    particleSize: string;
    stability: string;
    shelfLife: string;
    appearance: string;
  };
  patentReferences: Array<{
    patentNumber: string;
    title: string;
    publication: string;
    url: string;
    relevantExample: string;
  }>;
  commercialProductIds: string[];
}

export interface ChemicalIngredient {
  id: string;
  name: string;
  casNumber: string;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: number;
  smiles: string;
  inchiKey: string;
  category: string;
  physicalState: string;
  meltingPoint: string;
  boilingPoint: string;
  waterSolubility: string;
  logP: number;
  hazardStatements: string[];
  commercialProductCount: number;
  description: string;
  relatedProductIds: string[];
  relatedManufacturers: string[];
  structureSvgType?: 'heterocycle' | 'aromatic' | 'chain' | 'polymeric' | 'complex';
}

export interface ActiveIngredientReference {
  id: string;
  sourceText: string;
  productIds: string[];
  categories: string[];
  markets: string[];
  verificationStatus: string;
  recordKind: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  country: string;
  headquarters: string;
  founded: number;
  sector: string[];
  productCategories: ProductCategory[];
  productCount: number | null;
  website: string;
  brandPortfolio: string[];
  role: 'Manufacturer' | 'Registrant' | 'Distributor' | 'Contract Formulator';
  overview: string;
  complianceCertifications: string[];
  logoUrl?:string;
  logoVerified?:boolean;
  logoSourceUrl?:string;
  logoAttribution?:string;
  indexedCount?:number;
  recordKind?:string;
  aliases?:string[];
}

export interface RegulatoryRecord {
  id: string;
  registrationNumber: string;
  productName: string;
  productId: string;
  activeIngredient: string;
  regulatoryAuthority: string; // CIBRC, US EPA, US FDA, EU EFSA, EMA, etc.
  country: string;
  approvalStatus: RegistrationStatus;
  registrationHolder: string;
  approvalDate: string;
  expiryDate: string;
  sourceDocument: string;
  lastVerifiedDate: string;
  officialLink: string;
}

export interface TechnicalDocument {
  id: string;
  title: string;
  type:
    | 'Formulation Patent'
    | 'Safety Data Sheet (SDS)'
    | 'Technical Data Sheet (TDS)'
    | 'Product Label'
    | 'Regulatory Approval'
    | 'Scientific Literature';
  documentNumber: string;
  issuer: string;
  publicationDate: string;
  format: 'PDF' | 'DOCX' | 'XML';
  fileSize: string;
  relatedProducts: string[];
  relatedIngredients: string[];
  summary: string;
  sourceUrl: string;
  verifiedStatus: string;
}

export interface ResearchNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  targetType: 'Product' | 'Formulation' | 'Ingredient' | 'Manufacturer' | 'Comparison' | 'Regulatory';
  targetName: string;
  timestamp: string;
  targetId?: string;
}
