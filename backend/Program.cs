
using backend.AppCode.AppService;
using System.Net.Security;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel - use HTTP in development, respect ASPNETCORE_URLS in production
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

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp",
        builder => builder
            .WithOrigins("http://localhost:5173") // Vite ports
            .AllowAnyMethod()
            .AllowAnyHeader());
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
