# ── Stage 1: Build & Publish ──────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and project files for layer caching
COPY PharmPOS.sln .
COPY src/PharmPOS.API/PharmPOS.API.csproj src/PharmPOS.API/
COPY src/PharmPOS.Core/PharmPOS.Core.csproj src/PharmPOS.Core/
COPY src/PharmPOS.Infrastructure/PharmPOS.Infrastructure.csproj src/PharmPOS.Infrastructure/

RUN dotnet restore PharmPOS.sln

# Copy remaining source code and publish
COPY src/ src/
RUN dotnet publish src/PharmPOS.API/PharmPOS.API.csproj -c Release -o /out --no-restore

# ── Stage 2: Production Runtime ───────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /out .

ENTRYPOINT ["dotnet", "PharmPOS.API.dll"]
