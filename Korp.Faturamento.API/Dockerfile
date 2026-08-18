FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Korp.Faturamento.API/Korp.Faturamento.API.csproj", "Korp.Faturamento.API/"]
RUN dotnet restore "Korp.Faturamento.API/Korp.Faturamento.API.csproj"

COPY . .
# Remove integration test sources that reference test-only packages to avoid build failures inside the image
RUN rm -f Korp.Faturamento.API/IntegrationTests.cs || true
RUN dotnet publish "Korp.Faturamento.API/Korp.Faturamento.API.csproj" -c Release -o /app/publish /p:EnableTrimmed=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5164
EXPOSE 5164

ENTRYPOINT ["dotnet", "Korp.Faturamento.API.dll"]
