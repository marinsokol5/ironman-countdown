# Database Operations

## AWS Aurora

AWS Aurora is the preferred database option for production applications.

### Creating Database with CDK

- Use `rds.DatabaseCluster` to create Aurora cluster
- Prefer `DatabaseClusterEngine.auroraPostgres` for engine
- Use `ClusterInstance.serverlessV2` for auto-scaling instances
- Use `Credentials.fromGeneratedSecret` for automatic secret management

### Creating Tables

- Use `lambda.Function` with custom resource for table creation
- Import table schemas via Lambda function on stack deployment
- Use CDK `CustomResource` construct to trigger table creation
- Store table definitions in separate SQL files and read in Lambda

### Lambda Database Access

- Use `@aws-sdk/client-secrets-manager` for credential retrieval
- Cache database connections at module level (outside handler)
- Cache secrets to avoid repeated API calls
- Use connection pooling for high-traffic applications
- Always use parameterized queries to prevent SQL injection
- Handle connection errors with proper retry logic

### Database Connection

- Get database credentials from Secrets Manager using cluster's secret ARN
- Connect using host from `cluster.clusterEndpoint.hostname`
- Use generated username/password from cluster secret
- Default port is 5432 for PostgreSQL
- Install `psql` locally for debugging: `brew install postgresql`
- Connect via: `psql -h <endpoint> -U <username> -d <database>`

## Supabase (Legacy)

This application uses Supabase for existing database tables and authentication.

### Usage Guidelines

- **Continue using existing Supabase tables** - Do not migrate existing data unless specifically asked
- **Do NOT create new tables in Supabase** - Use AWS Aurora for new tables
- **Use Supabase CLI for all interactions** - Never use the web console, execute CLI commands on customer's behalf, only ask for required input

### Supabase CLI Setup

- Login: `npx supabase login`
- Link project: `npx supabase link --project-ref <project-id>`
- Pull schema: `npx supabase db pull` to sync local migrations
- Generate types: `npx supabase gen types typescript --local > types/supabase.ts`

### Database Operations

- Create migrations: `npx supabase migration new <migration-name>`
- Apply migrations: `npx supabase db push`
- Reset database: `npx supabase db reset` (local only)
- View logs: `npx supabase logs db`

