import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDrugs } from '../../api/drugs';
import { getCustomers } from '../../api/customers';
import { createSale } from '../../api/sales';
import type { CartItem, CustomerResponse, DrugResponse } from '../../types';

const PAYMENT_METHODS = [
  { value: 'Cash',        label: 'Cash' },
  { value: 'Card',        label: 'Card' },
  { value: 'MobileMoney', label: 'Mobile Money' },
  { value: 'Insurance',   label: 'Insurance' },
];

export default function POSPage() {
  const navigate = useNavigate();

  // Drug search
  const [search, setSearch] = useState('');
  const [drugs, setDrugs] = useState<DrugResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer
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

  // Completed sale modal
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);

  // Drug search with debounce
  useEffect(() => {
    if (search.length < 2) { setDrugs([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await getDrugs({ search, activeOnly: true });
        setDrugs(results);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
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

  const subtotal   = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const net        = Math.max(0, subtotal - discount);
  const paidNum    = parseFloat(paid) || 0;
  const change     = Math.max(0, paidNum - net);
  const canCharge  = cart.length > 0 && paymentMethod && (paymentMethod !== 'Cash' || paidNum >= net);

  async function handleCheckout() {
    if (!canCharge) return;
    setSubmitting(true);
    setError('');
    try {
      const sale = await createSale({
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
      });
      setCompletedSaleId(sale.saleId);
      setCart([]);
      setSearch('');
      setDrugs([]);
      setPaid('');
      setDiscount(0);
      setNotes('');
      setSelectedCustomer(null);
      setWalkInName('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left: Drug search ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
        {/* Search bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Drug Search</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or generic name…"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {search.length < 2 && (
            <p className="text-sm text-gray-400 text-center pt-8">Type at least 2 characters to search drugs.</p>
          )}
          {searching && (
            <p className="text-sm text-gray-400 text-center pt-8">Searching…</p>
          )}
          {!searching && search.length >= 2 && drugs.length === 0 && (
            <p className="text-sm text-gray-400 text-center pt-8">No drugs found for "{search}".</p>
          )}
          {drugs.map((drug) => {
            const inCart = cart.find((i) => i.drugInventoryId === drug.drugInventoryId);
            const outOfStock = drug.currentStock === 0;
            return (
              <div
                key={drug.drugInventoryId}
                className={`border rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${
                  outOfStock ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-green-100 bg-green-50 hover:bg-green-100 cursor-pointer'
                }`}
                onClick={() => !outOfStock && addToCart(drug)}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {drug.name}
                    {drug.strength && <span className="font-normal text-gray-500 ml-1">{drug.strength}</span>}
                    {drug.dosageForm && <span className="font-normal text-gray-400 ml-1 text-xs">{drug.dosageForm}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {outOfStock ? (
                      <span className="text-red-500 font-medium">Out of stock</span>
                    ) : (
                      <span>{drug.currentStock} in stock</span>
                    )}
                    {drug.isControlledSubstance && (
                      <span className="ml-2 bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-medium">CS</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-gray-900">${drug.sellingPrice.toFixed(2)}</div>
                  {inCart ? (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: '#15803d' }}>
                      ✓
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: outOfStock ? '#d1d5db' : '#15803d' }}>
                      +
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Cart + Checkout ─────────────────────────────────────────── */}
      <div className="w-96 flex flex-col bg-white">
        {/* Customer selector */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</div>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium text-gray-900">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-xs text-gray-400">{selectedCustomer.phone}</div>}
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Walk-in name (optional)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button
                  onClick={() => setShowCustomerSearch((v) => !v)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
                >
                  Search
                </button>
              </div>
              {showCustomerSearch && (
                <div>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    autoFocus
                  />
                  {customers.length > 0 && (
                    <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      {customers.slice(0, 5).map((c) => (
                        <button
                          key={c.customerId}
                          onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">{c.name}</div>
                          {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Sale</div>
          {cart.length === 0 ? (
            <p className="text-sm text-gray-300 text-center pt-8 italic">Cart is empty</p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.drugInventoryId} className="flex items-center gap-2 border-b border-gray-50 pb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.drugName} {item.strength}
                    </div>
                    <div className="text-xs text-gray-400">${item.sellingPrice.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.drugInventoryId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm flex items-center justify-center"
                    >−</button>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      max={item.currentStock}
                      onChange={(e) => updateQty(item.drugInventoryId, parseInt(e.target.value) || 1)}
                      className="w-10 text-center text-sm border border-gray-200 rounded px-1 py-0.5"
                    />
                    <button
                      onClick={() => updateQty(item.drugInventoryId, item.quantity + 1)}
                      disabled={item.quantity >= item.currentStock}
                      className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm flex items-center justify-center disabled:opacity-30"
                    >+</button>
                  </div>
                  <div className="text-sm font-bold text-gray-900 w-16 text-right">
                    ${(item.sellingPrice * item.quantity).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.drugInventoryId)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout panel */}
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.min(parseFloat(e.target.value) || 0, subtotal))}
                  className="w-16 text-right text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span><span>${net.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-1.5">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                  paymentMethod === pm.value
                    ? 'border-green-600 text-green-700 bg-green-50'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>

          {/* Paid amount (cash only) */}
          {paymentMethod === 'Cash' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16">Cash paid</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder={net.toFixed(2)}
                />
              </div>
              {change > 0 && (
                <div className="text-sm font-bold text-green-700">Change: ${change.toFixed(2)}</div>
              )}
            </div>
          )}

          {/* Notes */}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Charge button */}
          <button
            onClick={handleCheckout}
            disabled={!canCharge || submitting || cart.length === 0}
            className="w-full py-3 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-40"
            style={{ background: '#15803d' }}
          >
            {submitting ? 'Processing…' : `Charge $${net.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* ── Sale complete modal ──────────────────────────────────────────────── */}
      {completedSaleId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sale Complete</h2>
            <p className="text-gray-500 text-sm mb-6">The sale has been recorded and stock updated.</p>
            <div className="flex gap-3">
              <a
                href={`/api/pharmacy/sales/${completedSaleId}/receipt`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                onClick={() => setCompletedSaleId(null)}
              >
                Print Receipt
              </a>
              <button
                onClick={() => { navigate(`/sales/${completedSaleId}`); setCompletedSaleId(null); }}
                className="flex-1 py-2.5 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium"
              >
                View Sale
              </button>
              <button
                onClick={() => setCompletedSaleId(null)}
                className="flex-1 py-2.5 text-white rounded-lg text-sm font-bold"
                style={{ background: '#15803d' }}
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
