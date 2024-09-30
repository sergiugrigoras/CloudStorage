#node build
FROM node:current-alpine3.20 AS node
WORKDIR /app
COPY ./ClientApp/package*.json ./
RUN npm install
COPY ./ClientApp .
RUN npm run build

# dotnet build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS base
WORKDIR /app
COPY CloudStorage/CloudStorage.csproj .
RUN dotnet restore
COPY CloudStorage.sln .
COPY ./CloudStorage ./CloudStorage
RUN dotnet publish -c Release -o /app/publish

# serve stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
VOLUME /app/database
VOLUME /app/storage
RUN apt-get update -qq && apt-get install ffmpeg -y
ARG JWT_KEY
ARG GEMINI_URL
ARG GEMINI_KEY
ENV ASPNETCORE_URLS=http://+:5000
ENV CloudStorage_Jwt__key=$JWT_KEY
ENV CloudStorage_Jwt__lifetime=5
ENV CloudStorage_Jwt__issuer="http://localhost"
ENV CloudStorage_Storage__Url="/app/storage"
ENV CloudStorage_Storage__Size=5368709120
ENV CloudStorage_Database__Sqlite="/app/database/cloud-storage.db"
ENV CloudStorage_GeminiAPI__Url=$GEMINI_URL
ENV CloudStorage_GeminiAPI__Key=$GEMINI_KEY
WORKDIR /app
COPY --from=base /app/publish .
COPY --from=node /app/dist/browser ./wwwroot
EXPOSE 5000
ENTRYPOINT [ "dotnet", "CloudStorage.dll" ]