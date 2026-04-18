using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PharmPOS.Infrastructure.Services;

public class SaleReceiptService : ISaleReceiptService
{
    private readonly AppDbContext             _db;
    private readonly ITenantContext           _tenantContext;
    private readonly IFacilitySettingsService _facility;

    public SaleReceiptService(AppDbContext db, ITenantContext tenantContext, IFacilitySettingsService facility)
    {
        _db            = db;
        _tenantContext = tenantContext;
        _facility      = facility;
    }

    public async Task<byte[]?> GenerateReceiptAsync(Guid saleId, CancellationToken ct)
    {
        var sale = await _db.Sales
            .Include(s => s.SoldBy)
            .Include(s => s.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SaleId == saleId, ct);

        if (sale is null) return null;

        var facilityInfo = await _facility.GetAsync(ct);
        var facilityName = facilityInfo?.FacilityName
            ?? (await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.TenantId == _tenantContext.TenantId, ct))?.TenantName
            ?? "Pharmacy";
        var logoBytes = await _facility.GetLogoBytesAsync(ct);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A5);
                page.MarginHorizontal(1.5f, Unit.Centimetre);
                page.MarginVertical(1.2f, Unit.Centimetre);
                page.DefaultTextStyle(t => t.FontSize(9).FontFamily("Arial"));

                page.Header().Column(header =>
                {
                    header.Item().AlignCenter().Column(col =>
                    {
                        if (logoBytes != null)
                            col.Item().AlignCenter().MaxWidth(60).MaxHeight(30).Image(logoBytes);

                        col.Item().AlignCenter().Text(facilityName)
                           .FontSize(13).Bold().FontColor(Colors.Green.Darken3);

                        if (!string.IsNullOrWhiteSpace(facilityInfo?.Address))
                            col.Item().AlignCenter().Text(facilityInfo.Address)
                               .FontSize(7.5f).FontColor(Colors.Grey.Darken1);

                        if (!string.IsNullOrWhiteSpace(facilityInfo?.Phone))
                            col.Item().AlignCenter().Text(facilityInfo.Phone)
                               .FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                    });

                    header.Item().PaddingTop(8).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);

                    header.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text(sale.SaleNumber).FontSize(10).Bold().FontColor(Colors.Green.Darken3);
                            col.Item().Text($"Date: {sale.SaleDate:dd MMM yyyy  HH:mm}").FontSize(8).FontColor(Colors.Grey.Darken1);
                            col.Item().Text($"Cashier: {sale.SoldBy?.FirstName} {sale.SoldBy?.LastName}").FontSize(8).FontColor(Colors.Grey.Darken1);
                        });
                        row.ConstantItem(100).AlignRight().Column(col =>
                        {
                            col.Item().Text("RECEIPT").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                            if (sale.CustomerName != "Walk-in")
                                col.Item().Text(sale.CustomerName).FontSize(8).FontColor(Colors.Grey.Darken1);
                            else
                                col.Item().Text("Walk-in").FontSize(8).FontColor(Colors.Grey.Lighten1).Italic();
                        });
                    });

                    header.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);
                });

                page.Content().PaddingTop(8).Column(content =>
                {
                    // Items table
                    content.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(3);    // drug
                            cols.RelativeColumn(1);    // qty
                            cols.RelativeColumn(1.2f); // unit
                            cols.RelativeColumn(1.4f); // total
                        });

                        static IContainer HeaderCell(IContainer c) =>
                            c.Background(Colors.Grey.Lighten3).Padding(4);

                        table.Header(h =>
                        {
                            h.Cell().Element(HeaderCell).Text("Item").FontSize(8).Bold();
                            h.Cell().Element(HeaderCell).AlignCenter().Text("Qty").FontSize(8).Bold();
                            h.Cell().Element(HeaderCell).AlignRight().Text("Unit").FontSize(8).Bold();
                            h.Cell().Element(HeaderCell).AlignRight().Text("Total").FontSize(8).Bold();
                        });

                        var itemList = sale.Items.ToList();
                        for (var idx = 0; idx < itemList.Count; idx++)
                        {
                            var item = itemList[idx];
                            var bg   = idx % 2 == 0 ? Colors.White : Colors.Grey.Lighten5;

                            IContainer DataCell(IContainer c) =>
                                c.Background(bg).PaddingVertical(3).PaddingHorizontal(4);

                            var label = item.DrugName +
                                (string.IsNullOrWhiteSpace(item.Strength) ? "" : $" {item.Strength}");

                            table.Cell().Element(DataCell).Text(label).FontSize(8);
                            table.Cell().Element(DataCell).AlignCenter().Text(item.Quantity.ToString()).FontSize(8);
                            table.Cell().Element(DataCell).AlignRight().Text(item.UnitPrice.ToString("N2")).FontSize(8);
                            table.Cell().Element(DataCell).AlignRight().Text(item.TotalPrice.ToString("N2")).FontSize(8).Bold();
                        }
                    });

                    content.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);

                    // Totals block
                    content.Item().PaddingTop(4).Column(totals =>
                    {
                        void TotalRow(string label, string value, bool bold = false, string? color = null)
                        {
                            totals.Item().Row(row =>
                            {
                                var left  = row.RelativeItem().Text(label).FontSize(9);
                                var right = row.ConstantItem(90).AlignRight().Text(value).FontSize(9);
                                if (bold)   { left.Bold(); right.Bold(); }
                                if (color != null) right.FontColor(color);
                            });
                        }

                        TotalRow("Subtotal", sale.TotalAmount.ToString("N2"));

                        if (sale.DiscountAmount > 0)
                            TotalRow("Discount", $"- {sale.DiscountAmount:N2}", color: Colors.Red.Darken1);

                        var net = sale.TotalAmount - sale.DiscountAmount;
                        TotalRow("TOTAL", net.ToString("N2"), bold: true);
                        TotalRow($"Paid ({sale.PaymentMethod})", sale.PaidAmount.ToString("N2"));

                        if (sale.Change > 0)
                            TotalRow("Change", sale.Change.ToString("N2"));
                    });

                    if (sale.IsVoided)
                    {
                        content.Item().PaddingTop(8)
                            .Background(Colors.Red.Lighten4)
                            .Padding(6)
                            .Text($"VOIDED \u2014 {sale.VoidReason}")
                            .FontSize(8).Bold().FontColor(Colors.Red.Darken2);
                    }
                });

                page.Footer().PaddingTop(6).Column(footer =>
                {
                    footer.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);
                    footer.Item().PaddingTop(4).AlignCenter()
                        .Text("Thank you for your purchase!")
                        .FontSize(8).Italic().FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();
    }
}
