
using backend.AppCode.AppService;
using System.Net.Security;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on HTTPS port 7135 with development certificate
builder.WebHost.ConfigureKestrel(serverOptions => {
    serverOptions.ListenAnyIP(7135, listenOptions => {
        listenOptions.UseHttps(httpsOptions => {
            httpsOptions.SslProtocols = System.Security.Authentication.SslProtocols.Tls12 | 
                                      System.Security.Authentication.SslProtocols.Tls13;
        });
    });
});

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
            .WithOrigins("http://localhost:5173") // Vite default port
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
app.UseAuthorization();
app.MapControllers();

app.Run();
