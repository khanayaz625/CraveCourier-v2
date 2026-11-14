import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { useCartStore } from '../../store/useCartStore';

export default function StripePaymentForm({
  clientSecret,
  paymentIntentId,
  addressId,
  deliverySlot,
  deliveryNote,
  totals,
}) {
  const navigate = useNavigate();
  const { clearCart } = useCartStore();

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Format card number with spaces (4-4-4-4)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format expiry (MM/YY)
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    setCardExpiry(raw);
  };

  // Quick fill helper with Stripe official test cards
  const handleQuickFill = (type) => {
    setPaymentError(null);
    if (type === 'success') {
      setCardNumber('4242 4242 4242 4242');
      setCardExpiry('12/28');
      setCardCvc('123');
      setCardName('Jane Doe (Test Card)');
    } else if (type === 'declined') {
      setCardNumber('4000 0000 0000 0002'); // Stripe standard decline card
      setCardExpiry('12/28');
      setCardCvc('123');
      setCardName('Declined Test Card');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPaymentError(null);

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16) {
      setPaymentError('Please enter a valid 16-digit card number.');
      return;
    }

    if (!cardExpiry || cardExpiry.length < 5) {
      setPaymentError('Please enter card expiration date (MM/YY).');
      return;
    }

    if (!cardCvc || cardCvc.length < 3) {
      setPaymentError('Please enter a valid 3-digit CVV / CVC code.');
      return;
    }

    // Simulate standard test decline card
    if (cleanCard === '4000000000000002') {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setPaymentError('Your card was declined by the issuer (Test decline code: card_declined). Try using the 4242 test card instead.');
      }, 1000);
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm payment with backend (verifies payment status server-side)
      const res = await api.post('/payments/confirm', {
        paymentIntentId,
        addressId,
        deliverySlot,
        note: deliveryNote,
      });

      setPaymentSuccess(true);
      clearCart();

      const createdOrder = res.data?.order;
      const orderId = createdOrder?._id || res.data?.orderId;

      setTimeout(() => {
        navigate(`/orders/${orderId}`);
      }, 1200);
    } catch (err) {
      console.error('Payment confirmation error:', err);
      setPaymentError(err.message || 'Payment confirmation failed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-5 shadow-xs">
      {/* Stripe Brand & Secure Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center space-x-2">
          <div className="h-7 px-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs flex items-center">
            Stripe
          </div>
          <span className="text-xs font-bold text-neutral-800">Card Payment</span>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <Lock className="h-3 w-3" />
          <span>256-bit Encrypted</span>
        </div>
      </div>

      {/* Visual Credit Card Preview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 p-5 text-white shadow-md">
        <div className="flex justify-between items-start">
          <div className="h-7 w-11 rounded-md bg-amber-400/90 shadow-inner flex items-center justify-center">
            <div className="w-8 h-4 border border-neutral-800/40 rounded-sm"></div>
          </div>
          <span className="text-xs font-bold tracking-widest uppercase opacity-75">
            Credit / Debit
          </span>
        </div>

        <div className="my-5 tracking-widest font-mono text-base sm:text-lg font-semibold">
          {cardNumber || '•••• •••• •••• ••••'}
        </div>

        <div className="flex justify-between text-[11px] font-mono tracking-wider opacity-85">
          <div>
            <div className="text-[9px] uppercase tracking-wider opacity-60">Card Holder</div>
            <div className="font-bold truncate max-w-[150px]">{cardName || 'YOUR NAME'}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider opacity-60">Expires</div>
            <div className="font-bold">{cardExpiry || 'MM/YY'}</div>
          </div>
        </div>
      </div>

      {/* Quick Test Card Fill Buttons */}
      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-600 font-semibold">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            <span>Developer Sandbox Test Cards:</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('success')}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-800 transition-colors"
          >
            ✓ Success Card (4242...)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('declined')}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-100/70 hover:bg-rose-200/80 text-rose-800 transition-colors"
          >
            ✕ Decline Card (4000...)
          </button>
        </div>
      </div>

      {/* Payment Error Alert with Retry button */}
      {paymentError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{paymentError}</p>
            <button
              type="button"
              onClick={() => handleQuickFill('success')}
              className="mt-1 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry with Valid Test Card</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Success Feedback */}
      {paymentSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-bold">Payment authorized! Redirecting to order tracker...</span>
        </div>
      )}

      {/* Card Input Form */}
      <form id="stripe-payment-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1">Cardholder Name</label>
          <input
            type="text"
            placeholder="Jane Doe"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            required
            className="w-full text-xs p-3 rounded-xl border border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1">Card Number</label>
          <div className="relative">
            <input
              type="text"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              required
              className="w-full text-xs p-3 pr-10 rounded-xl border border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
            />
            <CreditCard className="h-4 w-4 text-neutral-400 absolute right-3 top-3.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Expiration (MM/YY)</label>
            <input
              type="text"
              placeholder="12/28"
              value={cardExpiry}
              onChange={handleExpiryChange}
              maxLength={5}
              required
              className="w-full text-xs p-3 rounded-xl border border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">CVC / CVV</label>
            <div className="relative">
              <input
                type="password"
                placeholder="123"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                required
                className="w-full text-xs p-3 pr-9 rounded-xl border border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
              />
              <Lock className="h-3.5 w-3.5 text-neutral-400 absolute right-3 top-3.5" />
            </div>
          </div>
        </div>

        {/* Submit Pay Button */}
        <button
          type="submit"
          disabled={isProcessing || paymentSuccess}
          className="w-full mt-2 py-3.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center space-x-2 transition-all"
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Payment with Stripe...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Pay ₹{totals.grandTotal % 1 === 0 ? totals.grandTotal : totals.grandTotal.toFixed(2)} Securely</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

