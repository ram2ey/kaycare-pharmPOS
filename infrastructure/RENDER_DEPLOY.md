# KayCare PharmPOS — Render Deployment Guide

This guide walks you through deploying **KayCare PharmPOS** (Backend API, Managed PostgreSQL Database, and Frontend React App) on [Render.com](https://render.com) using Render's Infrastructure-as-Code **Blueprints**.

---

## Prerequisites
- A **Render.com** account.
- Git repository pushed to **GitHub** or **GitLab**.

---

## Quick Deploy via Render Blueprint (Recommended)

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub / GitLab repository containing `kaycare-pharmpos`.
4. Render will automatically detect `render.yaml` at the root of the repository.
5. Review the resources to be created:
   - **`pharmpos-db`** (Managed PostgreSQL Database)
   - **`pharmpos-api`** (Web Service — Dockerized .NET 8 API)
   - **`pharmpos-web`** (Static Site — React Vite Frontend)
6. Click **Apply**.

Render will automatically provision the PostgreSQL database, containerize and build the API, build the frontend SPA, and wire all connection strings and secrets together.

---

## Environment Variables & Configuration

Render manages the following environment variables automatically via `render.yaml`:

| Resource | Environment Variable | Value / Source |
|---|---|---|
| **`pharmpos-api`** | `DATABASE_URL` | Automatically populated from `pharmpos-db` connection string |
| **`pharmpos-api`** | `Jwt__Key` | Automatically generated secret string |
| **`pharmpos-api`** | `Cors__AllowedOrigins__0` | Automatically populated from `pharmpos-web` URL |
| **`pharmpos-web`** | `VITE_API_URL` | Automatically populated from `pharmpos-api` URL + `/api` |

### Optional Blob Storage (For File Uploads & Receipts)
If using Azure Blob Storage for receipts or drug image storage:
1. Go to `pharmpos-api` Web Service in Render → **Environment**.
2. Add secret key: `BlobStorage__ConnectionString` with your Azure Storage connection string.

---

## Database Migrations

When the backend container starts up on Render, you can execute Entity Framework Core migrations to create database tables and seed demo data:

### Method A — Run from Local Machine against Render DB
1. Get the External Database URL from `pharmpos-db` on Render dashboard.
2. Run from your local terminal:
```powershell
$env:DATABASE_URL = "postgres://pharmpos_user:PASSWORD@host.oregon-postgres.render.com/pharmpos"
dotnet ef database update --project src/PharmPOS.Infrastructure --startup-project src/PharmPOS.API
```

### Method B — Seed Initial Demo Data
Run the seeder tool pointing to the Render database connection string:
```powershell
cd tools/Seeder
dotnet run --ConnectionStrings:DefaultConnection="Host=host.oregon-postgres.render.com;Database=pharmpos;Username=pharmpos_user;Password=PASSWORD;SSL Mode=Require;"
```

Default seeded admin login:
- **Tenant Code:** `demo`
- **Email:** `admin@demo.com`
- **Password:** `Admin@1234`

---

## Health Monitoring & Zero-Downtime Deploys

- **Health Check Endpoint:** `https://pharmpos-api.onrender.com/health`
- **Swagger Documentation:** `https://pharmpos-api.onrender.com/swagger`

Render periodically pings `/health` to verify container health before switching traffic during zero-downtime redeployments.
