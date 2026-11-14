import { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Store,
  Bike,
  Compass,
  Play,
  Square,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { emitRiderLocation } from '../../services/socket';

export default function LiveOrderMap({ order, liveLocation }) {
  // Store Hub coordinates (Pizza 65 & Crave Chirgaon Hub)
  const hubCoords = [78.8228, 25.5746]; // [lng, lat]

  // Delivery destination coordinates
  const customerCoords = order?.deliveryAddress?.coordinates?.coordinates || [
    78.8250, 25.5760,
  ];

  // Rider position state (normalized percentage 0 -> 100 along delivery path)
  const [progress, setProgress] = useState(
    order?.status === 'delivered'
      ? 100
      : order?.status === 'out_for_delivery'
      ? 60
      : order?.status === 'picked_up'
      ? 20
      : 5
  );

  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef(null);

  // If live location coordinates arrived from socket
  useEffect(() => {
    if (liveLocation && Array.isArray(liveLocation.coordinates)) {
      // Calculate progress between hub and customer based on coordinates
      const startX = hubCoords[0];
      const endX = customerCoords[0];
      const currentX = liveLocation.coordinates[0];

      if (endX !== startX) {
        const p = Math.max(0, Math.min(100, Math.round(((currentX - startX) / (endX - startX)) * 100)));
        setProgress(p);
      }
    }
  }, [liveLocation]);

  // Adjust progress when order status changes
  useEffect(() => {
    if (order?.status === 'delivered') setProgress(100);
    else if (order?.status === 'out_for_delivery' && progress < 40) setProgress(50);
    else if (order?.status === 'picked_up' && progress < 15) setProgress(20);
  }, [order?.status]);

  // Simulation runner: steps progress 0 -> 100 and emits real socket event
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simulationRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      let curr = progress >= 95 ? 10 : progress;

      simulationRef.current = setInterval(() => {
        curr += 3;
        if (curr >= 100) {
          curr = 100;
          clearInterval(simulationRef.current);
          setIsSimulating(false);
        }
        setProgress(curr);

        // Interpolate [lng, lat]
        const lng = hubCoords[0] + (customerCoords[0] - hubCoords[0]) * (curr / 100);
        const lat = hubCoords[1] + (customerCoords[1] - hubCoords[1]) * (curr / 100);

        // Emit through socket so all listening clients see live movement
        emitRiderLocation({
          orderId: order?._id,
          coordinates: [lng, lat],
          heading: 42,
          speed: 28,
        });
      }, 700);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, []);

  // Distance calculations
  const totalDistanceKm = 3.6;
  const remainingKm = Math.max(0, (totalDistanceKm * (1 - progress / 100))).toFixed(1);
  const remainingMins = Math.max(1, Math.round((1 - progress / 100) * 25));

  // Compute SVG Bézier Path Coordinates
  // viewBox="0 0 600 320"
  const startPt = { x: 80, y: 240 };
  const endPt = { x: 520, y: 80 };
  const ctrl1 = { x: 200, y: 220 };
  const ctrl2 = { x: 380, y: 100 };

  // Approximate position along cubic bezier curve for progress t (0 to 1)
  const t = progress / 100;
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
    <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4 overflow-hidden">
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
              Live Delivery Route Map
            </h3>
            <p className="text-[11px] text-neutral-500">
              Real-time GPS telemetry via Socket.io order room
            </p>
          </div>
        </div>

        {/* Live ETA Pills */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white font-bold flex items-center space-x-1.5 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{progress >= 100 ? 'Arrived!' : `ETA: ~${remainingMins} mins`}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-700 font-bold hidden sm:inline-block">
            {progress >= 100 ? 'Delivered' : `${remainingKm} km left`}
          </div>
        </div>
      </div>

      {/* SVG Canvas Map Container */}
      <div className="relative w-full h-72 sm:h-80 rounded-2xl bg-neutral-900 overflow-hidden border border-neutral-800 shadow-inner flex items-center justify-center select-none">
        {/* Map Grid Roads Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpace">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#666" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Dynamic Route SVG */}
        <svg
          viewBox="0 0 600 320"
          className="w-full h-full absolute inset-0 preserve-3d"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle roadmap street traces */}
          <path
            d="M 20 280 L 580 280 M 120 40 L 120 290 M 480 30 L 480 290"
            stroke="#262626"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Planned Delivery Path (Background Outline) */}
          <path
            d={`M ${startPt.x} ${startPt.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPt.x} ${endPt.y}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="6"
            strokeOpacity="0.3"
            strokeLinecap="round"
          />

          {/* Active Path Completed (Glow) */}
          <path
            d={`M ${startPt.x} ${startPt.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${endPt.x} ${endPt.y}`}
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeDasharray="8 6"
            strokeDashoffset={-progress * 2}
            strokeLinecap="round"
            className="animate-pulse"
          />

          {/* Start Point: Store Hub */}
          <g transform={`translate(${startPt.x}, ${startPt.y})`}>
            <circle r="14" fill="#f97316" fillOpacity="0.2" className="animate-ping" />
            <circle r="10" fill="#f97316" />
            <text y="24" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="bold">
              Hub (Store)
            </text>
          </g>

          {/* End Point: Customer Delivery Address */}
          <g transform={`translate(${endPt.x}, ${endPt.y})`}>
            <circle r="14" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
            <circle r="10" fill="#10b981" />
            <text y="24" textAnchor="middle" fill="#86efac" fontSize="10" fontWeight="bold">
              You (Home)
            </text>
          </g>

          {/* Moving Delivery Partner Scooter */}
          <g transform={`translate(${riderX}, ${riderY})`}>
            {/* Pulsing halo */}
            <circle r="22" fill="#FF541E" fillOpacity="0.25" className="animate-pulse" />
            <circle r="16" fill="#FFFFFF" stroke="#FF541E" strokeWidth="2" />
            {/* Real Cravecourier Rider image */}
            <image
              href="/crave-courier-rider.png"
              x="-12"
              y="-9"
              width="24"
              height="18"
            />
            <text
              y="-20"
              textAnchor="middle"
              fill="#FF541E"
              fontSize="10"
              fontWeight="900"
              className="font-mono tracking-wider drop-shadow-sm"
            >
              RIDER {progress}%
            </text>
          </g>
        </svg>

        {/* Live Status Overlay Card */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-neutral-900/90 backdrop-blur-md rounded-xl p-3 border border-neutral-700 text-white text-xs flex items-center space-x-3 shadow-lg">
          <div className="h-9 w-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0 p-1">
            <img src="/crave-courier-rider.png" alt="Rider" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 font-bold">
              <span>{order?.deliveryPartner?.name || 'Rider Assigned'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">
                {progress >= 100 ? 'At Door' : '26 km/h'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[200px]">
              {order?.deliveryAddress?.street || 'En route to your location'}
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Control Bar for Testing */}
      <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="font-bold text-neutral-700">Developer GPS Simulator:</span>
          <span className="text-neutral-500 text-[11px] hidden sm:inline">
            Streams real coordinates over Socket.io
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleSimulation}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs ${
              isSimulating
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="h-3 w-3 fill-current" />
                <span>Stop GPS</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Simulate Rider GPS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

