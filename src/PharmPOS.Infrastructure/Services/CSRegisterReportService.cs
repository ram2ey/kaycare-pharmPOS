using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PharmPOS.Infrastructure.Services;

public class CSRegisterReportService : ICSRegisterReportService
{
    private readonly ITenantContext           _tenantContext;
    private readonly IFacilitySettingsService _facility;
    private readonly AppDbContext             _db;

    public CSRegisterReportService(
        ITenantContext tenantContext,
        IFacilitySettingsService facility,
        AppDbContext db)
    {
        _tenantContext = tenantContext;
        _facility      = facility;
        _db            = db;
    }

    public async Task<byte[]> GenerateAsync(
        List<CSRegisterDrugEntry> entries,
        DateOnly? from,
        DateOnly? to,
        CancellationToken ct)
    {
        var facilityInfo = await _facility.GetAsync(ct);
        var facilityName = facilityInfo?.FacilityName
            ?? (await _db.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == _tenantContext.TenantId, ct))?.TenantName
            ?? "Healthcare Facility";
        var logoBytes = await _facility.GetLogoBytesAsync(ct);

        var period = from.HasValue || to.HasValue
            ? $"{(from.HasValue ? from.Value.ToString("dd-MMM-yyyy") : "All")} \u2013 {(to.HasValue ? to.Value.ToString("dd-MMM-yyyy") : "Present")}"
            : "All dates";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.MarginHorizontal(1.5f, Unit.Centimetre);
                page.MarginVertical(1.2f, Unit.Centimetre);
                page.DefaultTextStyle(t => t.FontSize(8).FontFamily("Arial"));

