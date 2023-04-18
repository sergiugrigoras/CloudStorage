# build stage
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS base
WORKDIR /app

RUN curl -sL https://deb.nodesource.com/setup_18.x |  bash -
RUN apt-get install -y nodejs

COPY CloudStorage/CloudStorage.csproj .
RUN dotnet restore
COPY . .
COPY *.json ./CloudStorage
RUN dotnet publish -c Release -o /app/publish

# serve stage
FROM mcr.microsoft.com/dotnet/aspnet:7.0
ENV ASPNETCORE_URLS=http://+:5000
WORKDIR /app
COPY --from=base /app/publish .
ENTRYPOINT [ "dotnet", "CloudStorage.dll" ]