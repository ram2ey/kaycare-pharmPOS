import { useState, useEffect, useRef, useCallback } from 'react';
import { getDrugs } from '../../api/drugs';
import { getCustomers } from '../../api/customers';
import { createSale } from '../../api/sales';
import type { CartItem, CustomerResponse, DrugResponse, SaleResponse } from '../../types';
import { getDrugSafety } from '../../api/ai';
import ClinicalSafetyModal from '../../components/ClinicalSafetyModal';
import ThermalReceipt from '../../components/ThermalReceipt';
import { queueSale } from '../../lib/offlineStore';
import { useBackgroundSync } from '../../hooks/useBackgroundSync';

const PAYMENT_METHODS = [
  { value: 'Cash',        label: 'Cash' },
  { value: 'Card',        label: 'Card' },
  { value: 'MobileMoney', label: 'Mobile Money' },
  { value: 'Insurance',   label: 'Insurance' },
];

const QUICK_CASH_DENOMINATIONS = [5, 10, 20, 50, 100];

interface ParkedSale {
  id: string;
  customerName: string;
  items: CartItem[];
  parkedAt: string;
}

export default function POSPage() {
  // Offline state & sync
  const { isOnline, pendingCount } = useBackgroundSync();
  const isOffline = !isOnline;

  // AI Safety states
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyReport, setSafetyReport] = useState('');

  // Drug search
  const [search, setSearch] = useState('');
  const [drugs, setDrugs] = useState<DrugResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Park / Resume sale state
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>(() => {
    try {
      const stored = localStorage.getItem('pharmpos_parked_sales');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Customer & Patient Health Profile
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Checkout
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Completed sale & Thermal Receipt modal
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [showThermalReceiptModal, setShowThermalReceiptModal] = useState(false);

  // Save parked sales to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pharmpos_parked_sales', JSON.stringify(parkedSales));
    } catch {}
  }, [parkedSales]);

  // Online / Offline Auto-Sync is now handled globally by useBackgroundSync

  // Handle Clinical AI Safety Check
  async function handleSafetyCheck() {
    if (cart.length === 0) return;
    setSafetyOpen(true);
    setSafetyLoading(true);
    try {
      const drugItems = cart.map(i => ({
        drugName: i.drugName,
        genericName: '',
        dosage: `${i.strength || ''} ${i.dosageForm || ''}`.trim(),
        quantity: i.quantity,
      }));
      const data = await getDrugSafety(drugItems);
      setSafetyReport(data.interactions);
    } catch {
      setSafetyReport('Failed to generate safety report. Please verify drug details and try again.');
    } finally {
      setSafetyLoading(false);
    }
  }

  // Cart math
  const subtotal   = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const net        = Math.max(0, subtotal - discount);
  const paidNum    = parseFloat(paid) || 0;
  const change     = Math.max(0, paidNum - net);
  const canCharge  = cart.length > 0 && paymentMethod && (paymentMethod !== 'Cash' || paidNum >= net);

  // Checkout handler (Online + Offline mode)
  const handleCheckout = useCallback(async () => {
    if (!canCharge || submitting) return;
    setSubmitting(true);
    setError('');

    const payload = {
      customerId:    selectedCustomer?.customerId,
      customerName:  selectedCustomer ? undefined : (walkInName || undefined),
      paymentMethod,
      paidAmount:    paidNum || net,
      discountAmount: discount,
      notes:         notes || undefined,
      items: cart.map((i) => ({
        drugInventoryId: i.drugInventoryId,
        quantity:        i.quantity,
      })),
    };

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE');
      }
      const sale = await createSale(payload);
      setCompletedSale(sale);
    } catch (err: unknown) {
      // Offline fallback: Queue sale locally
      const offlineId = await queueSale(payload);

      const mockOfflineSale: SaleResponse = {
        saleId: offlineId,
        receiptNumber: `OFF-${Date.now().toString().slice(-6)}`,
        saleNumber: `OFF-${Date.now().toString().slice(-6)}`,
        customerName: selectedCustomer?.name || walkInName || 'Walk-In Patient',
        cashierName: 'Offline Cashier',
        soldByName: 'Offline Cashier',
        createdAt: new Date().toISOString(),
        saleDate: new Date().toISOString(),
        paymentMethod,
        subtotal,
        discountAmount: discount,
        netAmount: net,
        totalAmount: net,
        paidAmount: paidNum || net,
        changeAmount: change,
        change,
        isVoided: false,
        items: cart.map(i => ({
          saleItemId: i.drugInventoryId,
          drugName: i.drugName,
          dosageForm: i.dosageForm,
          strength: i.strength,
          quantity: i.quantity,
          unitPrice: i.sellingPrice,
          totalPrice: i.sellingPrice * i.quantity,
        })),
      };
      setCompletedSale(mockOfflineSale);
    } finally {
      setCart([]);
      setSearch('');
      setDrugs([]);
      setPaid('');
      setDiscount(0);
      setNotes('');
      setSelectedCustomer(null);
      setWalkInName('');
      setSubmitting(false);
    }
  }, [canCharge, submitting, selectedCustomer, walkInName, paymentMethod, paidNum, net, discount, notes, cart, subtotal, change]);

  // Park Cart handler
  function handleParkCart() {
    if (cart.length === 0) return;
    const name = selectedCustomer ? selectedCustomer.name : walkInName || `Customer #${parkedSales.length + 1}`;
    const newParked: ParkedSale = {
      id: `park_${Date.now()}`,
      customerName: name,
      items: [...cart],
      parkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setParkedSales(prev => [...prev, newParked]);
    setCart([]);
    setSelectedCustomer(null);
    setWalkInName('');
    setPaid('');
  }

  function handleResumeParked(parked: ParkedSale) {
    setCart(parked.items);
    setWalkInName(parked.customerName);
    setParkedSales(prev => prev.filter(p => p.id !== parked.id));
    setShowParkedModal(false);
  }

  // Global Keyboard Hotkey Handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'F2' || (e.key === '/' && !isInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (canCharge) handleCheckout();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) handleSafetyCheck();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) handleParkCart();
        else if (parkedSales.length > 0) setShowParkedModal(true);
      } else if (e.key === 'Escape') {
        setSearch('');
        setShowCustomerSearch(false);
        setSafetyOpen(false);
        setShowParkedModal(false);
        setShowThermalReceiptModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCharge, handleCheckout, cart, parkedSales]);

  // Drug search with debounce
  useEffect(() => {
    if (search.length < 2) { setDrugs([]); return; }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await getDrugs({ search, activeOnly: true });
        setDrugs(results);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    getCustomers(customerSearch).then(setCustomers).catch(() => {});
  }, [customerSearch]);

  function addToCart(drug: DrugResponse) {
    setCart((prev) => {
      const existing = prev.find((i) => i.drugInventoryId === drug.drugInventoryId);
      if (existing) {
        if (existing.quantity >= drug.currentStock) return prev;
        return prev.map((i) =>
          i.drugInventoryId === drug.drugInventoryId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      if (drug.currentStock === 0) return prev;
      return [...prev, {
        drugInventoryId: drug.drugInventoryId,
        drugName:    drug.name,
        dosageForm:  drug.dosageForm,
        strength:    drug.strength,
        sellingPrice: drug.sellingPrice,
        currentStock: drug.currentStock,
        quantity:    1,
      }];
    });
  }

  function updateQty(drugInventoryId: string, qty: number) {
    if (qty < 1) { removeFromCart(drugInventoryId); return; }
    setCart((prev) =>
      prev.map((i) =>
        i.drugInventoryId === drugInventoryId
          ? { ...i, quantity: Math.min(qty, i.currentStock) }
          : i
      )
    );
  }

  function removeFromCart(drugInventoryId: string) {
    setCart((prev) => prev.filter((i) => i.drugInventoryId !== drugInventoryId));
  }

  // Check patient allergy warning
  const patientAllergies = selectedCustomer?.allergies || [];
  const patientHasAllergies = patientAllergies.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* ── Left Column: Drug Catalog & Search ────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-slate-800/80 bg-slate-950">
        {/* Offline Banner Indicator */}
        {(isOffline || pendingCount > 0) && (
          <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all ${
            isOffline
              ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
          }`}>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
              {isOffline ? 'OFFLINE MODE — Sales queueing locally' : 'ONLINE — Connected to POS Cloud'}
            </span>
            {pendingCount > 0 && (
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[10px] text-amber-400 border border-amber-500/30">
                {pendingCount} Pending Offline Sale(s)
              </span>
            )}
          </div>
        )}

        {/* Search Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Medication Lookup
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Quick Search</span>
              <span className="kbd-badge">F2</span>
              <span className="kbd-badge">/</span>
            </div>
          </div>

          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medication by brand, generic name, or barcode..."
              className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Drug Results Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {search.length < 2 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2 text-center">
              <p className="text-sm font-medium text-slate-300">Type at least 2 characters to search medications</p>
              <p className="text-xs text-slate-600">Supports barcode scanner auto-input</p>
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center py-16 space-x-3 text-emerald-400">
              <span className="text-sm font-medium text-slate-400">Searching medication database...</span>
            </div>
          )}

          {!searching && search.length >= 2 && drugs.length === 0 && (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <p className="text-base font-semibold text-slate-300">No medications found for "{search}"</p>
              <p className="text-xs text-slate-500">Check spelling or search by active generic ingredient</p>
            </div>
          )}

          {drugs.map((drug) => {
            const inCart = cart.find((i) => i.drugInventoryId === drug.drugInventoryId);
            const outOfStock = drug.currentStock === 0;

            return (
              <div
                key={drug.drugInventoryId}
                onClick={() => !outOfStock && addToCart(drug)}
                className={`glass-panel glass-panel-hover p-4 rounded-2xl flex items-center justify-between cursor-pointer group ${
                  outOfStock ? 'opacity-50 cursor-not-allowed border-rose-900/30 bg-slate-900/30' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {drug.name}
                    </h4>
                    {drug.strength && (
                      <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        {drug.strength}
                      </span>
                    )}
                    {drug.dosageForm && (
                      <span className="text-xs text-slate-400">
                        ({drug.dosageForm})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    {outOfStock ? (
                      <span className="text-rose-400 font-semibold">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        <strong className="text-slate-200 font-mono">{drug.currentStock}</strong> units available
                      </span>
                    )}

                    {/* Drug Schedule Badges */}
                    {drug.isControlledSubstance ? (
                      <span className="badge-schedule-2 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Schedule II (C-II)
                      </span>
                    ) : (
                      <span className="badge-rx text-[10px] px-2 py-0.5 rounded-md font-semibold">
                        Rx Prescription
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-sans">Price</span>
                    <span className="text-lg font-bold font-mono-price text-emerald-400">
                      ${drug.sellingPrice.toFixed(2)}
                    </span>
                  </div>

                  <button
                    disabled={outOfStock}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      inCart
                        ? 'bg-emerald-500 text-slate-950'
                        : outOfStock
                        ? 'bg-slate-800 text-slate-600'
                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700/80'
                    }`}
                  >
                    {inCart ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hotkey Cheatsheet Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span><span className="kbd-badge">F2</span> Search</span>
            <span><span className="kbd-badge">F4</span> Checkout</span>
            <span><span className="kbd-badge">F8</span> AI Safety</span>
            <span><span className="kbd-badge">F9</span> Park Cart</span>
            <span><span className="kbd-badge">Esc</span> Clear</span>
          </div>
          {parkedSales.length > 0 && (
            <button
              onClick={() => setShowParkedModal(true)}
              className="text-amber-400 hover:underline font-semibold"
            >
              {parkedSales.length} Parked Sale(s)
            </button>
          )}
        </div>
      </div>

      {/* ── Right Column: Dynamic Cart & Fast Checkout ──────────────────── */}
      <div className="w-[420px] flex flex-col bg-slate-900/90 border-l border-slate-800/80 backdrop-blur-xl">
        {/* Customer Selector & Patient Health Profile */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient / Customer</span>
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-emerald-400 hover:underline"
              >
                Switch Customer
              </button>
            )}
          </div>

          {selectedCustomer ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-slate-100">{selectedCustomer.name}</h5>
                  <p className="text-xs text-slate-400">{selectedCustomer.phone || selectedCustomer.email || 'Registered Patient'}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Verified Patient
                </span>
              </div>

              {/* Patient Allergy Warning Tag */}
              {patientHasAllergies && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <strong>Allergies:</strong> {patientAllergies.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerSearch(true);
                  }}
                  placeholder="Search patient by name or phone..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {showCustomerSearch && customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 glass-modal rounded-xl border border-slate-700 shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-slate-800">
                    {customers.map((c) => (
                      <div
                        key={c.customerId}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerSearch(false);
                          setCustomerSearch('');
                        }}
                        className="p-2.5 hover:bg-slate-800 cursor-pointer text-xs flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-200">{c.name}</span>
                        <span className="text-slate-400">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Or type Walk-In patient name..."
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Cart ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
            </span>
            {cart.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSafetyCheck}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-semibold transition-colors"
                >
                  AI Safety Screening
                </button>
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-1 text-center">
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-slate-600">Select medications from the catalog on the left</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.drugInventoryId}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex-1 pr-3">
                  <h5 className="text-xs font-bold text-slate-200">{item.drugName}</h5>
                  <p className="text-[11px] text-slate-400 font-mono-price mt-0.5">
                    ${item.sellingPrice.toFixed(2)} × {item.quantity} = <strong className="text-emerald-400">${(item.sellingPrice * item.quantity).toFixed(2)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-800 rounded-lg bg-slate-900 overflow-hidden">
                    <button
                      onClick={() => updateQty(item.drugInventoryId, item.quantity - 1)}
                      className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-2.5 text-xs font-bold font-mono text-slate-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.drugInventoryId, item.quantity + 1)}
                      className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.drugInventoryId)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Checkout Section */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 space-y-3">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  paymentMethod === method.value
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>

          {/* Quick Cash Denominations */}
          {paymentMethod === 'Cash' && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Cash Tenders
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_CASH_DENOMINATIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setPaid(amt.toString())}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 rounded-lg transition-all"
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  onClick={() => setPaid(net.toString())}
                  className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-lg hover:bg-emerald-500/20"
                >
                  Exact (${net.toFixed(2)})
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Amount Tendered ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Change Due ($)</label>
                  <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-emerald-400">
                    ${change.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono-price">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Discount</span>
              <span className="font-mono-price text-emerald-400">-${discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-100 pt-1.5 border-t border-slate-800">
              <span>Total Net</span>
              <span className="font-mono-price text-emerald-400 text-lg">${net.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 p-2 rounded-lg border border-rose-500/30">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleParkCart}
              disabled={cart.length === 0}
              className="btn-glass text-xs py-3"
            >
              Park Cart <span className="kbd-badge">F9</span>
            </button>

            <button
              onClick={handleCheckout}
              disabled={!canCharge || submitting}
              className="btn-emerald text-xs py-3"
            >
              {submitting ? 'Processing...' : `Charge $${net.toFixed(2)}`} <span className="kbd-badge">F4</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clinical AI Safety Modal */}
      <ClinicalSafetyModal
        isOpen={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        loading={safetyLoading}
        report={safetyReport}
        cartItemCount={cart.length}
      />

      {/* Parked Sales Modal */}
      {showParkedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-modal rounded-2xl border border-slate-700/80 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center justify-between">
              <span>Parked Sales ({parkedSales.length})</span>
              <button onClick={() => setShowParkedModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">Close</button>
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {parkedSales.map((parked) => (
                <div
                  key={parked.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <h5 className="text-sm font-bold text-slate-200">{parked.customerName}</h5>
                    <p className="text-xs text-slate-400">{parked.items.length} item(s) • Parked at {parked.parkedAt}</p>
                  </div>
                  <button
                    onClick={() => handleResumeParked(parked)}
                    className="btn-emerald text-xs px-3 py-1.5"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sale Complete Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-modal rounded-2xl border border-slate-700/80 shadow-2xl p-6 text-center space-y-4">
            <h3 className="text-xl font-bold text-slate-100">Transaction Complete</h3>
            <p className="text-xs text-slate-400 font-mono">
              Receipt No: #{completedSale.receiptNumber || completedSale.saleNumber || completedSale.saleId.substring(0, 8)}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowThermalReceiptModal(true)}
                className="btn-emerald flex-1 text-xs"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="btn-glass flex-1 text-xs"
              >
                Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal POS Receipt Modal */}
      {showThermalReceiptModal && completedSale && (
        <ThermalReceipt
          sale={completedSale}
          onClose={() => {
            setShowThermalReceiptModal(false);
            setCompletedSale(null);
          }}
        />
      )}
    </div>
  );
}
