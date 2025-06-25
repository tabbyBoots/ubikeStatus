# Frontend build stage
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /app/backend
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet publish -c Release -o out

# Generate development certificate in SDK stage
# Use build arg for certificate password (REQUIRED - no default for security)
ARG SSL_CERT_PASSWORD
RUN dotnet dev-certs https -ep /app/backend/aspnetapp.pfx -p ${SSL_CERT_PASSWORD} --trust

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app

# Copy application files
COPY --from=backend-build /app/backend/out ./
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Create directory for certificates and copy from build stage
RUN mkdir -p /https
COPY --from=backend-build /app/backend/aspnetapp.pfx /https/aspnetapp.pfx

# Expose both HTTP and HTTPS ports
EXPOSE 8080 8443

ENTRYPOINT ["dotnet", "backend.dll"]
