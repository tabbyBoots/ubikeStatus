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
        var response = await _httpClient.GetFromJsonAsync<List<uBikeStation>>(ApiUrl);
        return response ?? new List<uBikeStation>();
    }

    public async Task<List<uBikeStation>> GetStationsByAreaAsync(string area)
    {
        var stations = await GetStationsAsync();
        return stations.Where(s => s.Area == area).ToList();
    }

}
