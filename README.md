# KayCare PharmPOS — Retail Pharmacy Point-of-Sale System

KayCare PharmPOS is a multi-tenant SaaS point-of-sale (POS) and inventory management solution engineered specifically for retail pharmacies and healthcare dispensing centers. It combines real-time counter sales, barcode scanning, pharmaceutical stock tracking, supplier order management, and daily financial reconciliation into a streamlined, high-speed interface.

---

## Technical Stack

### Backend Architecture
- **Framework**: ASP.NET Core 8.0 Web API
- **Language**: C# 12
- **Data Access & ORM**: Entity Framework Core 8.0
- **Database Engine**: Azure SQL / PostgreSQL (with multi-tenant schema isolation)
- **Authentication**: JWT Bearer token authentication with role permissions (Cashier, Pharmacist, Store Manager, Admin)

### Frontend Workspace
- **Framework**: React 18 / 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React Context API & React Query

---

## Core Features

- **Point of Sale (POS) Counter**: Rapid checkout processing, barcode reader integration, discount calculations, multiple payment method acceptance (Cash, Card, Mobile Payment, Insurance), and digital receipt printing.
- **Inventory & Stock Management**: Real-time batch-level drug stock deduction, expiry date tracking, low-stock threshold notifications, and inventory audit logs.
- **Formulary & Pricing Control**: Centralized catalog management, drug classification, price tiering, and prescription-only vs. over-the-counter (OTC) enforcement.
- **Supplier & Purchasing Lifecycle**: Purchase order generation, Goods Received Notes (GRN), vendor catalog management, and reorder point automation.
- **Shift & Till Reconciliation**: Cashier session management, opening/closing till balancing, end-of-day sales reporting, and audit trails.

---

## Repository Structure

```
kaycare-pharmpos/
├── frontend/                  # React + TypeScript single-page application
├── infrastructure/            # Bicep, Docker, and Render deployment scripts
│   ├── AUDIT_REPORT.md        # Technical architecture audit notes
│   ├── DEPLOY.md              # Azure deployment guide
│   └── RENDER_DEPLOY.md       # Render platform deployment guide
├── src/
│   ├── PharmPOS.API/          # RESTful Web API endpoints, controllers, middleware
│   ├── PharmPOS.Core/         # Business domain logic, DTOs, models, interfaces
│   └── PharmPOS.Infrastructure/ # EF Core DbContext, migrations, data repositories
├── tests/                     # Unit and integration test suites
├── tools/                     # Utility scripts and setup helpers
├── .env.example               # Environment variables template
├── Dockerfile                 # Multi-stage Docker build configuration
├── PharmPOS.sln               # .NET Solution File
└── render.yaml                # Render service manifest
```

---

## Prerequisites

Ensure the following tools are installed on your environment before setting up the project:

- **.NET 8.0 SDK** or higher
- **Node.js** (v18.0.0 or higher) and **npm** (v9.0.0 or higher)
- **SQL Server** or **PostgreSQL** instance

---

## Getting Started

### 1. Database Configuration
Copy `.env.example` to `.env` or configure `src/PharmPOS.API/appsettings.Development.json` with your database details:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PharmPOSDb;User Id=sa;Password=YourStrongPassword;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Secret": "YOUR_SECRET_JWT_KEY_MINIMUM_64_CHARACTERS_LONG"
  }
}
```

### 2. Backend API Execution

1. Restore backend packages:
   ```bash
   dotnet restore
   ```

2. Run EF Core database updates:
   ```bash
   dotnet ef database update --project src/PharmPOS.Infrastructure --startup-project src/PharmPOS.API
   ```

3. Start the API server:
   ```bash
   dotnet run --project src/PharmPOS.API
   ```

### 3. Frontend Execution

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:5173`.

---

## Deployment & Infrastructure

Detailed guides for deploying KayCare PharmPOS to cloud environments are located in the `infrastructure/` directory:

- [Azure Deployment Guide](file:///c:/Users/asnah/Desktop/KayCare%20Suite/kaycare-pharmpos/infrastructure/DEPLOY.md)
- [Render Deployment Guide](file:///c:/Users/asnah/Desktop/KayCare%20Suite/kaycare-pharmpos/infrastructure/RENDER_DEPLOY.md)
- [Infrastructure Audit Report](file:///c:/Users/asnah/Desktop/KayCare%20Suite/kaycare-pharmpos/infrastructure/AUDIT_REPORT.md)
