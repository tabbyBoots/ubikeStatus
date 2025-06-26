
using Microsoft.AspNetCore.Mvc;
using backend.AppCode.AppService;
using System.ComponentModel.DataAnnotations;

namespace backend.Controllers;

[ApiController]
[Route("api/ubike")]
[Tags("uBike Stations")]
public class uBikeController : Controller
{
    private readonly uBikeService _uBikeService;

    public uBikeController(uBikeService uBikeService)
    {
        _uBikeService = uBikeService;
    }

    /// <summary>
    /// Get all uBike stations
    /// </summary>
    /// <returns>A list of all uBike stations with their current status</returns>
    /// <response code="200">Returns the list of all uBike stations</response>
    /// <response code="500">If there was an internal server error</response>
    [HttpGet]
    [ProducesResponseType<List<uBikeStation>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAllStations()
    {
        try
        {
            var stations = await _uBikeService.GetStationsAsync();
            return Ok(stations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching stations", error = ex.Message });
        }
    }

    /// <summary>
    /// Get uBike stations by area
    /// </summary>
    /// <param name="area">The area name to filter stations by</param>
    /// <returns>A list of uBike stations in the specified area</returns>
    /// <response code="200">Returns the list of uBike stations in the specified area</response>
    /// <response code="400">If the area parameter is invalid</response>
    /// <response code="404">If no stations are found in the specified area</response>
    /// <response code="500">If there was an internal server error</response>
    [HttpGet("area/{area}")]
    [ProducesResponseType<List<uBikeStation>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetStationsByArea([Required] string area)
    {
        if (string.IsNullOrWhiteSpace(area))
        {
            return BadRequest(new { message = "Area parameter cannot be empty" });
        }

        try
        {
            var stations = await _uBikeService.GetStationsByAreaAsync(area);
            
            if (stations == null || !stations.Any())
            {
                return NotFound(new { message = $"No stations found in area: {area}" });
            }
            
            return Ok(stations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching stations by area", error = ex.Message });
        }
    }
}
