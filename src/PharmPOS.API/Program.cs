using System.Text;
using PharmPOS.Core.Exceptions;
using PharmPOS.Infrastructure;
using PharmPOS.Infrastructure.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Infrastructure (DbContext, services, tenant context) ──────────────────────
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();

// JWT Key validation
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey.StartsWith("REPLACE_WITH"))
{
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException("Jwt:Key is not securely configured for Production environment.");
    }
    jwtKey = "Development_Only_Secret_Key_For_PharmPOS_Min_32_Chars!";
}

// ── JWT Authentication ────────────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer   = true,
            ValidIssuer      = builder.Configuration["Jwt:Issuer"] ?? "PharmPOS",
            ValidateAudience = true,
            ValidAudience    = builder.Configuration["Jwt:Audience"] ?? "PharmPOS",
            ValidateLifetime = true,
            ClockSkew        = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS (Dynamic origin support for Render static apps & local dev) ─────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

var renderExternalUrl = builder.Configuration["RENDER_EXTERNAL_URL"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;

            var uri = new Uri(origin);
            if (uri.Host == "localhost" || uri.Host.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase))
                return true;

            if (!string.IsNullOrEmpty(renderExternalUrl) && origin.Equals(renderExternalUrl, StringComparison.OrdinalIgnoreCase))
                return true;

            return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// ── Swagger with Bearer token support ────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "PharmPOS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Enter: Bearer {token}",
        Name        = "Authorization",
        In          = ParameterLocation.Header,
        Type        = SecuritySchemeType.ApiKey,
        Scheme      = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            []
        }
    });
});

var app = builder.Build();

// ── Health Check Endpoint for Render Load Balancers ──────────────────────────
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

// ── Global exception handler ──────────────────────────────────────────────────
app.UseExceptionHandler(errApp =>
{
    errApp.Run(async context =>
    {
        var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.ContentType = "application/json";
        context.Response.StatusCode  = ex switch
        {
            AppException appEx => appEx.StatusCode,
            _                  => 500
        };
        await context.Response.WriteAsJsonAsync(new
        {
            error = ex?.Message ?? "An unexpected error occurred."
        });
    });
});

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors();

// Tenant must be resolved before authentication so TenantId is in scope
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Exposed for WebApplicationFactory in integration tests
public partial class Program { }
