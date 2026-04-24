create temporary table tmp_table_counts(table_name text, row_count bigint);

do select count(*) as total_users from auth.users;
declare
  r record;
  c bigint;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('schema_migrations')
    order by tablename
  loop
    execute format('select count(*) from public.%I', r.tablename) into c;
    insert into tmp_table_counts(table_name, row_count) values (r.tablename, c);
  end loop;
end select count(*) as total_users from auth.users;;

select table_name, row_count from tmp_table_counts order by table_name;
select count(*) as non_empty_tables from tmp_table_counts where row_count > 0;
