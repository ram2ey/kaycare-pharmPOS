// ============================================================
//  KayCare PharmPOS — Azure Infrastructure (single-file, Portal-deployable)
//  Region: South Africa North
//  Target: F1 Free App Service + Serverless SQL (free offer) + Free Static Web App
//  Estimated cost: ~$1.50/month (Storage + Key Vault only)
// ============================================================

targetScope = 'resourceGroup'

@description('Short environment tag: dev | staging | prod')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Base name used for all resources (lowercase, no spaces)')
param appName string = 'pharmpos'

@description('Azure region for all resources')
param location string = 'southafricanorth'

@description('SQL Server administrator login')
param sqlAdminLogin string = 'pharmpOS_admin'

@description('SQL Server administrator password — supplied at deploy time')
@secure()
param sqlAdminPassword string

@description('JWT signing key — supplied at deploy time')
@secure()
param jwtKey string

// ── Derived names ─────────────────────────────────────────────
var prefix        = '${appName}-${environment}'
var kvName        = '${prefix}-kv'
var sqlServerName = '${prefix}-sql'
var sqlDbName     = 'PharmPOSDb'
var storageName   = replace('${appName}${environment}stor', '-', '')
var appPlanName   = '${prefix}-plan'
var apiAppName    = '${prefix}-api'
var staticWebName = '${prefix}-web'

// ── Key Vault ─────────────────────────────────────────────────
resource kv 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name:     kvName
  location: location
  properties: {
    sku: {
      family: 'A'
      name:   'standard'
    }
    tenantId:                   tenant().tenantId
    enableRbacAuthorization:    true
    enableSoftDelete:           true
    softDeleteRetentionInDays:  7
  }
}

resource secretSqlPassword 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: kv
  name:   'SqlAdminPassword'
  properties: { value: sqlAdminPassword }
}

resource secretJwtKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: kv
  name:   'JwtKey'
  properties: { value: jwtKey }
}

var connString = 'Server=tcp:${sqlServerName}${az.environment().suffixes.sqlServerHostname},1433;Initial Catalog=${sqlDbName};Persist Security Info=False;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

resource secretConnString 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: kv
  name:   'DefaultConnection'
  properties: { value: connString }
}

resource secretBlobConn 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: kv
  name:   'BlobStorageConnection'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
  }
}

// ── SQL Server + Database (Serverless GP, free offer) ─────────
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name:     sqlServerName
  location: location
  properties: {
    administratorLogin:         sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion:          '1.2'
    publicNetworkAccess:        'Enabled'
  }

  resource azureFirewallRule 'firewallRules' = {
    name: 'AllowAzureServices'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress:   '0.0.0.0'
    }
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent:   sqlServer
  name:     sqlDbName
  location: location
  sku: {
    name:     'GP_S_Gen5_1'
    tier:     'GeneralPurpose'
    family:   'Gen5'
    capacity: 1
  }
  properties: {
    collation:                   'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes:                34359738368
    autoPauseDelay:              60
    minCapacity:                 json('0.5')
    useFreeLimit:                true
    freeLimitExhaustionBehavior: 'AutoPause'
  }
}

// ── Blob Storage (LRS) ────────────────────────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name:     storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier:               'Hot'
    allowBlobPublicAccess:    false
    minimumTlsVersion:        'TLS1_2'
    supportsHttpsTrafficOnly: true
    encryption: {
      services: {
        blob: { enabled: true }
        file: { enabled: true }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name:   'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days:    7
    }
  }
}

// ── App Service Plan (F1 Free) + API Web App ──────────────────
var kvBaseUri           = 'https://${kvName}${az.environment().suffixes.keyvaultDns}/secrets'
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource appPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name:     appPlanName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource apiApp 'Microsoft.Web/sites@2023-01-01' = {
  name:     apiAppName
  location: location
  kind:     'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appPlan.id
    httpsOnly:    true
    siteConfig: {
      linuxFxVersion:  'DOTNETCORE|8.0'
      alwaysOn:        false
      ftpsState:       'Disabled'
      minTlsVersion:   '1.2'
      appSettings: [
        {
          name:  'ASPNETCORE_ENVIRONMENT'
          value: environment == 'prod' ? 'Production' : 'Development'
        }
        {
          name:  'Jwt__Key'
          value: '@Microsoft.KeyVault(SecretUri=${kvBaseUri}/JwtKey/)'
        }
        {
          name:  'Jwt__Issuer'
          value: 'PharmPOS'
        }
        {
          name:  'Jwt__Audience'
          value: 'PharmPOS'
        }
        {
          name:  'Jwt__ExpiryHours'
          value: '8'
        }
        {
          name:  'BlobStorage__ConnectionString'
          value: '@Microsoft.KeyVault(SecretUri=${kvBaseUri}/BlobStorageConnection/)'
        }
        {
          name:  'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      connectionStrings: [
        {
          name:             'DefaultConnection'
          connectionString: '@Microsoft.KeyVault(SecretUri=${kvBaseUri}/DefaultConnection/)'
          type:             'SQLAzure'
        }
      ]
    }
  }
  dependsOn: [kv, sqlServer, storageAccount]
}

resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name:  guid(kv.id, apiApp.id, kvSecretsUserRoleId)
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId:      apiApp.identity.principalId
    principalType:    'ServicePrincipal'
  }
}

// ── Static Web App (Free tier) ────────────────────────────────
resource staticWeb 'Microsoft.Web/staticSites@2023-01-01' = {
  name:     staticWebName
  location: 'eastus2'
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates:   true
    buildProperties: {
      appLocation:     'frontend'
      outputLocation:  'dist'
      appBuildCommand: 'npm run build'
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────
output apiUrl               string = 'https://${apiApp.properties.defaultHostName}'
output staticWebUrl         string = 'https://${staticWeb.properties.defaultHostname}'
output keyVaultName         string = kvName
output sqlServerFqdn        string = sqlServer.properties.fullyQualifiedDomainName
@secure()
output staticWebDeployToken string = staticWeb.listSecrets().properties.apiKey
