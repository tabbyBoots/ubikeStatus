
using backend.AppCode.AppService;
using System.Net.Security;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure allowed hosts from environment variable
// var allowedHosts = Environment.GetEnvironmentVariable("ALLOWED_HOSTS");
// if (!string.IsNullOrEmpty(allowedHosts))
// {
//     builder.Configuration["AllowedHosts"] = allowedHosts;
// }

// Configure Kestrel - use environment URLs or fallback to development defaults
if (builder.Environment.IsDevelopment() && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))

{
    // Development mode with HTTP only when ASPNETCORE_URLS is not set
    builder.WebHost.ConfigureKestrel(serverOptions => {
        serverOptions.ListenAnyIP(5001); // HTTP only in development
    });
}
// In production or when ASPNETCORE_URLS is set, let the framework handle the configuration
// This allows Docker and other deployment scenarios to control the ports via environment variables

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHttpClient<uBikeService>();
builder.Services.AddEndpointsApiExplorer();

// Configure OpenAPI with metadata
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "uBike Station API",
            Version = "v1",
            Description = "API for retrieving Taipei uBike station information including availability, location, and status data.",
            Contact = new OpenApiContact
            {
                Name = "uBike API Support",
                Email = "support@example.com"
            }
        };
        return Task.CompletedTask;
    });
});

// Add CORS with environment-specific configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp", corsBuilder =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development: Allow localhost ports for Vite and Google Maps API
            corsBuilder
                .WithOrigins(
                    "http://localhost:5173",  // Vite dev server
                    "https://localhost:5173", // Vite dev server HTTPS
                    "http://localhost:3000",  // Alternative dev port
                    "https://localhost:3000"  // Alternative dev port HTTPS
                )
                .WithMethods("GET", "POST", "OPTIONS") // Specific methods only
                .WithHeaders(
                    "Content-Type",
                    "Accept",
                    "Authorization",
                    "X-Requested-With"
                )
                .AllowCredentials();
        }
        else
        {
            // Production: More restrictive CORS
            var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(',') 
                ?? new[] { "https://localhost:8443", "http://localhost:8080" };
            
            corsBuilder
                .WithOrigins(allowedOrigins)
                .WithMethods("GET", "OPTIONS") // API is read-only
                .WithHeaders(
                    "Content-Type",
                    "Accept",
                    "X-Requested-With"
                )
                .AllowCredentials();
        }
    });
});



var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options
            .WithTitle("uBike Station API")
            .WithTheme(ScalarTheme.Purple)
            .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

// Enable HTTPS redirection only in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowVueApp");

// Serve static files (for production Docker deployment)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// Fallback for SPA routing - serve index.html for non-API routes
app.MapFallbackToFile("index.html");

app.Run();
