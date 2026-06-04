-- Store property suburb at capture time for geocode QA (detect later property edits)

alter table market_intelligence.market_data_records
  add column if not exists captured_property_suburb text,
  add column if not exists captured_property_city text;

update market_intelligence.market_data_records
set
  captured_property_suburb = suburb,
  captured_property_city = city
where captured_property_suburb is null;
