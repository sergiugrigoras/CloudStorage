#node build
FROM node:20.11.0-alpine3.19 AS node
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
RUN apt-get update -qq && apt-get install ffmpeg -y
ARG JWTKEY
ENV ASPNETCORE_URLS=http://+:5000
ENV CloudStorage_Jwt__key=$JWTKEY
ENV CloudStorage_Jwt__lifetime=5
ENV CloudStorage_Jwt__issuer="http://localhost"
ENV CloudStorage_Storage__Url="/app/storage"
ENV CloudStorage_Storage__Size=5368709120
ENV CloudStorage_Database__Sqlite="/app/database/cloud-storage.db"
WORKDIR /app
COPY --from=base /app/publish .
COPY --from=node /app/dist ./wwwroot
ENTRYPOINT [ "dotnet", "CloudStorage.dll" ]