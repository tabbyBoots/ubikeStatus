
using backend.AppCode.AppService;
using System.Net.Security;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel - use environment URLs or fallback to development defaults
if (builder.Environment.IsDevelopment() && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    // Development mode with hardcoded HTTPS port (when not in Docker)
    builder.WebHost.ConfigureKestrel(serverOptions => {
        serverOptions.ListenAnyIP(7135, listenOptions => {
            listenOptions.UseHttps(httpsOptions => {
                httpsOptions.SslProtocols = System.Security.Authentication.SslProtocols.Tls12 | 
                                          System.Security.Authentication.SslProtocols.Tls13;
            });
        });
    });
}
// For Production/Docker, rely on ASPNETCORE_URLS environment variable

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

app.UseHttpsRedirection();

app.UseCors("AllowVueApp");

// Serve static files (for production Docker deployment)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// Fallback for SPA routing - serve index.html for non-API routes
app.MapFallbackToFile("index.html");

app.Run();
