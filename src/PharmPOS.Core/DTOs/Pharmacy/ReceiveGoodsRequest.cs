namespace PharmPOS.Core.DTOs.Pharmacy;

public class ReceiveGoodsRequest
{
    public List<ReceiveGoodsItemRequest> Items { get; set; } = [];
}

public class ReceiveGoodsItemRequest
{
    public Guid PurchaseOrderItemId { get; set; }
    public int  QuantityReceived    { get; set; }
}
