# Supabase Schema — uhome (Draft)

## users
- id (uuid, primary key)
- email (text, unique)
- role (text: 'landlord' | 'tenant')
- created_at (timestamp)
- updated_at (timestamp)

## properties
- id (uuid, primary key)
- owner_id (uuid, foreign key -> users.id)
- name (text)
- address (text, optional)
- rent_amount (numeric)
- rent_due_date (integer, day of month)
- rules (text, optional)
- created_at (timestamp)
- updated_at (timestamp)

## tenants
- id (uuid, primary key)
- user_id (uuid, foreign key -> users.id)
- property_id (uuid, foreign key -> properties.id)
- move_in_date (date)
- lease_end_date (date, optional)
- created_at (timestamp)
- updated_at (timestamp)

## maintenance_requests
- id (uuid, primary key)
- property_id (uuid, foreign key -> properties.id)
- tenant_id (uuid, foreign key -> tenants.id)
- status (text: 'pending' | 'in_progress' | 'completed')
- category (text, optional)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

## documents
- id (uuid, primary key)
- property_id (uuid, foreign key -> properties.id)
- uploaded_by (uuid, foreign key -> users.id)
- file_url (text)
- file_name (text)
- file_type (text, optional)
- created_at (timestamp)

## rent_records
- id (uuid, primary key)
- property_id (uuid, foreign key -> properties.id)
- tenant_id (uuid, foreign key -> tenants.id)
- amount (numeric)
- due_date (date)
- status (text: 'pending' | 'paid' | 'overdue')
- paid_date (date, optional)
- created_at (timestamp)
- updated_at (timestamp)

