import { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  X,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

// Pizza 65 & Crave Central Hub Coordinates (Imli Ke Pass, Main Road, Chirgaon)
const HUB_COORDINATES = [78.8228, 25.5746]; // [lng, lat]

function calculateDistanceKm(coords1, coords2) {
  if (!coords1 || !coords2) return 0;
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSaveAddress,
  userPhone = '',
  userName = '',
  initialAddress = null,
}) {
  const isEditMode = Boolean(initialAddress?._id);

  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState(userName || '');
  const [houseFloor, setHouseFloor] = useState('');
  const [apartmentArea, setApartmentArea] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Chirgaon');
  const [state, setState] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('284301');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState(userPhone || '');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [coordinates, setCoordinates] = useState([78.8235, 25.5752]); // [lng, lat]

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectionError, setDetectionError] = useState('');
  const [detectionSuccess, setDetectionSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state whenever modal opens or initialAddress changes
  useEffect(() => {
    if (!isOpen) return;
    setDetectionError('');
    setDetectionSuccess('');

    if (initialAddress) {
      setLabel(initialAddress.label || 'Home');
      setRecipientName(initialAddress.recipientName || userName || '');
      setHouseFloor(initialAddress.houseFloor || '');
      setApartmentArea(initialAddress.apartmentArea || '');
      setStreet(initialAddress.street || '');
      setCity(initialAddress.city || 'Chirgaon');
      setState(initialAddress.state || 'Uttar Pradesh');
      setPincode(initialAddress.pincode || '284301');
      setLandmark(initialAddress.landmark || '');
      setPhone(initialAddress.phone || userPhone || '');
      setAlternatePhone(initialAddress.alternatePhone || '');
      setDeliveryInstructions(initialAddress.deliveryInstructions || '');
      setIsDefault(Boolean(initialAddress.isDefault));
      const coords = initialAddress.coordinates?.coordinates;
      if (Array.isArray(coords) && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0)) {
        setCoordinates(coords);
      } else {
        setCoordinates([78.8235, 25.5752]);
      }
    } else {
      setLabel('Home');
      setRecipientName(userName || '');
      setHouseFloor('');
      setApartmentArea('');
      setStreet('');
      setCity('Chirgaon');
      setState('Uttar Pradesh');
      setPincode('284301');
      setLandmark('');
      setPhone(userPhone || '');
      setAlternatePhone('');
      setDeliveryInstructions('');
      setIsDefault(false);
      setCoordinates([78.8235, 25.5752]);
    }
  }, [isOpen, initialAddress, userName, userPhone]);

  const distanceKm = calculateDistanceKm(coordinates, HUB_COORDINATES);
  const isFreeDelivery = distanceKm <= 1.0;

  const handleAutoDetectLocation = () => {
    setDetectionError('');
    setDetectionSuccess('');

    if (!('geolocation' in navigator)) {
      setDetectionError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = [longitude, latitude];
        setCoordinates(newCoords);

        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'CraveCourierDelivery/2.0' },
          });

          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};

            if (addr.house_number || addr.building) {
              setHouseFloor([addr.house_number, addr.building].filter(Boolean).join(', '));
            }
            if (addr.neighbourhood || addr.suburb || addr.residential) {
              setApartmentArea(addr.neighbourhood || addr.suburb || addr.residential);
            }
            const detectedStreet = [addr.road || addr.street, addr.suburb]
              .filter(Boolean)
              .join(', ');
            if (detectedStreet) setStreet(detectedStreet);
            if (addr.town || addr.city || addr.village) {
              setCity(addr.town || addr.city || addr.village);
            }
            if (addr.state) setState(addr.state);
            if (addr.postcode) setPincode(addr.postcode);

            setDetectionSuccess(
              `Live GPS captured! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
            );
          } else {
            setDetectionSuccess(
              `GPS pinpointed: [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`
            );
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
          setDetectionSuccess(`GPS captured: [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        let msg = 'Unable to fetch your location.';
        if (err.code === 1) {
          msg = 'Location access denied. Please allow location in your device/browser settings.';
        } else if (err.code === 2) {
          msg = 'Location unavailable. Please check your device GPS.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setDetectionError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!street.trim()) {
      setDetectionError('Please enter a street or road name.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveAddress(
        {
          label,
          recipientName: recipientName.trim() || userName,
          houseFloor: houseFloor.trim(),
          apartmentArea: apartmentArea.trim(),
          street: street.trim(),
          city: city.trim() || 'Chirgaon',
          state: state.trim() || 'Uttar Pradesh',
          pincode: pincode.trim() || '284301',
          landmark: landmark.trim(),
          phone: phone.trim() || userPhone,
          alternatePhone: alternatePhone.trim(),
          deliveryInstructions: deliveryInstructions.trim(),
          isDefault,
          coordinates,
        },
        initialAddress?._id || null
      );
      onClose();
    } catch (err) {
      setDetectionError(err.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${coordinates[1]},${coordinates[0]}&z=16&output=embed`;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-neutral-200/80 dark:border-slate-800 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-500 dark:bg-brand-500/20">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-black text-base text-neutral-900 dark:text-slate-100 font-heading">
                {isEditMode ? 'Update Delivery Address' : 'Add Precise Delivery Address'}
              </h3>
              <p className="text-[11px] text-neutral-400 dark:text-slate-500">
                Doorstep GPS pin &amp; complete address details for faster delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Auto-Detect Location Action Banner */}
        <div className="p-3.5 bg-gradient-to-r from-brand-50 to-orange-50 dark:from-brand-950/40 dark:to-orange-950/30 rounded-2xl border border-brand-200/80 dark:border-brand-800/60 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-2 rounded-xl bg-brand-500 text-white flex-shrink-0 shadow-sm animate-pulse">
                <Navigation className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-black text-brand-950 dark:text-brand-200">
                  Auto-Detect Current Location
                </p>
                <p className="text-[10px] text-brand-800/80 dark:text-brand-300">
                  Uses device GPS to auto-fill street, locality &amp; PIN code
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoDetectLocation}
              disabled={detectingLocation}
              className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
            >
              {detectingLocation ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Pinpointing GPS...</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5" />
                  <span>Auto-Detect GPS</span>
                </>
              )}
            </button>
          </div>

          {detectionSuccess && (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{detectionSuccess}</span>
            </div>
          )}

          {detectionError && (
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{detectionError}</span>
            </div>
          )}
        </div>

        {/* 2. Live Map Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand-500" />
              Google Maps Pin Location
            </span>
            <span className="font-mono text-[10px] text-neutral-500 dark:text-slate-400">
              [{coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}]
            </span>
          </div>

          <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-neutral-200 dark:border-slate-800 shadow-inner bg-neutral-100 dark:bg-slate-800">
            <iframe
              title="Google Maps Location Preview"
              src={googleMapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 text-[11px]">
            <span className="text-neutral-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Distance: <strong className="text-neutral-900 dark:text-slate-100">{distanceKm} km</strong>
            </span>
            <span
              className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md ${
                isFreeDelivery
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isFreeDelivery ? 'FREE Delivery (≤1km)' : 'Standard Delivery (₹20)'}
            </span>
          </div>
        </div>

        {/* 3. Detailed Address Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Address Label */}
          <div>
            <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
              Save As
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Home', 'Work', 'Other'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`py-1.5 rounded-xl font-bold text-center border transition-all ${
                    label === l
                      ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-600 dark:text-brand-300 shadow-xs'
                      : 'border-neutral-200 dark:border-slate-800 text-neutral-600 dark:text-slate-400 hover:border-neutral-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Name & Primary Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                placeholder="Receiver's full name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* House / Flat / Floor & Colony / Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                House / Flat / Floor No.
              </label>
              <input
                type="text"
                placeholder="e.g. H.No 42, 2nd Floor"
                value={houseFloor}
                onChange={(e) => setHouseFloor(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                Colony / Mohalla / Building
              </label>
              <input
                type="text"
                placeholder="e.g. Shastri Nagar"
                value={apartmentArea}
                onChange={(e) => setApartmentArea(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Street / Road */}
          <div>
            <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
              Street / Road / Locality <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Garautha Road, Near Imli Ke Pass"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
            />
          </div>

          {/* City, State & PIN Code */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                City / Town
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                State
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                PIN Code
              </label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Landmark & Alternate Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                Nearby Landmark
              </label>
              <input
                type="text"
                placeholder="e.g. Opposite Water Tank"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
                Alternate Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="Backup number for rider"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Delivery Instructions */}
          <div>
            <label className="block font-bold text-neutral-700 dark:text-slate-300 mb-1">
              How to Reach / Delivery Directions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Blue gate on left lane, call before arriving"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-slate-100"
            />
          </div>

          {/* Default Address Checkbox */}
          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="font-semibold text-neutral-700 dark:text-slate-300">
              Set as default delivery address
            </span>
          </label>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-gradient-to-r from-[#FF541E] to-[#FF7A00] hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-full shadow-md shadow-orange-500/25 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isEditMode ? 'Updating Address...' : 'Saving Location...'}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditMode ? 'Update & Save Address' : 'Save & Select Delivery Location'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
