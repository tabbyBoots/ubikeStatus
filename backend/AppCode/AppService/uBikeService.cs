using System.Net.Http;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace backend.AppCode.AppService;

public class uBikeService
{
    private readonly HttpClient _httpClient;
    private const string ApiUrl = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json";

    public uBikeService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<uBikeStation>> GetStationsAsync()
    {
        try
        {
            var stations = await _httpClient.GetFromJsonAsync<List<uBikeStation>>(ApiUrl);
            return stations ?? new List<uBikeStation>();
        }
        catch (HttpRequestException httpEx)
        {
            Console.WriteLine($"HTTP Request Error: {httpEx.Message}");
            if (httpEx.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {httpEx.InnerException.Message}");
            }
            throw; 
        }
        catch (System.Text.Json.JsonException jsonEx)
        {
            Console.WriteLine($"JSON Deserialization Error: {jsonEx.Message}");
            Console.WriteLine($"JSON Path: {jsonEx.Path}");
            Console.WriteLine($"JSON LineNumber: {jsonEx.LineNumber}");
            Console.WriteLine($"JSON BytePositionInLine: {jsonEx.BytePositionInLine}");
            throw; 
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An unexpected error occurred: {ex.Message}");
            throw; 
        }
    }

    public async Task<List<uBikeStation>> GetStationsByAreaAsync(string area)
    {
        var stations = await GetStationsAsync();
        return stations.Where(s => s.Area == area).ToList();
    }

}
