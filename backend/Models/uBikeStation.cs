using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class uBikeStation
{
    [JsonPropertyName("sno")]
    [Display(Name = "站點編號")]
    public required string Sno { get; set; }

    [JsonPropertyName("sna")]
    [Display(Name = "站點名稱")]
    public required string Sna { get; set; }

    [JsonPropertyName("Quantity")]
    [Display(Name = "總車位數")]
    public required int Total { get; set; }

    [JsonPropertyName("available_rent_bikes")]
    [Display(Name = "可借車位數")]
    public required int AvailableRentBikes { get; set; }

    [JsonPropertyName("sarea")]
    [Display(Name = "場站區域")]
    public required string Area { get; set; }

    [JsonPropertyName("mday")]
    [Display(Name = "資料更新時間")]
    public required string UpdateTime { get; set; }

    [JsonPropertyName("latitude")]
    [Display(Name = "緯度")]
    public required double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    [Display(Name = "經度")]
    public required double Longitude { get; set; }

    [JsonPropertyName("ar")]
    [Display(Name = "地址")]
    public required string Address { get; set; }

    [JsonPropertyName("available_return_bikes")]
    [Display(Name = "空位數量")]
    public required int AvailableReturnBikes { get; set; }

    [JsonPropertyName("act")]
    [Display(Name = "全站禁用狀態")]
    public required int Act { get; set; }
}
