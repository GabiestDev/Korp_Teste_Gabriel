FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Korp.Estoque.API/Korp.Estoque.API.csproj", "Korp.Estoque.API/"]
RUN dotnet restore "Korp.Estoque.API/Korp.Estoque.API.csproj"

COPY . .
RUN dotnet publish "Korp.Estoque.API/Korp.Estoque.API.csproj" -c Release -o /app/publish /p:EnableTrimmed=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5090
EXPOSE 5090

ENTRYPOINT ["dotnet", "Korp.Estoque.API.dll"]
