# Environment Configuration

## 1. Edge Function Secrets (Supabase Dashboard)

Navigate to: **Project Settings → Edge Functions → Secrets**

| Secret | Value |
|--------|-------|
| `SMTP_HOST` | `smtp.gmail.com` (or your SMTP host) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your email |
| `SMTP_PASS` | App password |
| `SMTP_FROM` | `noreply@yourcompany.com` |

## 2. Supabase Vault Secrets (For RPC Functions)

The RPC functions that invoke edge functions require secrets stored in Supabase Vault. This allows PostgreSQL functions to make HTTP requests to edge functions.

### Setting Up Vault Secrets

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Insert your Supabase URL
SELECT vault.create_secret(
  'https://your-project-ref.supabase.co',
  'supabase_url',
  'Supabase project URL'
);

-- Insert your Service Role Key
SELECT vault.create_secret(
  'your-service-role-key',
  'service_role_key',
  'Supabase service role key for edge function authentication'
);
```

### Verifying Vault Secrets

```sql
-- Check if secrets are configured
SELECT name, description FROM vault.decrypted_secrets 
WHERE name IN ('supabase_url', 'service_role_key');
```

### Important Notes

1. **Service Role Key**: Never expose this key in client-side code. It has full access to your database.
2. **Vault Access**: Only `SECURITY DEFINER` functions with proper permissions can access vault secrets.
3. **Edge Function URL**: The URL format is `{supabase_url}/functions/v1/{function-name}`.

## 3. Local Development (.env.local)

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: For local testing
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. Required Extensions

The following PostgreSQL extensions are used:

- **pg_cron**: For scheduled jobs (automations)
- **pg_net**: For making HTTP requests from PostgreSQL
- **supabase_vault**: For secure secret storage

These are enabled automatically via the migration file.

## 5. Edge Functions Deployment

```bash
supabase functions deploy send-email --no-verify-jwt
```