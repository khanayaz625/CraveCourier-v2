import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { useCartStore } from '../store/useCartStore';
import { useThemeStore } from '../store/useThemeStore';
import { useNotificationStore } from '../store/useNotificationStore';
import LocationPickerModal from '../components/location/LocationPickerModal';
import {
  User,
  Package,
  Heart,
  ShoppingBag,
  Shield,
  Bike,
  LogOut,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  ChevronRight,
  MapPin,
  Lock,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  Bell,
  Trash2,
  Plus,
  Navigation,
  Smartphone,
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

export default function AccountPage() {
  const { user, isAuthenticated, logout, toggle2FA } = useAuthStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const cartItems = useCartStore((state) => state.items);
  const { theme, toggleTheme } = useThemeStore();
  const { soundEnabled, toggleSound, openDrawer, unreadCount } = useNotificationStore();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // 2-Factor Mobile Authentication states
  const [twoFactorActive, setTwoFactorActive] = useState(user?.twoFactorEnabled || false);
  const [twoFactorPhone, setTwoFactorPhone] = useState(user?.phone || '');
  const [toggling2FA, setToggling2FA] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setTwoFactorActive(Boolean(user.twoFactorEnabled));
      if (user.phone) setTwoFactorPhone(user.phone);
    }
  }, [user]);

  const handleToggle2FA = async (targetState) => {
    if (targetState && !twoFactorPhone.trim()) {
      setTwoFactorMsg('Please enter a valid mobile number first.');
      return;
    }
    setToggling2FA(true);
    setTwoFactorMsg('');
    try {
      const res = await toggle2FA(targetState, twoFactorPhone.trim());
      setTwoFactorActive(res?.twoFactorEnabled);
      setTwoFactorMsg(
        res?.twoFactorEnabled
          ? '2-Factor Mobile Security enabled! Every login will now require SMS OTP.'
          : '2-Factor Authentication disabled.'
      );
    } catch (err) {
      setTwoFactorMsg(err.message || 'Failed to update 2-Factor Authentication settings.');
    } finally {
      setToggling2FA(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingAddresses(true);
      api.get('/users/addresses')
        .then((res) => setAddresses(res.data || []))
        .catch((err) => console.warn('Failed to load addresses:', err))
        .finally(() => setLoadingAddresses(false));
    }
  }, [isAuthenticated]);

  const handleSaveAddress = async (addressData) => {
    const res = await api.post('/users/addresses', addressData);
    setAddresses(res.data || []);
  };

  const handleDeleteAddress = async (id) => {
    try {
      const res = await api.delete(`/users/addresses/${id}`);
      setAddresses(res.data || []);
    } catch (err) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6 pb-28 md:pb-12 animate-fade-in">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 font-heading">
            {isAuthenticated ? 'My Account' : 'Account & Settings'}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            {isAuthenticated ? 'Manage profile, orders, and app preferences' : 'Sign in to access your profile and track orders'}
          </p>
        </div>
      </div>

      {isAuthenticated && user ? (
        <>
          {/* User Profile Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-slate-800 shadow-soft flex items-center space-x-4">
            <UserAvatar user={user} size="lg" className="h-16 w-16 !text-lg !rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100 truncate font-heading">
                  {user.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  {user.role}
                </span>
              </div>

              <div className="mt-1 space-y-0.5 text-xs text-neutral-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stat Shortcuts */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <Link
              to="/orders"
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-soft text-center hover:border-brand-300 transition-colors"
            >
              <Package className="h-5 w-5 mx-auto text-brand-500 mb-1" />
              <span className="block text-xs font-bold text-neutral-900 dark:text-slate-100">Orders</span>
              <span className="text-[10px] text-neutral-400">View History</span>
            </Link>

            <Link
              to="/wishlist"
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-soft text-center hover:border-rose-300 transition-colors"
            >
              <Heart className="h-5 w-5 mx-auto text-rose-500 mb-1" />
              <span className="block text-xs font-bold text-neutral-900 dark:text-slate-100">Wishlist</span>
              <span className="text-[10px] text-neutral-400">{wishlistItems.length} Saved</span>
            </Link>

            <Link
              to="/cart"
              className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-soft text-center hover:border-emerald-300 transition-colors"
            >
              <ShoppingBag className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <span className="block text-xs font-bold text-neutral-900 dark:text-slate-100">Cart</span>
              <span className="text-[10px] text-neutral-400">{cartItems.length} Items</span>
            </Link>
          </div>

          {/* Navigation Links Group */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-soft divide-y divide-neutral-100 dark:divide-slate-800 overflow-hidden">
            {/* Notifications Drawer Trigger */}
            <button
              type="button"
              onClick={openDrawer}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] px-0.5 rounded-full bg-brand-500 text-white text-[8px] font-black flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-slate-100">
                      Notifications & Order Alerts
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">View real-time delivery milestones & order updates</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            </button>

            <Link
              to="/orders"
              className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-slate-100">My Orders & Live Tracking</h3>
                  <p className="text-[11px] text-neutral-400">Track active deliveries and review receipt history</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            </Link>

            {user.role === 'delivery' && (
              <Link
                to="/partner"
                className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Bike className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-slate-100">Courier Partner Dashboard</h3>
                    <p className="text-[11px] text-neutral-400">Manage orders, GPS status, and earnings</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </Link>
            )}

            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-slate-100">Craved Admin Control Center</h3>
                    <p className="text-[11px] text-neutral-400">Catalog, orders, couriers, and business analytics</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </Link>
            )}
          </div>

          {/* Saved Delivery Addresses Section with Live GPS & Google Maps */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-soft p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-slate-100 font-heading">
                    Saved Delivery Addresses
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    GPS coordinates &amp; doorstep delivery locations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Address</span>
              </button>
            </div>

            {loadingAddresses ? (
              <div className="py-4 text-center text-xs text-neutral-400">Loading your addresses...</div>
            ) : addresses.length === 0 ? (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-slate-800/50 border border-neutral-200/60 dark:border-slate-700/60 text-center space-y-2">
                <p className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                  No delivery address saved yet
                </p>
                <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                  Auto-detect your location with live GPS and Google Maps to enable 1-tap checkout.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-brand-600"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Auto-Detect My Current Location</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className="p-3.5 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-neutral-900 dark:text-slate-100">
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium mt-0.5 line-clamp-1">
                        {addr.street}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr._id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two-Factor Mobile Authentication (2FA) Security Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-soft p-4 sm:p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs transition-colors ${
                  twoFactorActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-brand-50 dark:bg-brand-950/60 text-brand-500'
                }`}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-slate-100 font-heading">
                      Two-Factor Mobile Authentication (2FA)
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      twoFactorActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-slate-800 dark:text-neutral-400'
                    }`}>
                      {twoFactorActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Require a secure 6-digit one-time SMS passcode on every sign in to protect your wallet and account.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                disabled={toggling2FA}
                onClick={() => handleToggle2FA(!twoFactorActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  twoFactorActive ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={twoFactorActive}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    twoFactorActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mobile Number Setup / Verification Input */}
            <div className="pt-2 border-t border-neutral-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2 flex-1">
                <Smartphone className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                <input
                  type="tel"
                  value={twoFactorPhone}
                  onChange={(e) => setTwoFactorPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number (+91)"
                  className="flex-1 text-xs px-3 py-2 border border-neutral-200 dark:border-slate-700 bg-neutral-50/70 dark:bg-slate-800/60 text-neutral-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none font-mono"
                />
              </div>

              <button
                type="button"
                disabled={toggling2FA || !twoFactorPhone.trim()}
                onClick={() => handleToggle2FA(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-xs transition-transform active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {toggling2FA ? 'Saving...' : twoFactorActive ? 'Update Mobile 2FA' : 'Save & Enable 2FA'}
              </button>
            </div>

            {twoFactorMsg && (
              <p className={`text-[11px] font-medium pt-1 ${twoFactorActive ? 'text-emerald-600' : 'text-neutral-500'}`}>
                {twoFactorMsg}
              </p>
            )}
          </div>

          {/* Location Picker Modal */}
          <LocationPickerModal
            isOpen={showAddressModal}
            onClose={() => setShowAddressModal(false)}
            onSaveAddress={handleSaveAddress}
            userPhone={user?.phone || ''}
          />
        </>
      ) : (
        /* Guest Unauthenticated Welcome Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-slate-800 shadow-soft text-center space-y-4 relative overflow-hidden">
          <div className="h-14 w-14 rounded-2xl mx-auto flex items-center justify-center bg-brand-500/10 text-brand-500">
            <User className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-slate-100 font-heading">
              Welcome to Cravecourier
            </h2>
            <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-sm mx-auto">
              Sign in to view your orders, save delivery addresses, and enjoy instant 20-minute delivery.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center max-w-sm mx-auto">
            <Link
              to="/login"
              className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-md shadow-brand-500/20 text-center"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-neutral-800 dark:text-slate-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* App Preferences (Theme & Sound Toggles) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-soft p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 font-heading">
          App Preferences
        </h3>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-neutral-600 dark:text-slate-300">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-amber-400" /> : <Sun className="h-4 w-4 text-slate-700" />}
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-slate-100 block">Appearance</span>
              <span className="text-[11px] text-neutral-400">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 transition-colors"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-neutral-100 dark:border-slate-800 pt-3">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-neutral-600 dark:text-slate-300">
              {soundEnabled ? <Volume2 className="h-4 w-4 text-brand-500" /> : <VolumeX className="h-4 w-4 text-neutral-400" />}
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-slate-100 block">Notification Sound</span>
              <span className="text-[11px] text-neutral-400">{soundEnabled ? 'Chimes Enabled' : 'Muted'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              soundEnabled
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300'
                : 'bg-neutral-100 text-neutral-500 dark:bg-slate-800'
            }`}
          >
            {soundEnabled ? 'Sound On' : 'Muted'}
          </button>
        </div>
      </div>

      {/* App Version Info */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-soft p-4 sm:p-5">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-500 shadow-xs flex-shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-neutral-900 dark:text-slate-100 block">CraveCourier App</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                v2.0.0
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">Official Mobile Edition</span>
          </div>
        </div>
      </div>

      {/* Logout Button (When Authenticated) */}
      {isAuthenticated && (
        <div className="pt-2">
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-2 border border-rose-200/60 dark:border-rose-900/60"
          >
            <LogOut className="h-4 w-4" />
            <span>{loggingOut ? 'Signing Out...' : 'Sign Out of Crave'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
