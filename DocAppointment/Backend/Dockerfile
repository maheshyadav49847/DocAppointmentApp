FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files first to cache dependencies
COPY ["CodeX.slnx", "./"]
COPY ["CodeX.Api/CodeX.Api.csproj", "CodeX.Api/"]
COPY ["CodeX.Application/CodeX.Application.csproj", "CodeX.Application/"]
COPY ["CodeX.Domain/CodeX.Domain.csproj", "CodeX.Domain/"]
COPY ["CodeX.Infrastructure/CodeX.Infrastructure.csproj", "CodeX.Infrastructure/"]
COPY ["CodeX.Tests/CodeX.Tests.csproj", "CodeX.Tests/"]

RUN dotnet restore "CodeX.Api/CodeX.Api.csproj"

# Copy the remaining source code
COPY . .
WORKDIR "/src/CodeX.Api"

# Publish the application
RUN dotnet publish "CodeX.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Expose the port the API runs on
EXPOSE 8080

ENTRYPOINT ["dotnet", "CodeX.Api.dll"]
