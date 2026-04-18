# KayCare PharmPOS — Azure Deployment Guide

## Prerequisites
- Azure account with an active subscription
- Azure CLI installed, OR use Azure Cloud Shell at shell.azure.com
- .NET 8 SDK installed locally (for running migrations)
- Git access to this repo

---

## Step 1 — Create Resource Group

In Azure Portal → Resource groups → Create:
- **Name:** `kaycare-pharmpos-rg`
- **Region:** South Africa North (or your preferred region)

---

## Step 2 — Deploy Infrastructure (Bicep)

1. Go to Azure Portal → search **"Deploy a custom template"**
2. Click **"Build your own template in the editor"**
3. Paste the contents of `infrastructure/bicep/main-consolidated.bicep`
4. Click **Save**
5. Fill in:
   - **Resource group:** `kaycare-pharmpos-rg`
   - **Sql Admin Password:** a strong password (save it — you'll need it for migrations)
   - **Jwt Key:** a long random string (e.g. 64 random characters)
   - Leave other params as defaults
6. Click **Review + Create → Create**

Wait ~3 minutes for all resources to deploy.

**Deployed resources:**
| Resource | Name |
|---|---|
| App Service Plan | `pharmpos-prod-plan` |
| App Service (API) | `pharmpos-prod-api` |
| SQL Server | `pharmpos-prod-sql` |
| SQL Database | `PharmPOSDb` |
| Blob Storage | `pharmposprodstor` |
| Key Vault | `pharmpos-prod-kv` |
| Static Web App | `pharmpos-prod-web` |

---

## Step 3 — Fix Connection String (Key Vault workaround)

Key Vault references sometimes don't resolve on first deploy. Set the connection string directly:

1. Go to `pharmpos-prod-api` App Service → **Environment variables** → **Connection strings**
2. Add:
   - **Name:** `DefaultConnection`
   - **Value:** `Server=tcp:pharmpos-prod-sql.database.windows.net,1433;Initial Catalog=PharmPOSDb;User ID=pharmpos_admin;Password=YOUR_PASSWORD;Encrypt=True;Connection Timeout=30;`
   - **Type:** `SQLAzure`
3. Click **Apply → Save**

---

## Step 4 — Allow Your IP to Access SQL

1. Go to `pharmpos-prod-sql` SQL Server → **Networking**
2. Under Firewall rules → **Add your client IP**
3. Click **Save**

---

## Step 5 — Apply EF Migrations

Run from the repo root on your local machine:

```bash
# Set the Azure connection string as an env var
$env:ConnectionStrings__DefaultConnection = "Server=tcp:pharmpos-prod-sql.database.windows.net,1433;Initial Catalog=PharmPOSDb;User ID=pharmpos_admin;Password=YOUR_PASSWORD;Encrypt=True;Connection Timeout=30;TrustServerCertificate=False;"

dotnet ef database update --project src/PharmPOS.Infrastructure --startup-project src/PharmPOS.API
```

---

## Step 6 — Seed Demo Data

Update `tools/Seeder/appsettings.json` with the Azure connection string, then:

```bash
cd tools/Seeder && dotnet run
```

This creates:
- Demo tenant (tenant code: `demo`)
- Admin user: `admin@demo.com` / `Admin@1234`

---

## Step 7 — Connect GitHub Actions (CI/CD)

### Backend (App Service)
1. Go to `pharmpos-prod-api` App Service → **Get publish profile** (download)
2. Go to GitHub → `kaycare-pharmPOS` repo → **Settings → Secrets → Actions**
3. Add secret: `AZURE_WEBAPP_PUBLISH_PROFILE` → paste the XML content

### Frontend (Static Web App)
1. Go to `pharmpos-prod-web` Static Web App → **Manage deployment token** → copy
2. Add GitHub secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` → paste the token

### Trigger first deploy
Push any change to `main`, or go to **Actions** → run the workflow manually.

---

## Step 8 — Update Frontend API URL

In `frontend/.env.production`, set:
```
VITE_API_URL=https://pharmpos-prod-api.azurewebsites.net/api
```

Commit and push — the frontend workflow will rebuild and redeploy.

---

## Done

- **API:** https://pharmpos-prod-api.azurewebsites.net/swagger
- **Frontend:** shown in Static Web App overview page
