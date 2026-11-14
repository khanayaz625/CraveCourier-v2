import { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Heart } from 'lucide-react';
import api from '../../services/api';

export default function ReviewModal({ order, isOpen, onClose, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const starLabels = {
    1: 'Needs Improvement',
    2: 'Could be Better',
    3: 'Good Quality',
    4: 'Great & Tasty!',
    5: 'Absolutely Delicious! 🔥',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/reviews', {
        orderId: order._id,
        rating,
        comment,
      });

      setSuccess(true);
      setTimeout(() => {
        if (onReviewSubmitted) onReviewSubmitted();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(err.message || 'Could not save your review. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900">Rate & Review Order</h3>
              <p className="text-[11px] text-neutral-400">Order #{order?.orderNumber}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-neutral-900">Thank you for your feedback!</h4>
            <p className="text-xs text-neutral-500">
              Your review helps our chefs and riders maintain top quality.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs">
                {error}
              </div>
            )}

            {/* Star Selector */}
            <div className="text-center space-y-2 py-2">
              <span className="text-xs font-bold text-neutral-600 block">
                How was your food and delivery?
              </span>

              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          active
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-neutral-200'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-black text-brand-600 tracking-wide">
                {starLabels[hoverRating || rating]}
              </div>
            </div>

            {/* Comment Area */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Your Review (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Tell us what you loved about the food, taste, packaging, or delivery speed..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none leading-relaxed"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-neutral-600 font-bold text-xs hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    <span>Submit Review</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

