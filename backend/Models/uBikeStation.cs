using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class uBikeStation
{
    [JsonPropertyName("sno")]
    [Display(Name = "站點編號")]
    public string Sno { get; set; }

    [JsonPropertyName("sna")]
    [Display(Name = "站點名稱")]
    public string Sna { get; set; }

    [JsonPropertyName("total")]
    [Display(Name = "總車位數")]
    public int Total { get; set; }

    [JsonPropertyName("available_rent_bikes")]
    [Display(Name = "可借車位數")]
    public int AvailableRentBikes { get; set; }

    [JsonPropertyName("sarea")]
    [Display(Name = "場站區域")]
    public string Area { get; set; }

    [JsonPropertyName("mday")]
    [Display(Name = "資料更新時間")]
    public string UpdateTime { get; set; }

    [JsonPropertyName("lat")]
    [Display(Name = "緯度")]
    public double Latitude { get; set; }

    [JsonPropertyName("lng")]
    [Display(Name = "經度")]
    public double Longitude { get; set; }

    [JsonPropertyName("ar")]
    [Display(Name = "地址")]
    public string Address { get; set; }

    [JsonPropertyName("available_return_bikes")]
    [Display(Name = "空位數量")]
    public int AvailableReturnBikes { get; set; }

    [JsonPropertyName("act")]
    [Display(Name = "全站禁用狀態")]
    public int Act { get; set; }
}