import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useNotificationStore } from './store/useNotificationStore';
import { useThemeStore } from './store/useThemeStore';
import { connectSocket, disconnectSocket } from './services/socket';

// Layout & Core Global Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import FloatingCartButton from './components/FloatingCartButton';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import ApkUpdatePrompt from './components/ApkUpdatePrompt';
import FirstTimeSignupModal from './components/FirstTimeSignupModal';
import AuthRequiredModal from './components/AuthRequiredModal';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import ToastContainer from './components/notifications/ToastContainer';
import NotificationDrawer from './components/notifications/NotificationDrawer';
import ErrorBoundary from './components/ErrorBoundary';
import {
  showClientPushNotification,
  requestPushPermission,
} from './services/pushNotification';
import {
  playAdminNewOrderSound,
  playStatusUpdateSound,
} from './services/soundEffects';

// Route-Level Code Splitting (Lighthouse Performance Optimization)
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListingPage = lazy(() => import('./pages/ProductListingPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

// Authentication Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

// Route Loading Spinner / Fallback
function RouteLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-10 w-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-neutral-400 font-heading tracking-wider uppercase animate-pulse">
          Loading Crave...
        </span>
      </div>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPartnerRoute = location.pathname.startsWith('/partner');
  const isCheckoutRoute = location.pathname.startsWith('/checkout');
  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/verify-email') ||
    location.pathname.startsWith('/forgot-password');

  const hideBottomPadding = isAdminRoute || isPartnerRoute || isCheckoutRoute || isAuthRoute;

  return (
    <div
      className={`min-h-screen ${
        isAdminRoute
          ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
          : 'bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-slate-100'
      } flex flex-col justify-between font-sans transition-colors duration-200 overflow-x-hidden`}
    >
      <Navbar />
      <ToastContainer />
      <NotificationDrawer />
      <AuthRequiredModal />

      <main className={`flex-1 ${hideBottomPadding ? 'pb-4 flex flex-col' : 'pb-28 md:pb-8'}`}>
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Customer Storefront (Home) - Protected */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />

              {/* Catalog & Product Discovery - Protected */}
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <ProductListingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/:identifier"
                element={
                  <ProtectedRoute>
                    <ProductDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/product/:identifier"
                element={
                  <ProtectedRoute>
                    <ProductDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/product"
                element={
                  <ProtectedRoute>
                    <ProductListingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/menu"
                element={
                  <ProtectedRoute>
                    <ProductListingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <WishlistPage />
                  </ProtectedRoute>
                }
              />

              {/* Shopping Cart & 3-Step Checkout (Protected) */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />

              {/* Orders & Real-time Tracking */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Delivery Partner Portal (Role: delivery or admin) */}
              <Route
                path="/partner"
                element={
                  <RoleRoute allowedRoles={['delivery', 'admin']}>
                    <DeliveryDashboard />
                  </RoleRoute>
                }
              />

              {/* Admin Control Center (Role: admin) */}
              <Route
                path="/admin"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RoleRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Global Floating Cart Button */}
      <FloatingCartButton />

      {/* First-Time Visitor Signup to Order Welcome Modal */}
      <FirstTimeSignupModal />

      {/* Install PWA Prompt Banner */}
      <InstallPwaPrompt />

      {/* Conditional APK Update Prompt (only shown in native APK when a newer version is pushed) */}
      <ApkUpdatePrompt />

      {/* Mobile Sticky Bottom Navigation Bar (md:hidden) */}
      <BottomNav />

      {!isAdminRoute && !isPartnerRoute && (
        <footer className="hidden md:block bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-neutral-400 dark:text-slate-500 safe-bottom transition-colors duration-200">
          Crave Food & Grocery Delivery &bull; Modern Design System &bull; Production Architecture
        </footer>
      )}
    </div>
  );
}

export default function App() {
  const { checkAuth, isAuthenticated, user, accessToken } = useAuthStore();
  const { fetchNotifications, handleIncomingNotification, refreshPermission, addToast } = useNotificationStore();
  const { initTheme } = useThemeStore();

  // Initialize Dark / Light theme
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Check auth session & sync notification permission state
  useEffect(() => {
    checkAuth();
    refreshPermission();
  }, [checkAuth, refreshPermission]);

  // Real-Time Socket Connection, Notification Permission & Chime Listeners
  useEffect(() => {
    if (isAuthenticated && user) {
      const socket = connectSocket(accessToken);
      fetchNotifications();
      requestPushPermission().then(() => refreshPermission());

      const onNewNotification = (notification) => {
        handleIncomingNotification(notification);
      };

      const onAdminNewOrder = (data) => {
        if (user.role !== 'admin') return;
        playAdminNewOrderSound();
        const title = `🚨 New Order Received! #${data?.orderNumber || ''}`;
        const message = `${data?.customerName || 'Customer'} placed an order (₹${data?.grandTotal || 0})`;
        showClientPushNotification({ title, body: message, data });
        addToast({
          id: `admin-order-${data?.orderId || Date.now()}`,
          title,
          message,
          type: 'admin_new_order',
          orderId: data?.orderId,
          orderNumber: data?.orderNumber,
        });
      };

      const onOrderStatusUpdated = (data) => {
        if (!data?.status) return;
        playStatusUpdateSound(data.status);
        const orderNum = data?.orderNumber || data?.order?.orderNumber || '';
        const statusLabel = String(data.status).replace(/_/g, ' ');
        const title = `Order #${orderNum} ${statusLabel}`;
        const message = `Your order status is now ${statusLabel}.`;
        showClientPushNotification({ title, body: message, data });
      };

      socket.on('notification:new', onNewNotification);
      socket.on('admin:new_order', onAdminNewOrder);
      socket.on('order:status_updated', onOrderStatusUpdated);

      return () => {
        socket.off('notification:new', onNewNotification);
        socket.off('admin:new_order', onAdminNewOrder);
        socket.off('order:status_updated', onOrderStatusUpdated);
      };
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user, accessToken, fetchNotifications, handleIncomingNotification, refreshPermission, addToast]);

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
