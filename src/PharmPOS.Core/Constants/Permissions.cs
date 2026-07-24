namespace PharmPOS.Core.Constants;

public static class Permissions
{
    // Point of Sale & Checkout
    public const string PosCheckout = "pos:checkout";
    public const string PosDiscount = "pos:discount";
    public const string PosVoid     = "pos:void";
    public const string PosPark     = "pos:park";

    // Drug Inventory & Catalog
    public const string InventoryView   = "inventory:view";
    public const string InventoryManage = "inventory:manage";
    public const string InventoryPrice  = "inventory:price";

    // Patients & Customers
    public const string CustomersView   = "customers:view";
    public const string CustomersManage = "customers:manage";

    // Controlled Substance Register
    public const string CSRegisterView  = "csregister:view";
    public const string CSRegisterAudit = "csregister:audit";

    // Procurement & Suppliers
    public const string ProcurementManage = "procurement:manage";

    // Analytics & Financial Reports
    public const string ReportsView   = "reports:view";
    public const string ReportsExport = "reports:export";

    // Staff & Facility Administration
    public const string UsersManage    = "users:manage";
    public const string SettingsManage = "settings:manage";

    public static readonly string[] All = [
        PosCheckout, PosDiscount, PosVoid, PosPark,
        InventoryView, InventoryManage, InventoryPrice,
        CustomersView, CustomersManage,
        CSRegisterView, CSRegisterAudit,
        ProcurementManage,
        ReportsView, ReportsExport,
        UsersManage, SettingsManage
    ];
}
