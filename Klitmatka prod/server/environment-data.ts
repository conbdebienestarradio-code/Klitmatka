export interface SeedTable {
  table: string;
  columns: string[];
  rows: unknown[][];
}

export const libraryTables: SeedTable[] = [
  {
    table: "source_library",
    columns: ["source_id", "source_title", "author_org", "publication_year", "doi_or_url", "reliability_tier"],
    rows: [
      ["SRC-001", "Estimación Interna Preliminar Venezuela", "SW Environmental Engineering", 2026, "Internal Registry", "TIER_3_ESTIMATE"],
      ["SRC-002", "EPA eGRID 2023 Summary Tables", "US EPA", 2024, "https://www.epa.gov/egrid", "TIER_1_OFFICIAL"],
      ["SRC-003", "DEFRA Greenhouse Gas Reporting: Conversion Factors 2024", "UK Government (DESNZ)", 2024, "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024", "TIER_1_OFFICIAL"],
      ["SRC-004", "IPCC Sixth Assessment Report (AR6) - Chapter 7", "IPCC", 2021, "https://www.ipcc.ch/assessment-report/ar6/", "TIER_1_OFFICIAL"],
      ["SRC-005", "Factor de Emisión del Sistema Interconectado Nacional de Colombia", "UPME", 2023, "https://www.upme.gov.co", "TIER_1_OFFICIAL"],
      ["SRC-006", "Directrices para los Inventarios Nacionales de Gases de Efecto Invernadero - Vol. 5 Residuos", "IPCC", 2006, "https://www.ipcc-nggip.iges.or.jp", "TIER_1_OFFICIAL"],
      ["SRC-007", "World Steel Association Life Cycle Inventory Data", "World Steel", 2023, "https://worldsteel.org", "TIER_1_OFFICIAL"],
      ["SRC-008", "Ecoinvent Database v3.9", "Ecoinvent Association", 2023, "https://ecoinvent.org", "TIER_1_OFFICIAL"],
      ["SRC-009", "EMEP/EEA air pollutant emission inventory guidebook 2023", "EEA", 2023, "https://www.eea.europa.eu", "TIER_1_OFFICIAL"],
    ],
  },
  {
    table: "gwp_library",
    columns: ["gwp_id", "gas_name", "chemical_formula", "context", "gwp_ar4", "gwp_ar5", "gwp_ar6", "source_reference"],
    rows: [
      ["GWP-001", "Dióxido de carbono", "CO2", "Referencia", 1, 1, 1, "IPCC AR6 Table 7.SM.7"],
      ["GWP-002", "Metano", "CH4", "Combustión y biogénico", 25, 28, 27, "IPCC AR6; Factor Library"],
      ["GWP-003", "Metano", "CH4", "Fugitivo fósil / proceso", null, null, 29.8, "IPCC AR6; Factor Library"],
      ["GWP-004", "Óxido nitroso", "N2O", "Referencia", 298, 265, 273, "IPCC AR6 Table 7.SM.7"],
      ["GWP-005", "HFC-134a", "CH2FCF3", "Refrigerante", 1430, 1300, 1530, "IPCC AR6 Table 7.SM.7"],
      ["GWP-006", "R-410A", "Blend", "Refrigerante", 2088, 1924, 2256, "IPCC AR6 Table 7.SM.7"],
    ],
  },
  {
    table: "unit_library",
    columns: ["unit_id", "unit_code", "unit_name", "dimension", "base_unit", "conversion_factor_to_base"],
    rows: [
      ["UN-001", "kg", "Kilogramo", "Masa", "kg", 1],
      ["UN-002", "t", "Tonelada métrica", "Masa", "kg", 1000],
      ["UN-003", "g", "Gramo", "Masa", "kg", 0.001],
      ["UN-004", "kWh", "Kilovatio-hora", "Energía", "kWh", 1],
      ["UN-005", "MWh", "Megavatio-hora", "Energía", "kWh", 1000],
      ["UN-006", "liter", "Litro", "Volumen", "liter", 1],
      ["UN-007", "m3", "Metro cúbico", "Volumen", "liter", 1000],
      ["UN-008", "km", "Kilómetro", "Distancia", "km", 1],
      ["UN-009", "tkm", "Tonelada-kilómetro", "Transporte", "tkm", 1],
      ["UN-010", "unit", "Unidad", "Conteo", "unit", 1],
      ["UN-011", "Wh", "Vatio-hora", "Energía", "kWh", 0.001],
      ["UN-012", "GJ", "Gigajulio", "Energía", "kWh", 277.7777778],
      ["UN-013", "MJ", "Megajulio", "Energía", "kWh", 0.277777778],
      ["UN-014", "gal US", "Galón estadounidense", "Volumen", "liter", 3.785411784],
    ],
  },
  {
    table: "conversion_library",
    columns: ["conversion_id", "from_unit", "to_unit", "multiplier", "description"],
    rows: [
      ["CNV-001", "t", "kg", 1000, "Conversión de toneladas a kilogramos"],
      ["CNV-002", "MWh", "kWh", 1000, "Conversión de MWh a kWh"],
      ["CNV-003", "m3", "liter", 1000, "Conversión de metros cúbicos a litros"],
      ["CNV-004", "g", "kg", 0.001, "Conversión de gramos a kilogramos"],
      ["CNV-005", "Wh", "kWh", 0.001, "Conversión de Wh a kWh"],
      ["CNV-006", "GJ", "kWh", 277.7777778, "Conversión de GJ a kWh"],
      ["CNV-007", "MJ", "kWh", 0.277777778, "Conversión de MJ a kWh"],
      ["CNV-008", "gal US", "liter", 3.785411784, "Conversión de galón estadounidense a litros"],
    ],
  },
  {
    table: "electricity_library",
    columns: ["elec_id", "grid_code", "country_region", "year", "ef_co2_kg_kwh", "ef_ch4_g_kwh", "ef_n2o_g_kwh", "status", "source_id", "notes", "data_quality_tier", "uncertainty_pct"],
    rows: [
      ["ELC-001", "VE_INTERCONECTADA", "Venezuela (Nacional)", 2024, 0.485, 0.012, 0.002, "PENDIENTE_VALIDACION_OFICIAL", "SRC-001", "Estimación preliminar sujeta a revisión oficial por ausencia de inventario público actualizado.", "Tier 3", 20],
      ["ELC-002", "US_CAMX", "Estados Unidos (CAMX)", 2023, 0.000295, 0.00001, 0.000002, "VIGENTE", "SRC-002", "EPA eGrid subregion CAMX factor.", "Tier 1", 5],
      ["ELC-003", "CO_NATIONAL", "Colombia (Nacional)", 2023, 0.165, 0.004, 0.001, "VIGENTE", "SRC-005", "UPME factor oficial Colombia.", "Tier 1", 5],
    ],
  },
  {
    table: "fuel_library",
    columns: ["fuel_id", "fuel_code", "fuel_name", "default_unit", "density_kg_l", "ncv_gj_unit", "co2_factor_kg_unit", "ch4_factor_g_unit", "n2o_factor_g_unit", "status", "source_id"],
    rows: [
      ["FUE-001", "DIESEL_GENERIC", "Gasóleo / Diésel Automotriz", "liter", 0.84, 0.043, 2.6878, 0.23, 0.004, "VIGENTE", "SRC-003"],
      ["FUE-002", "GASOLINE_GENERIC", "Gasolina Automotriz Regular", "liter", 0.745, 0.0342, 2.315, 0.38, 0.008, "VIGENTE", "SRC-003"],
      ["FUE-003", "NATGAS_INDUSTRIAL", "Gas Natural Industrial", "m3", 0.75, 0.038, 1.912, 0.05, 0.0001, "VIGENTE", "SRC-003"],
      ["FUE-004", "FO_HEAVY", "Fuel Oil #6 (Bunker)", "liter", 0.98, 0.0404, 3.114, 0.12, 0.005, "VIGENTE", "SRC-003"],
    ],
  },
  {
    table: "factor_library",
    columns: ["factor_id", "factor_code", "factor_name", "category", "scope", "unit", "value_co2e", "gwp_source", "geography", "status", "source_id", "valid_from", "valid_to", "data_quality_tier", "uncertainty_pct"],
    rows: [
      ["FAC-001", "GRID_VE_2024", "Electricidad Red Interconectada Nacional (VE)", "ELECTRICITY", "Scope 2", "kWh", 0.485, "IPCC AR6 (100-yr)", "VE", "PENDIENTE_VALIDACION_OFICIAL", "SRC-001", "2024-01-01", "2026-12-31", "Tier 3", 25],
      ["FAC-002", "GRID_US_CAMX_2023", "Electricity CAMX subregion (US)", "ELECTRICITY", "Scope 2", "kWh", 0.000295, "IPCC AR6 (100-yr)", "US-CAMX", "VIGENTE", "SRC-002", "2023-01-01", "2026-12-31", "Tier 1", 5],
      ["FAC-003", "DIESEL_STATIONARY_DEFRA", "Gasóleo / Diesel Estacionario (DEFRA)", "FUEL", "Scope 1", "liter", 2.6878, "IPCC AR6 (100-yr)", "UK/Global", "VIGENTE", "SRC-003", "2024-01-01", "2026-12-31", "Tier 1", 5],
      ["FAC-004", "GASOLINE_VE_EST", "Gasolina Automotriz (Estimación Base VE)", "FUEL", "Scope 1", "liter", 2.315, "IPCC AR6 (100-yr)", "VE", "PENDIENTE_VALIDACION_OFICIAL", "SRC-001", "2024-01-01", "2026-12-31", "Tier 1", 5],
      ["FAC-005", "R134A_GWP", "Refrigerante R-134a", "REFRIGERANT", "Scope 1", "kg", 1430, "IPCC AR6 (100-yr)", "Global", "VIGENTE", "SRC-004", "2021-01-01", "2030-12-31", "Tier 1", 5],
    ],
  },
  {
    table: "refrigerant_library",
    columns: ["ref_id", "refrigerant_code", "chemical_name", "gwp_100yr", "ods_potential", "safety_group", "status", "source_id"],
    rows: [
      ["REF-001", "R-134a", "1,1,1,2-Tetrafluoroethane", 1430, 0, "A1", "VIGENTE", "SRC-004"],
      ["REF-002", "R-410A", "Blend (R-32 / R-125)", 2088, 0, "A1", "VIGENTE", "SRC-004"],
      ["REF-003", "R-717", "Amoniaco Anhidro", 0, 0, "B2L", "VIGENTE", "SRC-004"],
      ["REF-004", "R-404A", "Blend (R-125 / R-143a / R-134a)", 3922, 0, "A1", "VIGENTE", "SRC-004"],
      ["REF-005", "R-22", "Chlorodifluoromethane (HCFC)", 1810, 0.055, "A1", "OBSOLETO_MONTREAL", "SRC-004"],
    ],
  },
  {
    table: "transport_library",
    columns: ["trans_id", "mode_code", "mode_name", "vehicle_type", "fuel_type", "load_factor_pct", "ef_per_tkm_kgco2e", "ef_per_pkm_kgco2e", "status", "source_id"],
    rows: [
      ["TRN-001", "ROAD_HDT_DIESEL", "Camión Pesado (>32t)", "Heavy Duty Truck", "Diesel", 50, 0.0685, 0, "VIGENTE", "SRC-003"],
      ["TRN-002", "ROAD_MDT_DIESEL", "Camión Mediano (3.5t-7.5t)", "Medium Duty", "Diesel", 50, 0.215, 0, "VIGENTE", "SRC-003"],
      ["TRN-003", "AIR_DOM_MKT", "Avión Comercial (Doméstico)", "Aircraft", "Jet Kerosene", 80, 0, 0.185, "VIGENTE", "SRC-003"],
      ["TRN-004", "SEA_CONTAINER", "Buque Portacontenedores", "Cargo Ship", "Fuel Oil", 70, 0.015, 0, "VIGENTE", "SRC-003"],
    ],
  },
  {
    table: "waste_material",
    columns: ["waste_mat_id", "material_code", "material_name", "default_density_kg_m3", "recyclability_potential", "biodegradability", "status", "source_id"],
    rows: [
      ["WST-001", "MSW_ORGANIC", "Residuo Orgánico / Compostable", 500, "ALTO", "ALTA", "VIGENTE", "SRC-006"],
      ["WST-002", "MSW_PLASTIC_PET", "Plástico PET Post-Consumo", 100, "ALTO", "NULA", "VIGENTE", "SRC-006"],
      ["WST-003", "MSW_PAPER_CARD", "Papel y Cartón", 150, "ALTO", "MEDIA", "VIGENTE", "SRC-006"],
      ["WST-004", "HAZ_OIL_SLUDGE", "Lodos Oleosos Industriales", 950, "BAJO", "NULA", "VIGENTE", "SRC-006"],
    ],
  },
  {
    table: "waste_destination",
    columns: ["dest_id", "destination_code", "destination_name", "ef_kgco2e_per_kg", "methane_recovery", "status", "source_id"],
    rows: [
      ["DST-001", "LANDFILL_UNCONTROLLED", "Vertedero a Cielo Abierto (Típico VE)", 1.25, "NO", "PENDIENTE_VALIDACION_OFICIAL", "SRC-001"],
      ["DST-002", "LANDFILL_CONTROLLED_FLARE", "Vertedero Controlado con Quema de Biogás", 0.58, "SI", "VIGENTE", "SRC-003"],
      ["DST-003", "RECYCLING", "Reciclaje / Aprovechamiento Material", -0.45, "NO", "VIGENTE", "SRC-003"],
      ["DST-004", "COMPOSTING", "Compostaje Aeróbico", 0.05, "NO", "VIGENTE", "SRC-003"],
      ["DST-005", "INCINERATION", "Incineración sin Recuperación de Energía", 0.95, "NO", "VIGENTE", "SRC-003"],
    ],
  },
  {
    table: "water_library",
    columns: ["water_id", "process_code", "process_name", "ef_supply_kgco2e_m3", "ef_treatment_kgco2e_m3", "status", "source_id"],
    rows: [
      ["WTR-001", "MUNICIPAL_SUPPLY", "Suministro Agua Potable Municipal", 0.344, 0, "VIGENTE", "SRC-003"],
      ["WTR-002", "WW_TREATMENT_CENTRAL", "Tratamiento de Aguas Residuales Centralizado", 0, 0.708, "VIGENTE", "SRC-003"],
      ["WTR-003", "DESALINATION_RO", "Desalación por Osmosis Inversa", 3.2, 0, "VIGENTE", "SRC-003"],
    ],
  },
  {
    table: "material_library",
    columns: ["mat_id", "material_code", "material_name", "embodied_carbon_kgco2e_kg", "recycled_content_default_pct", "status", "source_id"],
    rows: [
      ["MAT-001", "STEEL_PRIMARY", "Acero Virgen (BOF)", 2.3, 5, "VIGENTE", "SRC-007"],
      ["MAT-002", "STEEL_RECYCLED", "Acero Reciclado (EAF)", 0.6, 90, "VIGENTE", "SRC-007"],
      ["MAT-003", "ALUMINUM_PRIMARY", "Aluminio Primario", 16.5, 10, "VIGENTE", "SRC-007"],
      ["MAT-004", "CEMENT_OPC", "Cemento Portland Ordinario", 0.85, 0, "VIGENTE", "SRC-007"],
      ["MAT-005", "CONCRETE_25MPA", "Concreto 25 MPa", 0.13, 0, "VIGENTE", "SRC-007"],
    ],
  },
  {
    table: "packaging_library",
    columns: ["pkg_id", "packaging_code", "packaging_name", "material_type", "avg_weight_g", "recyclable", "status", "source_id"],
    rows: [
      ["PKG-001", "PET_BOTTLE_500ML", "Botella PET 500ml", "PET", 18.5, "SI", "VIGENTE", "SRC-008"],
      ["PKG-002", "HDPE_JUG_5L", "Envase HDPE 5 Litros", "HDPE", 145, "SI", "VIGENTE", "SRC-008"],
      ["PKG-003", "CORRUGATED_BOX_MED", "Caja de Cartón Corrugado Mediana", "Papel/Cartón", 320, "SI", "VIGENTE", "SRC-008"],
      ["PKG-004", "LDPE_FILM_WRAP", "Película Stretch LDPE", "LDPE", 45, "SI", "VIGENTE", "SRC-008"],
    ],
  },
  {
    table: "air_pollutants",
    columns: ["pollutant_id", "pollutant_code", "pollutant_name", "cas_number", "toxicity_weight_factor", "status", "source_id"],
    rows: [
      ["POL-001", "SO2", "Dióxido de Azufre", "7446-09-5", 1, "VIGENTE", "SRC-009"],
      ["POL-002", "NOX", "Óxidos de Nitrógeno", "11104-93-1", 1, "VIGENTE", "SRC-009"],
      ["POL-003", "PM10", "Material Particulado PM10", "N/A", 1.5, "VIGENTE", "SRC-009"],
      ["POL-004", "VOC", "Compuestos Orgánicos Volátiles", "N/A", 1.2, "VIGENTE", "SRC-009"],
      ["POL-005", "CO", "Monóxido de Carbono", "630-08-0", 0.5, "VIGENTE", "SRC-009"],
    ],
  },
  {
    table: "thresholds",
    columns: ["threshold_id", "parameter_category", "metric_name", "warning_limit", "critical_limit", "unit", "action_required"],
    rows: [
      ["THR-001", "ELECTRICITY", "Consumo energético mensual", 50000, 100000, "kWh", "Auditoría energética obligatoria"],
      ["THR-002", "EMISSIONS", "Emisiones Scope 1 mensuales", 100, 500, "tCO2e", "Reporte a gerencia ambiental"],
      ["THR-003", "WATER", "Consumo de agua industrial", 2000, 5000, "m3", "Revisión de fugas y sistemas de recirculación"],
      ["THR-004", "WASTE", "Generación de residuos peligrosos", 5, 20, "t", "Verificación de manifiesto de disposición final"],
    ],
  },
  {
    table: "methodology_version",
    columns: ["component", "standard_reference", "version", "description", "compliance"],
    rows: [
      ["GHG Protocol Corporate Standard", "WBCSD / WRI", "Revised Edition", "Estándar corporativo de contabilidad y reporte de GEI", "COMPLIANT"],
      ["ISO 14064-1", "ISO", "2018", "Especificación para cuantificación e informe organizacional de GEI", "COMPLIANT"],
      ["ISO 14040 / 14044", "ISO", "2006 / Amendment 2020", "Gestión ambiental — Análisis de ciclo de vida", "COMPLIANT"],
      ["IPCC AR6 Methodology", "IPCC", "2021", "Potenciales de calentamiento global a 100 años", "COMPLIANT"],
    ],
  },
  {
    table: "validation_rules",
    columns: ["rule_id", "target_table", "field_name", "rule_type", "rule_expression", "error_message"],
    rows: [
      ["VD-001", "ACTIVITY", "activity_unit", "EXISTS", "unit_code exists in UNIT_LIBRARY", "La unidad debe existir en la biblioteca."],
      ["VD-002", "ACTIVITY", "reporting_period", "PERIOD", "YYYY-MM; start <= end", "El período informado no es válido."],
      ["VD-003", "ACTIVITY", "activity_value", "RANGE", "value >= 0 and finite", "La magnitud debe ser un número finito no negativo."],
      ["VD-004", "ACTIVITY", "activity_unit", "DIMENSION", "unit dimension matches category", "La unidad no corresponde a la variable."],
      ["VD-005", "ACTIVITY", "source_reference", "REQUIRED", "source reference is present", "Todo dato debe incluir fuente."],
      ["VD-006", "ACTIVITY", "quality", "REQUIRED", "all five DQ dimensions are present", "Debe asignarse calidad al dato."],
      ["VD-007", "CALCULATION", "factor_id", "REQUIRED", "factor snapshot is present", "El cálculo debe identificar su factor."],
      ["VD-008", "ACTIVITY", "geography", "MATCH", "factor applies to geography", "El factor no corresponde a la geografía seleccionada."],
      ["VD-009", "FACTOR", "year", "REQUIRED", "reference year is present", "El factor debe tener año de referencia."],
      ["VD-010", "FACTOR", "valid_from", "PERIOD", "factor valid for reporting period", "El factor no es vigente para el período."],
      ["VD-011", "ACTIVITY", "source_reference", "DUPLICATE", "source/category/facility/period is unique", "Esta fuente ya fue contabilizada en el período."],
      ["VD-012", "ACTIVITY", "facility_id", "REQUIRED", "facility boundary is identified", "Debe identificarse la instalación del perímetro."],
      ["VD-013", "ACTIVITY", "reporting_period", "COMPLETENESS", "missing periods are identified", "El período presenta información incompleta."],
      ["VD-014", "ACTIVITY", "source_type", "ESTIMATE", "estimates are explicitly labeled", "El dato estimado debe quedar marcado como tal."],
      ["VD-015", "CALCULATION", "conversion_factor", "TRACE", "normalization factor is retained", "Debe conservarse el factor de conversión."],
      ["VAL-001", "FACTOR_LIBRARY", "value_co2e", "RANGE", "value_co2e >= 0 except documented credits", "El factor de emisión CO2e no puede ser negativo salvo créditos documentados."],
      ["VAL-002", "ELECTRICITY_LIBRARY", "ef_co2_kg_kwh", "RANGE", "0 <= ef_co2_kg_kwh <= 3.0", "Factor de electricidad fuera de rango técnico realista."],
      ["VAL-003", "FUEL_LIBRARY", "density_kg_l", "RANGE", "0 < density_kg_l < 2.0", "Densidad de combustible inválida."],
      ["VAL-004", "REFRIGERANT_LIBRARY", "gwp_100yr", "RANGE", "gwp_100yr >= 0", "El GWP no puede ser negativo."],
    ],
  },
  {
    table: "fallback_rules",
    columns: ["fallback_id", "target_category", "primary_condition", "fallback_action", "fallback_value_or_source", "justification"],
    rows: [
      ["FBK-001", "ELECTRICITY", "Country factor unavailable or PENDIENTE_VALIDACION_OFICIAL", "USAR_GLOBAL_DEFAULT", "IPCC_GLOBAL_GRID_AVERAGE_0.45_KG", "Evita bloqueo del motor ante falta de dato nacional oficial."],
      ["FBK-002", "FUEL", "Fuel density not reported", "USAR_DEFRA_DEFAULT", "DEFRA_FUEL_DEFAULT_TABLE", "Permite estimación volumétrica estándar basada en masa o volumen."],
      ["FBK-003", "WASTE", "Final waste destination unknown", "ASUMIR_PEOR_CASO", "DST-001", "Principio de precaución ambiental y conservadurismo en cálculo de huella."],
    ],
  },
  {
    table: "engine_formulas",
    columns: ["module_id", "module_name", "scope_category", "input_variables", "formula_expression", "output_metric", "governing_standard"],
    rows: [
      ["MOD-001", "Combustión Fija / Móvil", "Scope 1", "activity_value, unit_conversion_factor, co2_ef, ch4_ef, n2o_ef, gwp_ch4, gwp_n2o", "activity × (CO2 + CH4 × GWP_CH4 / 1000 + N2O × GWP_N2O / 1000) / 1000", "tCO2e", "GHG Protocol / IPCC AR6"],
      ["MOD-002", "Electricidad Comprada", "Scope 2", "activity_value_kwh, grid_ef_co2, grid_ef_ch4, grid_ef_n2o, gwp_ch4, gwp_n2o", "(kWh / 1000) × (CO2 + CH4 × GWP_CH4 / 1000 + N2O × GWP_N2O / 1000)", "tCO2e", "GHG Protocol Scope 2 Guidance"],
      ["MOD-003", "Transporte y Logística", "Scope 3 / Direct", "distance_or_mass, load_factor, ef_per_tkm_or_pkm", "activity × factor", "tCO2e", "GHG Protocol Scope 3 Guidance"],
      ["MOD-004", "Gestión de Residuos", "Scope 3 / Waste", "waste_mass_kg, destination_ef_kgco2e_kg", "(mass_kg × destination_factor) / 1000", "tCO2e", "IPCC Guidelines Vol 5 / ISO 14064"],
      ["MOD-005", "Consumo de Agua", "Water Footprint", "water_volume_m3, supply_ef, treatment_ef", "volume_m3 × (supply_ef + treatment_ef)", "kgCO2e", "ISO 14046"],
      ["MOD-006", "Circularidad y Materiales", "LCA / Materials", "material_mass_kg, embodied_carbon_factor, recycled_content_pct", "(mass_kg × factor × (1 - recycled_pct / 100)) / 1000", "tCO2e", "ISO 14040/14044"],
    ],
  },
  {
    table: "data_quality_matrix",
    columns: ["tier_level", "precision_score", "completeness_score", "temporal_score", "geographical_score", "overall_dqi_rating", "description"],
    rows: [
      ["Tier 1", 5, 5, 5, 5, "ALTA", "Datos primarios medidos o factores oficiales nacionales vigentes."],
      ["Tier 2", 4, 4, 3, 4, "MEDIA-ALTA", "Facturación, estimaciones secundarias o factores regionales proxy."],
      ["Tier 3", 2, 3, 2, 2, "PRELIMINAR / ESTIMADO", "Estimaciones internas o factores globales por ausencia de dato nacional."],
    ],
  },
  {
    table: "recommendation_engine",
    columns: ["rec_id", "domain_category", "finding_trigger", "probable_cause", "opportunity", "recommended_action", "indicative_investment", "timeframe", "priority", "venezuela_availability", "payback_months"],
    rows: [
      ["REC-001", "ELECTRICITY", "Consumo energético > THR-001", "Ineficiencia en climatización o iluminación obsoleta.", "Reducción de costos operativos y huella de Alcance 2.", "Automatización BMS y sustitución a iluminación LED industrial.", "Media ($10k - $30k)", "0-90 días", "ALTA", "Disponible bajo evaluación local", null],
      ["REC-002", "WASTE", "Disposición en vertedero a cielo abierto (DST-001)", "Ausencia de infraestructura formal de reciclaje y separación en origen.", "Valorización de subproductos y cumplimiento normativo.", "Segregación en fuente y alianza con gestores certificados.", "Baja (< $5k)", "3-6 meses", "MEDIA", "Requiere validar gestor local", null],
      ["REC-003", "FUEL", "Emisiones de flota elevadas (Scope 1)", "Rutas no optimizadas y falta de mantenimiento preventivo.", "Optimización de combustible y reducción de emisiones.", "Software de ruteo y telemetría vehicular.", "Media ($10k - $25k)", "6-12 meses", "ALTA", "Disponible bajo evaluación local", null],
      ["REC-004", "WATER", "Consumo hídrico industrial elevado (WTR-001)", "Fugas no detectadas y ausencia de recirculación.", "Disminución de costos por tarifas de suministro y tratamiento.", "Medidores sectorizados y planta de tratamiento interna.", "Alta (> $30k)", "12-36 meses", "MEDIA", "Requiere validación de proveedores locales", null],
    ],
  },
  {
    table: "reporting_roadmap",
    columns: ["phase_code", "phase_name", "time_horizon", "core_objectives", "key_milestones", "deliverable_output"],
    rows: [
      ["PH-1", "Línea Base y Diagnóstico Rápido", "0 - 90 días", "Inventario inicial y cálculo con factores actuales.", "Validar fuentes; calcular Scope 1 y 2; identificar puntos críticos.", "Reporte de Línea Base GES e Inventario Inicial de Factores."],
      ["PH-2", "Eficiencia Operativa y Quick Wins", "3 - 6 meses", "Oportunidades de bajo costo y alta rentabilidad.", "Meta guía: reducción eléctrica 10% y desvío de residuos a reciclaje 30%.", "Plan de Acción de Mejora Continua y Reducción de Costos."],
      ["PH-3", "Optimización Tecnológica y Logística", "6 - 12 meses", "Automatización, telemetría y modernización de equipos.", "Optimizar rutas; instalar inversores y variadores de frecuencia.", "Informe de Sostenibilidad Anual y Auditoría de Procesos."],
      ["PH-4", "Circularidad Integral y Neutralidad", "12 - 36 meses", "Economía circular, materiales bajos en carbono y compensación.", "Cierre de ciclo y metas de descarbonización.", "Estrategia Corporativa Hacia Net-Zero y Certificación ISO 14064."],
    ],
  },
];

export const libraryTableCount = 24;