                page.Header().Column(header =>
                {
                    header.Item().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            if (logoBytes != null)
                                col.Item().MaxWidth(70).MaxHeight(35).Image(logoBytes);
                            col.Item().Text(facilityName)
                               .FontSize(13).Bold().FontColor(Colors.Red.Darken3);
                            if (!string.IsNullOrWhiteSpace(facilityInfo?.Address))
                                col.Item().Text(facilityInfo.Address).FontSize(7).FontColor(Colors.Grey.Darken1);
                        });
                        row.ConstantItem(200).AlignRight().Column(col =>
                        {
                            col.Item().Text("CONTROLLED SUBSTANCE REGISTER")
                               .FontSize(11).Bold().FontColor(Colors.Red.Darken3);
                            col.Item().Text($"Period: {period}").FontSize(8).FontColor(Colors.Grey.Darken1);
                            col.Item().Text($"Generated: {DateTime.Now:dd-MMM-yyyy HH:mm}")
                               .FontSize(7).FontColor(Colors.Grey.Darken1);
                        });
                    });
                    header.Item().PaddingTop(4).LineHorizontal(2).LineColor(Colors.Red.Darken3);
                });

                page.Content().PaddingTop(8).Column(content =>
                {
                    if (entries.Count == 0)
                    {
                        content.Item().PaddingTop(40).AlignCenter()
                            .Text("No controlled substances found.").FontColor(Colors.Grey.Medium);
                        return;
                    }

                    foreach (var drug in entries)
                    {
                        content.Item().PaddingTop(12).Row(row =>
                        {
                            row.RelativeItem().Background(Colors.Red.Lighten4).Padding(5).Column(col =>
                            {
                                col.Item().Text(drug.DrugName).FontSize(10).Bold().FontColor(Colors.Red.Darken3);
                                var sub = string.Join("  \u00b7  ", new[]
                                {
                                    drug.GenericName, drug.DosageForm, drug.Strength,
                                }.Where(s => !string.IsNullOrWhiteSpace(s)));
                                if (!string.IsNullOrWhiteSpace(sub))
                                    col.Item().Text(sub).FontSize(7).FontColor(Colors.Grey.Darken2);
                            });
                            row.ConstantItem(120).AlignRight().Background(Colors.Red.Lighten4).Padding(5)
                               .Column(col =>
                               {
                                   col.Item().Text("Current Stock").FontSize(7).FontColor(Colors.Grey.Darken1);
                                   col.Item().Text(drug.CurrentStock.ToString())
                                      .FontSize(12).Bold().FontColor(Colors.Red.Darken3);
                               });
                        });

                        if (drug.Movements.Count == 0)
                        {
                            content.Item().Padding(4)
                                .Text("No movements in this period.").FontSize(7).FontColor(Colors.Grey.Medium);
                            continue;
                        }

                        content.Item().Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(2);   // Date
                                cols.RelativeColumn(2);   // Type
                                cols.RelativeColumn(1);   // In
                                cols.RelativeColumn(1);   // Out
                                cols.RelativeColumn(1);   // Balance
                                cols.RelativeColumn(1.5f);// Reference
                                cols.RelativeColumn(2.5f);// Notes
                                cols.RelativeColumn(2);   // Recorded By
                            });

                            static IContainer Hdr(IContainer c) =>
                                c.Background(Colors.Grey.Lighten3).Padding(3);
                            static IContainer Cell(IContainer c) =>
                                c.BorderBottom(0.3f).BorderColor(Colors.Grey.Lighten2).Padding(3);

                            table.Header(h =>
                            {
                                h.Cell().Element(Hdr).Text("Date").Bold();
                                h.Cell().Element(Hdr).Text("Movement").Bold();
                                h.Cell().Element(Hdr).Text("In").Bold();
                                h.Cell().Element(Hdr).Text("Out").Bold();
                                h.Cell().Element(Hdr).Text("Balance").Bold();
                                h.Cell().Element(Hdr).Text("Reference").Bold();
                                h.Cell().Element(Hdr).Text("Notes").Bold();
                                h.Cell().Element(Hdr).Text("Recorded By").Bold();
                            });

                            foreach (var m in drug.Movements)
                            {
                                table.Cell().Element(Cell).Text(m.Date.ToLocalTime().ToString("dd-MMM-yyyy HH:mm"));
                                table.Cell().Element(Cell).Text(FormatType(m.MovementType));
                                table.Cell().Element(Cell)
                                     .Text(m.QuantityIn.HasValue ? $"+{m.QuantityIn}" : "")
                                     .FontColor(Colors.Green.Darken2).Bold();
                                table.Cell().Element(Cell)
                                     .Text(m.QuantityOut.HasValue ? $"-{m.QuantityOut}" : "")
                                     .FontColor(Colors.Red.Medium).Bold();
                                table.Cell().Element(Cell).Text(m.Balance.ToString()).Bold();
                                table.Cell().Element(Cell).Text(m.ReferenceType ?? "\u2014").FontColor(Colors.Grey.Darken1);
                                table.Cell().Element(Cell).Text(m.Notes ?? "\u2014").FontColor(Colors.Grey.Darken1);
                                table.Cell().Element(Cell).Text(m.RecordedBy);
                            }
                        });
                    }
                });

                page.Footer().Column(footer =>
                {
                    footer.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);
                    footer.Item().PaddingTop(4).Row(row =>
                    {
                        row.RelativeItem()
                           .Text("This register is a legal document. Unauthorized alterations are prohibited.")
                           .FontSize(7).FontColor(Colors.Grey.Medium);
                        row.ConstantItem(60).AlignRight().AlignBottom()
                           .Text(x =>
                           {
                               x.Span("Page ").FontSize(7).FontColor(Colors.Grey.Medium);
                               x.CurrentPageNumber().FontSize(7).FontColor(Colors.Grey.Medium);
                               x.Span(" of ").FontSize(7).FontColor(Colors.Grey.Medium);
                               x.TotalPages().FontSize(7).FontColor(Colors.Grey.Medium);
                           });
                    });
                });
            });
        }).GeneratePdf();
    }

    private static string FormatType(string t) => t switch
    {
        StockMovementType.Receive      => "Receive",
        StockMovementType.Dispense     => "Dispensed",
        StockMovementType.Sale         => "POS Sale",
        StockMovementType.AdjustAdd    => "Adjustment (+)",
        StockMovementType.AdjustDeduct => "Adjustment (-)",
        StockMovementType.Return       => "Patient Return",
        StockMovementType.Expire       => "Expired",
        StockMovementType.WriteOff     => "Write-Off",
        _                              => t,
    };
}
