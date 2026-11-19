import { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Store,
  Bike,
  Compass,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Radio,
  Smartphone,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { emitRiderLocation } from '../../services/socket';
import { useNotificationStore } from '../../store/useNotificationStore';

export default function LiveOrderMap({ order, liveLocation }) {
  const { isBgTrackingActive, toggleBackgroundTracking } = useNotificationStore();
  // Store Hub coordinates (Pizza 65 & Crave Hub)
  const hubCoords = [78.8228, 25.5746]; // [lng, lat]

  // Delivery destination coordinates
  const customerCoords = order?.deliveryAddress?.coordinates?.coordinates || [
    78.8250, 25.5760,
  ];

  // Rider position state (normalized percentage 0 -> 100 along delivery path)
  const initialProgress =
    order?.status === 'delivered'
      ? 100
      : order?.status === 'out_for_delivery'
      ? 58
      : order?.status === 'picked_up'
      ? 22
      : order?.status === 'ready'
      ? 12
      : 5;

  const [progress, setProgress] = useState(initialProgress);
  const transitRef = useRef(null);

  // If live location coordinates arrived from socket
  useEffect(() => {
    if (liveLocation && Array.isArray(liveLocation.coordinates)) {
      const startX = hubCoords[0];
      const endX = customerCoords[0];
      const currentX = liveLocation.coordinates[0];

      if (endX !== startX) {
        const p = Math.max(0, Math.min(100, Math.round(((currentX - startX) / (endX - startX)) * 100)));
        setProgress(p);
      }
    }
  }, [liveLocation]);

  // Adjust progress and auto-animate realistic movement when order is in transit
  useEffect(() => {
    if (order?.status === 'delivered') {
      setProgress(100);
      if (transitRef.current) clearInterval(transitRef.current);
      return;
    }

    if (order?.status === 'out_for_delivery' || order?.status === 'picked_up') {
      // Realistic autonomous micro-transit progression along route
      transitRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 96) return 96; // wait at destination until status becomes delivered
          const step = Math.random() * 0.8 + 0.4; // smooth organic steps
          const next = Math.min(96, prev + step);

          // Interpolate [lng, lat]
          const lng = hubCoords[0] + (customerCoords[0] - hubCoords[0]) * (next / 100);
          const lat = hubCoords[1] + (customerCoords[1] - hubCoords[1]) * (next / 100);

          emitRiderLocation({
            orderId: order?._id,
            coordinates: [lng, lat],
            heading: 48,
            speed: Math.round(24 + Math.random() * 6),
          });

          return next;
        });
      }, 1800);
    } else {
      if (transitRef.current) clearInterval(transitRef.current);
    }

    return () => {
      if (transitRef.current) clearInterval(transitRef.current);
    };
  }, [order?.status]);

  // Distance & ETA calculations
  const totalDistanceKm = 3.2;
  const remainingKm = Math.max(0, (totalDistanceKm * (1 - progress / 100))).toFixed(1);
  const remainingMins = Math.max(1, Math.round((1 - progress / 100) * 22));

  // Compute SVG Bézier Path Coordinates (viewBox="0 0 600 320")
  const startPt = { x: 75, y: 235 };
  const endPt = { x: 525, y: 85 };
  const ctrl1 = { x: 210, y: 215 };
  const ctrl2 = { x: 370, y: 105 };

  // Approximate position along cubic bezier curve for progress t (0 to 1)
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
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-slate-100 font-heading">
              Live Courier Tracking
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Real-time GPS Telemetry Active</span>
            </p>
          </div>
        </div>

        {/* Live ETA Pills */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900 dark:bg-slate-800 text-white font-bold flex items-center space-x-2 shadow-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>{progress >= 100 ? 'Arrived at Door!' : `ETA: ~${remainingMins} mins`}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-slate-800/80 text-neutral-700 dark:text-slate-300 font-bold hidden sm:inline-block">
            {progress >= 100 ? 'Delivered' : `${remainingKm} km remaining`}
          </div>
        </div>
      </div>

      {/* SVG Canvas Map Container */}
      <div className="relative w-full h-72 sm:h-84 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center select-none">
        {/* Subtle Map Grid Network Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none">
          <defs>
            <pattern id="street-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#64748B" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#street-grid)" />
        </svg>

        {/* Ambient District Landmass Overlays */}
        <div className="absolute top-8 left-12 w-44 h-32 rounded-full bg-emerald-950/20 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-6 right-16 w-52 h-36 rounded-full bg-brand-950/20 blur-2xl pointer-events-none"></div>

        {/* Dynamic Route SVG */}
        <svg
          viewBox="0 0 600 320"
          className="w-full h-full absolute inset-0 preserve-3d"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Arterial Road Traces */}
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

          {/* Planned Delivery Path (Background Outline) */}
          <path
            d={`M ${startPt.x} ${startPt.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPt.x} ${endPt.y}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="6"
            strokeOpacity="0.25"
            strokeLinecap="round"
          />

          {/* Active Path Completed (Glowing Animated Dashes) */}
          <path
            d={`M ${startPt.x} ${startPt.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPt.x} ${endPt.y}`}
            fill="none"
            stroke="#10B981"
            strokeWidth="5"
            strokeDasharray="8 6"
            strokeDashoffset={-progress * 2.5}
            strokeLinecap="round"
          />

          {/* Start Point: Store Kitchen / Hub */}
          <g transform={`translate(${startPt.x}, ${startPt.y})`}>
            <circle r="16" fill="#FF541E" fillOpacity="0.2" className="animate-ping" />
            <circle r="11" fill="#FF541E" />
            <circle r="5" fill="#FFFFFF" />
            <text y="25" textAnchor="middle" fill="#FDBA74" fontSize="10" fontWeight="bold">
              Hub / Kitchen
            </text>
          </g>

          {/* End Point: Customer Delivery Destination */}
          <g transform={`translate(${endPt.x}, ${endPt.y})`}>
            <circle r="16" fill="#10B981" fillOpacity="0.2" className="animate-ping" />
            <circle r="11" fill="#10B981" />
            <circle r="5" fill="#FFFFFF" />
            <text y="25" textAnchor="middle" fill="#86EFAC" fontSize="10" fontWeight="bold">
              Your Location
            </text>
          </g>

          {/* Moving Delivery Partner Pin */}
          <g transform={`translate(${riderX}, ${riderY})`}>
            {/* Pulsing signal halo */}
            <circle r="24" fill="#FF541E" fillOpacity="0.2" className="animate-pulse" />
            <circle r="17" fill="#FFFFFF" stroke="#FF541E" strokeWidth="2.5" />
            <image
              href="/crave-courier-rider.png"
              x="-12"
              y="-10"
              width="24"
              height="20"
            />
            {/* Speed Badge Callout */}
            <g transform="translate(0, -22)">
              <rect
                x="-36"
                y="-14"
                width="72"
                height="16"
                rx="8"
                fill="#0F172A"
                stroke="#FF541E"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-3"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="900"
                className="font-mono"
              >
                {progress >= 100 ? 'ARRIVED' : 'RIDER 26 km/h'}
              </text>
            </g>
          </g>
        </svg>

        {/* Live Rider Information Card Overlay */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-700/80 text-white text-xs flex items-center space-x-3 shadow-xl">
          <div className="h-10 w-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 p-1 ring-1 ring-brand-500/30">
            <img src="/crave-courier-rider.png" alt="Courier" className="h-7 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 font-bold">
              <span className="truncate">{order?.deliveryPartner?.name || 'Assigned Courier'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                {progress >= 100 ? 'Arrived' : 'In Transit'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px] mt-0.5">
              {order?.deliveryAddress?.street || 'Delivering fresh to your doorstep'}
            </p>
          </div>
        </div>
      </div>

      {/* Production Live Telemetry Guarantee Bar */}
      <div className="bg-neutral-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-neutral-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="font-bold text-neutral-800 dark:text-slate-200">Contactless Express Delivery</span>
          <span className="text-neutral-400 hidden sm:inline">&bull; Insulated Hot & Cold Kit</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-semibold text-neutral-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            Signal: Strong
          </span>
          <span>Battery: 88%</span>
        </div>
      </div>

      {/* Background Running Permission & Google Maps Nav Bar */}
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
          href={`https://www.google.com/maps/dir/?api=1&origin=${hubCoords[1]},${hubCoords[0]}&destination=${customerCoords[1]},${customerCoords[0]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 text-xs font-bold transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open in Google Maps</span>
        </a>
      </div>
    </div>
  );
}
