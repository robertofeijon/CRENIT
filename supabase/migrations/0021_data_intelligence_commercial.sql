-- CRENIT Data Intelligence: commercial product copy for B2B property market data

UPDATE market_intelligence.report_products
SET
  display_name = 'Suburb Rental Intelligence Report',
  description = 'Licensed PDF + structured data for one suburb: verified rent bands, bedroom splits, on-time payment trends, and income-to-rent distribution. For estate agents, developers, and investors setting asking rent.',
  updated_at = now()
WHERE report_type = 'suburb_report';

UPDATE market_intelligence.report_products
SET
  display_name = 'Windhoek City Rental Overview',
  description = 'City-wide suburb ranking — verified rent levels, payment discipline, and trend direction for banks, government, and institutional landlords.',
  updated_at = now()
WHERE report_type = 'city_overview';

UPDATE market_intelligence.report_products
SET
  display_name = 'Lender Rental Risk Pack',
  description = 'Underwriting suburb pack: on-time payment rates, late incidence, and income-to-rent bands for rental-backed credit facilities.',
  updated_at = now()
WHERE report_type = 'lender_risk_pack';

UPDATE market_intelligence.report_products
SET
  display_name = 'Development Feasibility Pack',
  description = 'Target-suburb feasibility data: verified rent range, trend, bedroom mix returns, and payment reliability for new-build pro formas.',
  updated_at = now()
WHERE report_type = 'development_feasibility';
