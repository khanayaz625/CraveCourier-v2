import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useNotificationStore } from './store/useNotificationStore';
import { useThemeStore } from './store/useThemeStore';
import { connectSocket, disconnectSocket } from './services/socket';

// Layout & Core Global Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import FloatingCartButton from './components/FloatingCartButton';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import ToastContainer from './components/notifications/ToastContainer';
import {
  showClientPushNotification,
  requestPushPermission,
} from './services/pushNotification';

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

export default function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const { fetchNotifications, handleIncomingNotification } = useNotificationStore();
  const { initTheme } = useThemeStore();

  // Initialize Dark / Light theme
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Check auth session
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Real-Time Socket Connection & Notification Push Listener
  useEffect(() => {
    if (isAuthenticated && user) {
      const socket = connectSocket();
      fetchNotifications();
      requestPushPermission();

      const onNewNotification = (notification) => {
        handleIncomingNotification(notification);
        showClientPushNotification({
          title: notification.title || 'Crave Order Update 🛍️',
          body: notification.message,
          data: notification.data,
        });
      };

      socket.on('notification:new', onNewNotification);

      return () => {
        socket.off('notification:new', onNewNotification);
      };
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user, fetchNotifications, handleIncomingNotification]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-slate-100 flex flex-col justify-between font-sans transition-colors duration-200">
        <Navbar />
        <ToastContainer />

        <main className="flex-1 pb-24 md:pb-8">
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Customer Storefront (Home) */}
              <Route path="/" element={<HomePage />} />

              {/* Catalog & Product Discovery */}
              <Route path="/products" element={<ProductListingPage />} />
              <Route path="/products/:identifier" element={<ProductDetailPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />

              {/* Shopping Cart & 3-Step Checkout */}
              <Route path="/cart" element={<CartPage />} />
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
        </main>

        {/* Global Floating Cart Button */}
        <FloatingCartButton />

        {/* Install PWA Prompt Banner */}
        <InstallPwaPrompt />

        {/* Mobile Sticky Bottom Navigation Bar (md:hidden) */}
        <BottomNav />

        <footer className="hidden md:block bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-neutral-400 dark:text-slate-500 safe-bottom transition-colors duration-200">
          Crave Food & Grocery Delivery &bull; Modern Design System &bull; Production Architecture
        </footer>
      </div>
    </BrowserRouter>
  );
}
