import * as ts from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';
import fs from 'node:fs';
import path from 'node:path';
const api = new API();
const snapshot = api.updateSnapshot({ openProjects: [path.resolve('tsconfig.json')] });
const program = snapshot.getProjects()[0].program;
let source;
const models = {
CommercialProduct: ['products.CommercialProduct','src/features/products;src/features/admin/products','products'],
Formulation: ['formulations.Formulation','src/features/formulations;src/features/admin/formulations','formulations'],
ChemicalIngredient: ['ingredients.Ingredient','src/features/ingredients;src/features/admin/ingredients','ingredients'],
Manufacturer: ['manufacturers.Manufacturer','src/features/manufacturers;src/features/admin/manufacturers','manufacturers'],
RegulatoryRecord: ['regulatory.RegulatoryRegistration','src/features/regulatory;src/features/admin/regulatory','regulatory/registrations'],
TechnicalDocument: ['documents.TechnicalDocument','src/features/documents;src/features/admin/documents','documents'],
ResearchNote: ['workspace.ResearchNote','src/features/workspace','research-notes'],
ActivityItem: ['workspace.WorkspaceAuditEvent','src/features/workspace','workspace-events'],
CompositionItem: ['formulations.FormulationIngredient / products.ProductActiveIngredient','Formulation editor / product wizard','formulations / products'],
AdminProductRecord: ['products.CommercialProduct','src/features/admin/products','products'],
AdminFormulationRecord: ['formulations.Formulation','src/features/admin/formulations','formulations'],
AuditLogEntry: ['audit.AuditEvent','src/features/admin/audit','audit-events'],
MasterVocabularies: ['taxonomy reference models','src/features/admin/masterdata','vocabularies'],
WorkspaceState: ['workspace workspace models/preferences','src/stores/workspaceStore.ts','workspace-state'],
};
const rows = [];
function fields(members, parent, entity) {
for (const member of members) {
if (!member.name || !member.type) continue;
const key = parent + member.name.getText(source);
if (ts.isTypeLiteralNode(member.type)) { fields(member.type.members, key + '.', entity); continue; }
const meta = models[entity];
if (!meta) continue;
rows.push({ entity, component:meta[1], frontendField:key, type:member.type.getText(source).replaceAll('\n',' '),
required:!member.questionToken, model:meta[0], serializerField:key,
modelField:key.replace(/[A-Z]/g, c=>'_'+c.toLowerCase()),
endpoint:'/api/v1/'+meta[2]+'/', admin:'/django-admin/'+meta[0].replace('.','/').toLowerCase()+'/',
validation:'Exact scientific text; nullable unavailable properties; explicit foreign keys; no unit conversion.',
provenance:'SourceReference + EntitySource; original import row retained.' });
}
}
for (const file of ['src/types/index.ts', 'src/data/schemas/canonicalSchemas.ts', 'src/data/repositories/sharedRepository.ts', 'src/stores/workspaceStore.ts']) {
source = program.getSourceFile(path.resolve(file));
for (const node of source.statements) if (ts.isInterfaceDeclaration(node)) fields(node.members, '', node.name.text);
}
fs.writeFileSync('docs/frontend-field-inventory.json', JSON.stringify(rows, null, 2));
const header = Object.keys(rows[0]);
const csv = value => '"'+String(value).replaceAll('"','""')+'"';
fs.writeFileSync('docs/frontend-field-inventory.csv', [header.map(csv).join(','), ...rows.map(row=>header.map(key=>csv(row[key])).join(','))].join('\n'));
console.log(rows.length+' frontend fields inventoried. Canonical aliases and normalized storage are described in BACKEND_MAPPING.md.');
snapshot.dispose(); api.close();
