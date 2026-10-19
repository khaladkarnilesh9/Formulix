# React aliases are explicit; additional original fields are retained in legacy_payload.
ENTITY_CONTRACTS = {
"products": {"model": "products.CommercialProduct", "reference": "product", "fields": {
"brandName": "product_name", "genericName": "generic_name", "activeIngredient": "active_ingredient_text",
"casNumber": "cas_text", "manufacturerName": "manufacturer_text", "formulationType": "formulation_type_text",
"strength": "strength", "registrationStatus": "registration_status", "registrationNumber": "registration_number",
"regulatoryAuthority": "regulatory_authority_text", "dataSource": "data_source", "lastVerifiedDate": "last_verified_text",
"verificationEvidence": "verification_evidence", "description": "description", "indicationsOrPests": "indications_or_pests", "specs": "specifications"},
"relations": {"manufacturerId": "manufacturer", "formulationId": "formulation", "brandId": "brand"},
"labels": {"category": "industry_sector", "country": "jurisdiction"},
"nested": ["composition", "patentIds", "documentIds"]},
"formulations": {"model": "formulations.Formulation", "reference": "formulation", "fields": {
"name": "formulation_name", "formulationType": "formulation_type_text", "intendedApplication": "intended_application",
"targetIndustry": "target_industry", "verificationStatus": "verification_label", "verificationEvidence": "verification_evidence",
"sourceReference": "source_reference"}, "relations": {}, "labels": {"category": "industry_sector"},
"nested": ["composition", "manufacturingInfo", "properties", "patentReferences", "commercialProductIds"]},
"ingredients": {"model": "ingredients.Ingredient", "reference": "ingredient", "fields": {
"name": "preferred_name", "casNumber": "cas_number", "iupacName": "iupac_name", "molecularFormula": "molecular_formula",
"molecularWeight": "molecular_weight", "smiles": "canonical_smiles", "inchiKey": "inchikey", "category": "chemical_class",
"physicalState": "physical_state", "meltingPoint": "melting_point", "boilingPoint": "boiling_point", "waterSolubility": "solubility",
"logP": "logp", "hazardStatements": "hazard_statements", "commercialProductCount": "declared_product_count",
"description": "description", "structureSvgType": "structure_svg_type"}, "relations": {}, "labels": {},
"nested": ["relatedProductIds", "relatedManufacturers"]},
"manufacturers": {"model": "manufacturers.Manufacturer", "reference": "manufacturer", "fields": {
"name": "legal_name", "headquarters": "headquarters", "founded": "year_established", "sector": "sector_labels",
"productCategories": "product_categories", "productCount": "declared_product_count", "website": "website",
"brandPortfolio": "brand_portfolio", "role": "company_type", "overview": "description",
"complianceCertifications": "compliance_information", "aliases":"aliases"}, "relations": {}, "labels": {"country": "country"}, "nested": []},
"brands": {"model": "brands.Brand", "reference": "brand", "fields": {
"brandName": "brand_name", "description": "description", "trademarkStatus": "trademark_status"},
"relations": {"manufacturerId": "manufacturer", "ownerId": "owner"}, "labels": {"country": "country", "category": "industry_sector"}, "nested": []},
"regulatory/registrations": {"model": "regulatory.RegulatoryRegistration", "reference": "registration", "fields": {
"registrationNumber": "registration_number", "productName": "product_text", "activeIngredient": "active_ingredient_text",
"approvalStatus": "approval_status", "registrationHolder": "registration_holder", "approvalDate": "approval_date_text",
"expiryDate": "expiry_date_text", "sourceDocument": "source_reference", "lastVerifiedDate": "last_verified_text",
"officialLink": "source_url"}, "relations": {"productId": "commercial_product"},
"labels": {"regulatoryAuthority": "regulatory_authority", "country": "jurisdiction"}, "nested": []},
"patents": {"model": "patents.Patent", "reference": "patent", "fields": {
"publicationNumber": "publication_number", "applicationNumber": "application_number", "title": "title",
"abstract": "abstract", "applicant": "applicant", "inventors": "inventors", "patentStatus": "patent_status",
"sourceUrl": "source_url"}, "relations": {}, "labels": {"country": "jurisdiction"}, "nested": []},
"documents": {"model": "documents.TechnicalDocument", "reference": "document", "fields": {
"title": "title", "type": "document_type", "documentNumber": "document_number", "issuer": "issuer",
"publicationDate": "publication_date_text", "format": "declared_format", "fileSize": "declared_file_size",
"summary": "description", "sourceUrl": "source_url", "verifiedStatus": "verification_label"},
"relations": {}, "labels": {}, "nested": ["relatedProducts", "relatedIngredients"]},
}
SYSTEM_FIELDS = {"id", "serverId", "publishStatus", "createdAt", "updatedAt", "version",
    "isSyntheticDemo", "verificationState", "sourceTitle", "sourceType", "sourceUrl", "lastVerifiedAt",
    "publicationStatus", "hasFile", "downloadUrl"}
