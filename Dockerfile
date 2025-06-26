# Frontend build stage
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# Build with Google Maps API key
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# Backend build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /app/backend
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet publish -c Release -o out

# Generate development certificate in SDK stage
RUN dotnet dev-certs https -ep /app/backend/aspnetapp.pfx -p REDACTED_PASSWORD --trust

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
