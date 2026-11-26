import { useState, useEffect, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  ShieldCheck,
  Radio,
  Smartphone,
  ExternalLink,
  Phone,
  Compass,
  Map,
  Clock,
  Bike,
} from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

const HUB_COORDS = [78.8228, 25.5746]; // [lng, lat] Pizza 65 & Crave Hub, Chirgaon

const haversineKm = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
};

export default function LiveOrderMap({ order, liveLocation }) {
  const { isBgTrackingActive, toggleBackgroundTracking } = useNotificationStore();
  const [mapMode, setMapMode] = useState('google'); // 'google' | 'radar'

  const customerCoords = useMemo(() => {
    const raw = order?.deliveryAddress?.coordinates?.coordinates;
    if (
      Array.isArray(raw) &&
      raw.length === 2 &&
      Number.isFinite(Number(raw[0])) &&
      Number.isFinite(Number(raw[1])) &&
      (Number(raw[0]) !== 0 || Number(raw[1]) !== 0)
    ) {
      return [Number(raw[0]), Number(raw[1])];
    }
    return [78.8255, 25.5762];
  }, [order?.deliveryAddress?.coordinates?.coordinates]);

  const initialProgress = useMemo(() => {
    switch (order?.status) {
      case 'delivered':
        return 100;
      case 'out_for_delivery':
        return 62;
      case 'picked_up':
        return 30;
      case 'ready':
        return 15;
      case 'preparing':
        return 8;
      default:
        return 4;
    }
  }, [order?.status]);

  const [progress, setProgress] = useState(initialProgress);

  // Compute true 2D vector projection progress when real rider GPS coordinates arrive via Socket.io
  useEffect(() => {
    if (order?.status === 'delivered') {
      setProgress(100);
      return;
    }

    if (liveLocation && Array.isArray(liveLocation.coordinates) && liveLocation.coordinates.length === 2) {
      const rx = Number(liveLocation.coordinates[0]);
      const ry = Number(liveLocation.coordinates[1]);
      if (Number.isFinite(rx) && Number.isFinite(ry)) {
        const dx = customerCoords[0] - HUB_COORDS[0];
        const dy = customerCoords[1] - HUB_COORDS[1];
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0) {
          const proj = ((rx - HUB_COORDS[0]) * dx + (ry - HUB_COORDS[1]) * dy) / lenSq;
          setProgress(Math.max(4, Math.min(98, Math.round(proj * 100))));
          return;
        }
      }
    }

    setProgress(initialProgress);
  }, [liveLocation, customerCoords, initialProgress, order?.status]);

  // Smooth fallback visual glide ONLY when in transit and no live socket ping has arrived yet
  useEffect(() => {
    if (order?.status === 'delivered') {
      setProgress(100);
      return;
    }
    if (liveLocation?.coordinates) return;
    if (order?.status !== 'out_for_delivery' && order?.status !== 'picked_up') return;

    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 94 ? 94 : Number((prev + 0.5).toFixed(1))));
    }, 3000);
    return () => clearInterval(timer);
  }, [order?.status, liveLocation?.coordinates]);

  // Real rider coordinates (live socket ping or interpolated along route)
  const activeRiderCoords = useMemo(() => {
    if (liveLocation && Array.isArray(liveLocation.coordinates) && liveLocation.coordinates.length === 2) {
      return [Number(liveLocation.coordinates[0]), Number(liveLocation.coordinates[1])];
    }
    const frac = Math.min(1, Math.max(0, progress / 100));
    return [
      Number((HUB_COORDS[0] + (customerCoords[0] - HUB_COORDS[0]) * frac).toFixed(6)),
      Number((HUB_COORDS[1] + (customerCoords[1] - HUB_COORDS[1]) * frac).toFixed(6)),
    ];
  }, [liveLocation, progress, customerCoords]);

  const totalDistanceKm = Math.max(0.2, haversineKm(HUB_COORDS, customerCoords));
  const remainingKmNum =
    order?.status === 'delivered'
      ? 0
      : haversineKm(activeRiderCoords, customerCoords);
  const remainingKm = remainingKmNum.toFixed(1);
  const liveSpeedKmh =
    order?.status === 'delivered'
      ? 0
      : liveLocation?.speed || (order?.status === 'out_for_delivery' ? 24 : 18);
  const remainingMins =
    order?.status === 'delivered'
      ? 0
      : Math.max(2, Math.round((remainingKmNum / Math.max(12, liveSpeedKmh)) * 60) + 3);

  const hasLiveSocketGps = Boolean(liveLocation?.coordinates);
  const isInTransit = order?.status === 'picked_up' || order?.status === 'out_for_delivery';

  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${activeRiderCoords[1]},${activeRiderCoords[0]}&destination=${customerCoords[1]},${customerCoords[0]}&travelmode=driving`;
  const googleEmbedUrl = isInTransit
    ? `https://maps.google.com/maps?saddr=${activeRiderCoords[1]},${activeRiderCoords[0]}&daddr=${customerCoords[1]},${customerCoords[0]}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${customerCoords[1]},${customerCoords[0]}&z=16&output=embed`;

  // Compute SVG Bézier Path Coordinates (viewBox="0 0 600 320")
  const startPt = { x: 75, y: 235 };
  const endPt = { x: 525, y: 85 };
  const ctrl1 = { x: 210, y: 215 };
  const ctrl2 = { x: 370, y: 105 };
  const t = Math.min(1, Math.max(0, progress / 100));
  const riderX =
    Math.pow(1 - t, 3) * startPt.x +
    3 * Math.pow(1 - t, 2) * t * ctrl1.x +
    3 * (1 - t) * Math.pow(t, 2) * ctrl2.x +
    Math.pow(t, 3) * endPt.x;
  const riderY =
    Math.pow(1 - t, 3) * startPt.y +
    3 * Math.pow(1 - t, 2) * t * ctrl1.y +
    3 * (1 - t) * Math.pow(t, 2) * ctrl2.y +
    Math.pow(t, 3) * endPt.y;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-neutral-200/80 dark:border-slate-800 shadow-soft space-y-4 overflow-hidden">
      {/* Map Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-[#FF541E] to-[#FF7A00] text-white flex items-center justify-center shadow-sm">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-slate-100 font-heading">
              Live Courier Tracking
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${hasLiveSocketGps ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
              <span>
                {hasLiveSocketGps
                  ? 'Live Rider GPS Stream Connected'
                  : isInTransit
                  ? 'Estimated Live Route Telemetry'
                  : 'Google Maps Route Locked'}
              </span>
            </p>
          </div>
        </div>

        {/* ETA + Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-slate-800 text-white font-bold flex items-center space-x-1.5 shadow-xs">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span>{order?.status === 'delivered' ? 'Arrived!' : `ETA ~${remainingMins}m`}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 font-bold">
            {order?.status === 'delivered' ? '0.0 km' : `${remainingKm} km away`}
          </div>

          {/* Toggle Google Maps vs Route Radar */}
          <div className="inline-flex p-0.5 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMapMode('google')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                mapMode === 'google'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs'
                  : 'text-neutral-500 dark:text-slate-400'
              }`}
            >
              <Map className="h-3 w-3" />
              <span>Google Maps</span>
            </button>
            <button
              type="button"
              onClick={() => setMapMode('radar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                mapMode === 'radar'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs'
                  : 'text-neutral-500 dark:text-slate-400'
              }`}
            >
              <Compass className="h-3 w-3" />
              <span>Route Radar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Viewport */}
      {mapMode === 'google' ? (
        <div className="relative w-full h-72 sm:h-84 rounded-2xl overflow-hidden border border-neutral-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
          <iframe
            title="Live Google Maps Delivery Route"
            src={googleEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Top-Left Live Speed & Distance Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold border border-slate-700/80 flex items-center gap-1.5 shadow-lg">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>
                {order?.status === 'delivered'
                  ? 'Delivered'
                  : `${remainingKm} km • ${liveSpeedKmh} km/h`}
              </span>
            </span>
          </div>

          {/* Bottom Floating Rider Card */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-slate-900/92 backdrop-blur-md rounded-2xl p-3 border border-slate-700/80 text-white text-xs flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 p-1 ring-1 ring-brand-500/30">
                <img src="/crave-courier-rider.png" alt="Courier" className="h-7 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 font-bold">
                  <span className="truncate">{order?.deliveryPartner?.name || 'Crave Express Rider'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1 flex-shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {order?.status === 'delivered' ? 'Arrived' : isInTransit ? 'En Route' : 'Assigned'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate max-w-[220px] mt-0.5">
                  {order?.deliveryAddress?.street || 'Delivering to your pin'}
                </p>
              </div>
            </div>

            {order?.deliveryPartner?.phone && (
              <a
                href={`tel:${order.deliveryPartner.phone}`}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 flex-shrink-0 transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span>Call</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Upgraded Route Radar View */
        <div className="relative w-full h-72 sm:h-84 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center select-none">
          <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none">
            <defs>
              <pattern id="street-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#64748B" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#street-grid)" />
          </svg>

          <div className="absolute top-8 left-12 w-44 h-32 rounded-full bg-emerald-950/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-6 right-16 w-52 h-36 rounded-full bg-brand-950/20 blur-2xl pointer-events-none" />

          <svg
            viewBox="0 0 600 320"
            className="w-full h-full absolute inset-0 preserve-3d"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="M 10 270 L 590 270 M 110 30 L 110 300 M 470 20 L 470 300 M 30 140 L 570 140"
              stroke="#1E293B"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 10 270 L 590 270 M 110 30 L 110 300 M 470 20 L 470 300 M 30 140 L 570 140"
              stroke="#0F172A"
              strokeWidth="6"
              strokeLinecap="round"
            />

            <path
              d={`M ${startPt.x} ${startPt.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPt.x} ${endPt.y}`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="6"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />

            <path
              d={`M ${startPt.x} ${startPt.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPt.x} ${endPt.y}`}
              fill="none"
              stroke="#10B981"
              strokeWidth="5"
              strokeDasharray="8 6"
              strokeDashoffset={-progress * 2.5}
              strokeLinecap="round"
            />

            <g transform={`translate(${startPt.x}, ${startPt.y})`}>
              <circle r="16" fill="#FF541E" fillOpacity="0.2" className="animate-ping" />
              <circle r="11" fill="#FF541E" />
              <circle r="5" fill="#FFFFFF" />
              <text y="25" textAnchor="middle" fill="#FDBA74" fontSize="10" fontWeight="bold">
                Pizza 65 Hub
              </text>
            </g>

            <g transform={`translate(${endPt.x}, ${endPt.y})`}>
              <circle r="16" fill="#10B981" fillOpacity="0.2" className="animate-ping" />
              <circle r="11" fill="#10B981" />
              <circle r="5" fill="#FFFFFF" />
              <text y="25" textAnchor="middle" fill="#86EFAC" fontSize="10" fontWeight="bold">
                Customer Pin
              </text>
            </g>

            <g transform={`translate(${riderX}, ${riderY})`}>
              <circle r="24" fill="#FF541E" fillOpacity="0.2" className="animate-pulse" />
              <circle r="17" fill="#FFFFFF" stroke="#FF541E" strokeWidth="2.5" />
              <image href="/crave-courier-rider.png" x="-12" y="-10" width="24" height="20" />
              <g transform="translate(0, -22)">
                <rect x="-42" y="-14" width="84" height="16" rx="8" fill="#0F172A" stroke="#FF541E" strokeWidth="1" />
                <text x="0" y="-3" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" className="font-mono">
                  {order?.status === 'delivered' ? 'ARRIVED' : `RIDER ${liveSpeedKmh} km/h`}
                </text>
              </g>
            </g>
          </svg>

          <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-700/80 text-white text-xs flex items-center space-x-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 p-1 ring-1 ring-brand-500/30">
              <Bike className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 font-bold">
                <span className="truncate">{order?.deliveryPartner?.name || 'Assigned Courier'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">
                  {progress}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px] mt-0.5">
                {order?.deliveryAddress?.street || 'Delivering fresh to your doorstep'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Telemetry & Progress Bar */}
      <div className="bg-neutral-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-slate-800 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-bold text-neutral-800 dark:text-slate-200">
              Total Route: {totalDistanceKm.toFixed(1)} km
            </span>
            <span className="text-neutral-400 hidden sm:inline">&bull; Pin: {customerCoords[1].toFixed(4)}, {customerCoords[0].toFixed(4)}</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-semibold text-neutral-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand-500" />
              {hasLiveSocketGps ? 'Live GPS Sync' : 'Route Ready'}
            </span>
            {liveLocation?.timestamp && (
              <span className="font-mono">
                Ping: {new Date(liveLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF541E] via-amber-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
          />
        </div>
      </div>

      {/* Wake Lock & Open Route in Google Maps Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => toggleBackgroundTracking()}
          className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition text-xs font-bold ${
            isBgTrackingActive
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-neutral-100 dark:bg-slate-800/80 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <Smartphone className={`h-4 w-4 ${isBgTrackingActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`} />
            <div className="text-left">
              <div>{isBgTrackingActive ? 'Background Wake Lock: Active' : 'Keep Screen & GPS Tracking Active'}</div>
              <div className="text-[10px] font-normal opacity-80">
                {isBgTrackingActive ? 'Prevents sleep while courier is moving' : 'Request wake lock & persistent tracking'}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
            isBgTrackingActive ? 'bg-emerald-600 text-white' : 'bg-neutral-300 dark:bg-slate-700 text-neutral-800 dark:text-slate-200'
          }`}>
            {isBgTrackingActive ? 'ON' : 'ENABLE'}
          </span>
        </button>

        <a
          href={googleDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF541E] to-[#FF7A00] hover:from-[#E03E00] hover:to-[#F56E00] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Open Route in Google Maps</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
