import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { getSocket } from '../services/socket';
import {
  playAdminNewOrderSound,
  playStatusUpdateSound,
} from '../services/soundEffects';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Shield,
  Users,
  ShoppingBag,
  Tag,
  Bike,
  Activity,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  Menu,
  X,
  Truck,
  Check,
  ExternalLink,
  Calendar,
  AlertCircle,
  Image,
  Layers,
  FileText,
  UserCheck,
  UserX,
  CreditCard,
  Ban,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    document.title = 'Craved Admin | Operations Center';
  }, []);

  // Analytics Data
  const [analytics, setAnalytics] = useState(null);

  // Entities Data States
  const [ordersData, setOrdersData] = useState({ orders: [], total: 0, page: 1, totalPages: 1 });
  const [usersData, setUsersData] = useState({ users: [], total: 0, page: 1, totalPages: 1 });
  const [partnersData, setPartnersData] = useState({ partners: [], total: 0, page: 1, totalPages: 1 });
  const [productsData, setProductsData] = useState({ products: [], total: 0, page: 1, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [banners, setBanners] = useState([]);
  const [auditLogsData, setAuditLogsData] = useState({ logs: [], total: 0, page: 1, totalPages: 1 });

  // Filters
  const [orderFilter, setOrderFilter] = useState({ status: 'all', paymentStatus: 'all', search: '', page: 1 });
  const [userFilter, setUserFilter] = useState({ role: 'all', status: 'all', search: '', page: 1 });
  const [partnerFilter, setPartnerFilter] = useState({ status: 'all', online: 'all', search: '', page: 1 });
  const [productFilter, setProductFilter] = useState({ category: 'all', type: 'all', search: '', page: 1 });
  const [auditFilter, setAuditFilter] = useState({ entity: 'all', action: 'all', page: 1 });

  // Modals
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDanger: true,
    onConfirm: () => {},
  });

  const [partnerKycModal, setPartnerKycModal] = useState({ isOpen: false, partner: null, reason: '' });
  const [assignPartnerModal, setAssignPartnerModal] = useState({ isOpen: false, order: null, partnerId: '' });
  const [productModal, setProductModal] = useState({
    isOpen: false,
    isEdit: false,
    data: {
      _id: null,
      name: '',
      price: '',
      discountPrice: '',
      unit: '',
      stock: 50,
      category: '',
      type: 'food',
      isVeg: true,
      images: [''],
      description: '',
    },
  });
  const [categoryModal, setCategoryModal] = useState({
    isOpen: false,
    isEdit: false,
    data: { _id: null, name: '', image: '', description: '', type: 'both', displayOrder: 0, isActive: true },
  });
  const [couponModal, setCouponModal] = useState({
    isOpen: false,
    data: {
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderValue: 0,
      maxDiscount: '',
      expiryDate: '',
      usageLimit: 1000,
    },
  });
  const [bannerModal, setBannerModal] = useState({
    isOpen: false,
    data: {
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '/products',
      badge: 'PROMO',
      displayOrder: 0,
    },
  });

  const showToast = (msg, isErr = false) => {
    setToastMessage({ text: msg, isErr });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch analytics', true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/orders', { params: orderFilter });
      setOrdersData(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch orders', true);
    } finally {
      setLoading(false);
    }
  }, [orderFilter]);

  // 3. Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users', { params: userFilter });
      setUsersData(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch users', true);
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  // 4. Fetch Delivery Partners
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/delivery-partners', { params: partnerFilter });
      setPartnersData(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch partners', true);
    } finally {
      setLoading(false);
    }
  }, [partnerFilter]);

  // 5. Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/products', { params: productFilter });
      setProductsData(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch products', true);
    } finally {
      setLoading(false);
    }
  }, [productFilter]);

  // 6. Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 7. Fetch Coupons
  const fetchCoupons = useCallback(async () => {
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 8. Fetch Banners
  const fetchBanners = useCallback(async () => {
    try {
      const res = await api.get('/admin/banners');
      setBanners(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 9. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs', { params: auditFilter });
      setAuditLogsData(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to fetch audit logs', true);
    } finally {
      setLoading(false);
    }
  }, [auditFilter]);

  // Trigger data load on tab switch
  useEffect(() => {
    if (activeTab === 'overview') fetchAnalytics();
    if (activeTab === 'orders') {
      fetchOrders();
      fetchPartners(); // for manual assign dropdown
    }
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'partners') fetchPartners();
    if (activeTab === 'products') {
      fetchProducts();
      fetchCategories();
    }
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'coupons') fetchCoupons();
    if (activeTab === 'banners') fetchBanners();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [
    activeTab,
    fetchAnalytics,
    fetchOrders,
    fetchUsers,
    fetchPartners,
    fetchProducts,
    fetchCategories,
    fetchCoupons,
    fetchBanners,
    fetchAuditLogs,
  ]);

  // Real-Time Socket Listener for Live Incoming Orders & Status Events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (data) => {
      console.log('[ADMIN REAL-TIME] New Order Alert:', data);
      playAdminNewOrderSound();
      showToast(`🚨 New Order #${data?.orderNumber || ''} received for ₹${data?.grandTotal || 0}!`);
      fetchOrders();
      fetchAnalytics();
    };

    const handleOrderStatusUpdate = (data) => {
      console.log('[ADMIN REAL-TIME] Order Status Update:', data);
      playStatusUpdateSound(data?.status);
      showToast(`📦 Order #${data?.orderNumber || data?.order?.orderNumber || ''} is now ${data?.status?.replace(/_/g, ' ')}`);
      fetchOrders();
    };

    socket.on('admin:new_order', handleNewOrder);
    socket.on('order:created', handleNewOrder);
    socket.on('order:status_updated', handleOrderStatusUpdate);

    return () => {
      socket.off('admin:new_order', handleNewOrder);
      socket.off('order:created', handleNewOrder);
      socket.off('order:status_updated', handleOrderStatusUpdate);
    };
  }, [fetchOrders, fetchAnalytics]);

  // Handler: User Active/Block Toggle
  const handleToggleUserStatus = (targetUser) => {
    const nextStatus = !targetUser.isActive;
    setConfirmDialog({
      isOpen: true,
      title: `${nextStatus ? 'Activate' : 'Block'} User Account?`,
      message: `Are you sure you want to ${nextStatus ? 'unblock' : 'suspend access for'} ${targetUser.name} (${targetUser.email})?`,
      confirmText: nextStatus ? 'Activate User' : 'Block Account',
      isDanger: !nextStatus,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.patch(`/admin/users/${targetUser._id}`, { isActive: nextStatus });
          showToast(`User ${targetUser.name} is now ${nextStatus ? 'active' : 'blocked'}.`);
          fetchUsers();
        } catch (err) {
          showToast(err.response?.data?.message || 'Action failed', true);
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler: Change User Role
  const handleChangeUserRole = async (targetUserId, newRole) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${targetUserId}`, { role: newRole });
      showToast(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Verify Delivery Partner KYC
  const handleVerifyKyc = async (partnerId, status, reason = '') => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/delivery-partners/${partnerId}/verify`, { status, reason });
      showToast(`Courier KYC marked as ${status.toUpperCase()}`);
      setPartnerKycModal({ isOpen: false, partner: null, reason: '' });
      fetchPartners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update KYC status', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Assign Partner to Order
  const handleAssignPartner = async () => {
    if (!assignPartnerModal.partnerId) {
      showToast('Please select a delivery partner', true);
      return;
    }
    try {
      setActionLoading(true);
      await api.patch(`/admin/orders/${assignPartnerModal.order._id}/assign`, {
        partnerId: assignPartnerModal.partnerId,
      });
      showToast('Order successfully assigned to courier');
      setAssignPartnerModal({ isOpen: false, order: null, partnerId: '' });
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to assign courier', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Admin Status Transition
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      showToast(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Trigger Refund
  const handleTriggerRefund = (order) => {
    setConfirmDialog({
      isOpen: true,
      title: `Issue Full Refund for Order #${order.orderNumber}?`,
      message: `This will reverse the Stripe charge of $${order.totals.grandTotal.toFixed(
        2
      )}, restore reserved product quantities to inventory, and update order status to Refunded.`,
      confirmText: 'Process Full Refund',
      isDanger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.post(`/admin/orders/${order._id}/refund`, {
            reason: 'Refund granted by Super Admin',
          });
          showToast(`Full refund completed for Order #${order.orderNumber}`);
          fetchOrders();
        } catch (err) {
          showToast(err.response?.data?.message || 'Refund failed', true);
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler: Save Product (Create or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const { isEdit, data } = productModal;
    try {
      setActionLoading(true);
      const payload = {
        name: data.name,
        productId: data.productId || undefined,
        brand: data.brand || '',
        subcategory: data.subcategory || '',
        price: parseFloat(data.price),
        mrp: data.mrp ? parseFloat(data.mrp) : parseFloat(data.price),
        discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : 0,
        unit: data.unit,
        stock: parseInt(data.stock, 10),
        category: data.category,
        type: data.type,
        isVeg: Boolean(data.isVeg),
        isFeatured: Boolean(data.isFeatured),
        isBestseller: Boolean(data.isBestseller),
        images: data.images.filter((img) => img.trim().length > 0),
        description: data.description,
        variants: Array.isArray(data.variants) ? data.variants : [],
      };

      if (isEdit) {
        await api.patch(`/admin/products/${data._id}`, payload);
        showToast('Product updated successfully');
      } else {
        await api.post('/admin/products', payload);
        showToast('Product created successfully');
      }
      setProductModal((prev) => ({ ...prev, isOpen: false }));
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save product', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Product
  const handleDeleteProduct = (prod) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Product "${prod.name}"?`,
      message: 'This will permanently remove this catalog item from the store.',
      confirmText: 'Delete Permanently',
      isDanger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/admin/products/${prod._id}`);
          showToast('Product deleted');
          fetchProducts();
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete', true);
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler: Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const { isEdit, data } = categoryModal;
    try {
      setActionLoading(true);
      if (isEdit) {
        await api.patch(`/admin/categories/${data._id}`, data);
        showToast('Category updated');
      } else {
        await api.post('/admin/categories', data);
        showToast('Category created');
      }
      setCategoryModal((prev) => ({ ...prev, isOpen: false }));
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save category', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Category
  const handleDeleteCategory = (cat) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Category "${cat.name}"?`,
      message: `Ensure no products are linked to this category before deleting.`,
      confirmText: 'Delete Category',
      isDanger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/admin/categories/${cat._id}`);
          showToast('Category deleted');
          fetchCategories();
        } catch (err) {
          showToast(err.response?.data?.message || 'Cannot delete category with linked products', true);
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler: Save Coupon
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    const { data } = couponModal;
    try {
      setActionLoading(true);
      await api.post('/admin/coupons', {
        ...data,
        discountValue: parseFloat(data.discountValue),
        minOrderValue: parseFloat(data.minOrderValue || 0),
        maxDiscount: data.maxDiscount ? parseFloat(data.maxDiscount) : null,
      });
      showToast('Coupon created successfully');
      setCouponModal((prev) => ({ ...prev, isOpen: false }));
      fetchCoupons();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create coupon', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Coupon
  const handleDeleteCoupon = (c) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Coupon "${c.code}"?`,
      message: 'Active users will no longer be able to apply this discount promo code.',
      confirmText: 'Delete Coupon',
      isDanger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/admin/coupons/${c._id}`);
          showToast('Coupon deleted');
          fetchCoupons();
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete coupon', true);
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler: Save Banner
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    const { data } = bannerModal;
    try {
      setActionLoading(true);
      await api.post('/admin/banners', {
        ...data,
        displayOrder: parseInt(data.displayOrder, 10) || 0,
      });
      showToast('Banner published');
      setBannerModal((prev) => ({ ...prev, isOpen: false }));
      fetchBanners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save banner', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Delete Banner
  const handleDeleteBanner = (b) => {
    setConfirmDialog({
      isOpen: true,
      title: `Remove Promotional Banner "${b.title}"?`,
      message: 'This banner will be immediately removed from the customer storefront hero.',
      confirmText: 'Remove Banner',
      isDanger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/admin/banners/${b._id}`);
          showToast('Banner removed');
          fetchBanners();
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete banner', true);
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handler: Download CSV Report
  const handleDownloadCsv = (type) => {
    const token = localStorage.getItem('crave_accessToken');
    const url = `/api/admin/export/csv?type=${type}`;
    window.open(url, '_blank');
  };

  // Navigation Items
  const navItems = [
    { id: 'overview', label: 'Executive KPIs', icon: TrendingUp, badge: null },
    { id: 'orders', label: 'Orders & Dispatch', icon: Package, badge: ordersData.total || null },
    { id: 'users', label: 'Users & Roles', icon: Users, badge: null },
    { id: 'partners', label: 'Riders & Fleet (KYC)', icon: Bike, badge: analytics?.kpis?.pendingKyc || null },
    { id: 'products', label: 'Products Catalog', icon: ShoppingBag, badge: null },
    { id: 'categories', label: 'Categories', icon: Layers, badge: null },
    { id: 'coupons', label: 'Coupons & Promos', icon: Tag, badge: null },
    { id: 'banners', label: 'Hero Banners', icon: Image, badge: null },
    { id: 'audit', label: 'Audit Trail Logs', icon: FileText, badge: null },
    { id: 'export', label: 'Export Reports (CSV)', icon: Download, badge: null },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white transition-all transform animate-bounce ${
            toastMessage.isErr ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toastMessage.isErr ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:inline-flex p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Toggle Desktop Sidebar"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center space-x-2">
              <span className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-500 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-sm">
                <Shield className="h-4 w-4" />
              </span>
              <span className="font-black text-lg tracking-tight text-white font-heading">
                Craved Admin
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30 hidden xs:inline-block">
                Operations
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs text-neutral-400">
              <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>Database Connected &bull; Real-time Socket Live</span>
            </div>

            <div className="flex items-center space-x-2 bg-neutral-800/80 pl-2 pr-3 py-1 rounded-xl border border-neutral-700">
              <div className="h-6 w-6 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.[0] || 'A'}
              </div>
              <span className="text-xs font-bold text-neutral-200">{user?.name}</span>
            </div>

            <Link
              to="/"
              className="text-xs font-bold text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              <span>Store</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Horizontal Quick Navigation Strip */}
      <div className="md:hidden bg-white border-b border-neutral-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-brand-400' : 'text-neutral-500'}`} />
              <span>{item.label.split(' ')[0]}</span>
              {item.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Off-Canvas Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Mobile Off-Canvas Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <span className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-500 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-sm">
                <Shield className="h-4 w-4" />
              </span>
              <div>
                <span className="font-black text-sm tracking-tight text-neutral-900 font-heading block">
                  Craved Admin
                </span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">
                  Operations Center
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 pt-1">
            Navigation Menu
          </div>

          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-neutral-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 text-[11px] text-neutral-400 text-center">
          Crave Operations v1.0.0
        </div>
      </aside>

      {/* Main Admin Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row min-w-0">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden md:flex ${
            isSidebarOpen ? 'w-64' : 'w-20'
          } bg-white border-r border-neutral-200 p-4 transition-all duration-200 flex-shrink-0 flex-col justify-between`}
        >
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-2">
              {isSidebarOpen ? 'Operations Control' : 'Menu'}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-neutral-500'}`} />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </div>
                  {item.badge && isSidebarOpen && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isSidebarOpen && (
            <div className="pt-6 border-t border-neutral-100 text-[11px] text-neutral-400 text-center">
              Crave Engine v1.0.0 &bull; Step 9 Production
            </div>
          )}
        </aside>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden min-w-0">
          {/* ============================================================== */}
          {/* 1. OVERVIEW & RECHARTS ANALYTICS TAB                           */}
          {/* ============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Platform Analytics</h1>
                  <p className="text-xs text-neutral-500">
                    Live gross merchandise volume, active courier dispatch, and top performance metrics.
                  </p>
                </div>
                <button
                  onClick={fetchAnalytics}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Gross GMV</span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-neutral-900">
                    ₹{analytics?.kpis?.totalRevenue ? (analytics?.kpis?.totalRevenue % 1 === 0 ? analytics?.kpis?.totalRevenue : analytics?.kpis?.totalRevenue?.toFixed(2)) : '0'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                    +₹{analytics?.kpis?.revenueToday ? (analytics?.kpis?.revenueToday % 1 === 0 ? analytics?.kpis?.revenueToday : analytics?.kpis?.revenueToday?.toFixed(2)) : '0'} today
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
                    <Package className="h-4 w-4 text-brand-500" />
                  </div>
                  <div className="text-2xl font-black text-neutral-900">
                    {analytics?.kpis?.totalOrders || 0}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    {analytics?.kpis?.ordersToday || 0} orders placed today
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Active Fleet</span>
                    <Bike className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-neutral-900">
                    {analytics?.kpis?.activePartners || 0}
                  </div>
                  <div className="text-[11px] text-amber-600 font-semibold mt-1">
                    {analytics?.kpis?.pendingKyc || 0} KYC pending review
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Registered Base</span>
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-neutral-900">
                    {(analytics?.kpis?.users?.customer || 0) + (analytics?.kpis?.users?.vendor || 0)}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    {analytics?.kpis?.users?.customer || 0} Customers &bull; {analytics?.kpis?.users?.vendor || 0} Vendors
                  </div>
                </div>
              </div>

              {/* Recharts Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Revenue Trend (Area Chart) */}
                <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-black text-neutral-900">Revenue & Volume Trend (7 Days)</h2>
                      <p className="text-[11px] text-neutral-500">Daily gross revenue and order frequency</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                      Live Telemetry
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    {analytics?.charts?.revenueTrend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.charts.revenueTrend}>
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '16px',
                              backgroundColor: '#0f172a',
                              color: '#fff',
                              border: 'none',
                              fontSize: '12px',
                            }}
                            formatter={(value, name) => [
                              name === 'revenue' ? `₹${Number(value).toFixed(2)}` : value,
                              name === 'revenue' ? 'Revenue' : 'Orders Count',
                            ]}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue (₹)"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#revenueGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                        No orders recorded in the past 7 days.
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Status Distribution (Pie Chart) */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-black text-neutral-900 mb-1">Order Pipeline Distribution</h2>
                    <p className="text-[11px] text-neutral-500 mb-4">Breakdown of orders across 9 lifecycle states</p>
                    <div className="h-56 w-full">
                      {analytics?.charts?.statusDistribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.charts.statusDistribution}
                              dataKey="count"
                              nameKey="label"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={3}
                            >
                              {analytics.charts.statusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: '12px',
                                backgroundColor: '#1e293b',
                                color: '#fff',
                                border: 'none',
                                fontSize: '11px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                          No pipeline status data
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Legend */}
                  <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-neutral-100 text-[10px]">
                    {analytics?.charts?.statusDistribution?.slice(0, 6).map((item) => (
                      <div key={item.status} className="flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-neutral-600 truncate font-semibold">
                          {item.label}: {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Selling Products List */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-black text-neutral-900">Top 5 Best-Selling Products</h2>
                    <p className="text-[11px] text-neutral-500">Highest volume items across all customer orders</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>Manage Catalog</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-neutral-100">
                  {analytics?.charts?.topProducts?.length > 0 ? (
                    analytics.charts.topProducts.map((prod, idx) => (
                      <div key={prod._id || idx} className="py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="h-6 w-6 rounded-full bg-neutral-100 text-neutral-700 font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <img
                            src={prod.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                            alt={prod.name}
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-neutral-900">{prod.name}</div>
                            <div className="text-[11px] text-neutral-400">Sold: {prod.totalSold} units</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600">
                            ₹{prod.totalRevenue ? (prod.totalRevenue % 1 === 0 ? prod.totalRevenue : prod.totalRevenue.toFixed(2)) : '0'}
                          </span>
                          <span className="block text-[10px] text-neutral-400">Gross revenue</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-neutral-400">
                      No order items sold yet. Check back once orders are fulfilled.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. ORDERS MANAGEMENT TAB                                       */}
          {/* ============================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Orders & Dispatch</h1>
                  <p className="text-xs text-neutral-500">
                    Live order pipeline, manual courier assignment, status overrides, and refund processing.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadCsv('orders')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={fetchOrders}
                    className="p-1.5 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by Order #..."
                    value={orderFilter.search}
                    onChange={(e) => setOrderFilter({ ...orderFilter, search: e.target.value, page: 1 })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                  <select
                    value={orderFilter.status}
                    onChange={(e) => setOrderFilter({ ...orderFilter, status: e.target.value, page: 1 })}
                    className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready for Pickup</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>

                  <select
                    value={orderFilter.paymentStatus}
                    onChange={(e) => setOrderFilter({ ...orderFilter, paymentStatus: e.target.value, page: 1 })}
                    className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 focus:outline-none"
                  >
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Orders Data Container */}
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Courier</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {ordersData.orders.length > 0 ? (
                        ordersData.orders.map((o) => (
                          <tr key={o._id} className="hover:bg-neutral-50 transition-colors">
                            <td className="py-3 px-4 font-mono font-black text-neutral-900">
                              #{o.orderNumber}
                              <span className="block font-sans text-[10px] text-neutral-400 font-normal">
                                {new Date(o.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-neutral-800 block">{o.customer?.name || 'Customer'}</span>
                              <span className="text-[10px] text-neutral-400">{o.customer?.phone || o.customer?.email}</span>
                            </td>
                            <td className="py-3 px-4 text-neutral-600">
                              {o.items?.length} items ({o.items?.[0]?.name}
                              {o.items?.length > 1 ? ` +${o.items.length - 1}` : ''})
                            </td>
                            <td className="py-3 px-4 font-black text-neutral-900">
                              ₹{o.totals?.grandTotal ? (o.totals.grandTotal % 1 === 0 ? o.totals.grandTotal : o.totals.grandTotal.toFixed(2)) : '0'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  o.paymentStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.paymentStatus === 'refunded'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateOrderStatus(o._id, e.target.value)}
                                className="text-[11px] font-bold bg-neutral-100 border border-neutral-300 rounded-lg px-2 py-1 focus:outline-none"
                              >
                                <option value="placed">placed</option>
                                <option value="confirmed">confirmed</option>
                                <option value="preparing">preparing</option>
                                <option value="ready">ready</option>
                                <option value="picked_up">picked_up</option>
                                <option value="out_for_delivery">out_for_delivery</option>
                                <option value="delivered">delivered</option>
                                <option value="cancelled">cancelled</option>
                                <option value="refunded">refunded</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              {o.deliveryPartner ? (
                                <span className="font-bold text-neutral-800 flex items-center gap-1">
                                  <Bike className="h-3 w-3 text-amber-600" />
                                  <span>{o.deliveryPartner.name}</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    setAssignPartnerModal({
                                      isOpen: true,
                                      order: o,
                                      partnerId: partnersData.partners[0]?.user?._id || '',
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold border border-brand-200"
                                >
                                  + Assign Rider
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {o.paymentStatus === 'paid' && o.status !== 'refunded' && (
                                <button
                                  onClick={() => handleTriggerRefund(o)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200"
                                  title="Issue Stripe/COD Refund"
                                >
                                  Refund
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-neutral-400">
                            No orders found matching this filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {ordersData.orders.length > 0 ? (
                    ordersData.orders.map((o) => (
                      <div key={o._id} className="p-4 space-y-3 bg-white">
                        {/* Top: Order # & Grand Total */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-black text-sm text-neutral-900">#{o.orderNumber}</span>
                            <span className="text-[10px] text-neutral-400 block">
                              {new Date(o.createdAt).toLocaleDateString()} &bull; {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-neutral-900 block font-heading">
                              ₹{o.totals?.grandTotal ? (o.totals.grandTotal % 1 === 0 ? o.totals.grandTotal : o.totals.grandTotal.toFixed(2)) : '0'}
                            </span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                o.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.paymentStatus === 'refunded'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.paymentStatus}
                            </span>
                          </div>
                        </div>

                        {/* Customer & Contact */}
                        <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60 text-xs">
                          <div>
                            <div className="font-bold text-neutral-800">{o.customer?.name || 'Customer'}</div>
                            <div className="text-[10px] text-neutral-400">{o.deliveryAddress?.street || o.deliveryAddress?.city || 'Address details in order'}</div>
                          </div>
                          {o.customer?.phone && (
                            <a
                              href={`tel:${o.customer.phone}`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 active:scale-95"
                            >
                              <span>Call</span>
                            </a>
                          )}
                        </div>

                        {/* Items summary */}
                        <div className="text-xs text-neutral-600">
                          <span className="font-bold text-neutral-800">{o.items?.length || 0} item{o.items?.length === 1 ? '' : 's'}: </span>
                          {o.items?.map((it) => `${it.quantity}x ${it.name}`).join(', ') || 'No item details'}
                        </div>

                        {/* Status & Courier Controls */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Status:</span>
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o._id, e.target.value)}
                              className="flex-1 text-xs font-bold bg-neutral-100 border border-neutral-300 rounded-lg px-2 py-1.5 focus:outline-none"
                            >
                              <option value="placed">placed</option>
                              <option value="confirmed">confirmed</option>
                              <option value="preparing">preparing</option>
                              <option value="ready">ready</option>
                              <option value="picked_up">picked_up</option>
                              <option value="out_for_delivery">out_for_delivery</option>
                              <option value="delivered">delivered</option>
                              <option value="cancelled">cancelled</option>
                              <option value="refunded">refunded</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div>
                              {o.deliveryPartner ? (
                                <span className="font-bold text-xs text-neutral-800 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                                  <Bike className="h-3 w-3 text-amber-600" />
                                  <span className="truncate max-w-[130px]">{o.deliveryPartner.name}</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    setAssignPartnerModal({
                                      isOpen: true,
                                      order: o,
                                      partnerId: partnersData.partners[0]?.user?._id || '',
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold border border-brand-200"
                                >
                                  + Assign Rider
                                </button>
                              )}
                            </div>

                            {o.paymentStatus === 'paid' && o.status !== 'refunded' && (
                              <button
                                onClick={() => handleTriggerRefund(o)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200"
                              >
                                Refund
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No orders found matching this filter criteria.
                    </div>
                  )}
                </div>

                {/* Pagination */}
                <div className="p-3 sm:p-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
                  <span className="text-center sm:text-left">
                    Showing {ordersData.orders.length} of {ordersData.total} orders
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={orderFilter.page <= 1}
                      onClick={() => setOrderFilter({ ...orderFilter, page: orderFilter.page - 1 })}
                      className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-30 hover:bg-neutral-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-neutral-800 px-1">
                      Page {orderFilter.page} / {ordersData.totalPages}
                    </span>
                    <button
                      disabled={orderFilter.page >= ordersData.totalPages}
                      onClick={() => setOrderFilter({ ...orderFilter, page: orderFilter.page + 1 })}
                      className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-30 hover:bg-neutral-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. USERS MANAGEMENT TAB                                        */}
          {/* ============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Users & Roles</h1>
                  <p className="text-xs text-neutral-500">
                    Search customer accounts, assign clearance roles, and manage access privileges.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCsv('users')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Export Users CSV</span>
                </button>
              </div>

              {/* Search & Filters */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, phone..."
                    value={userFilter.search}
                    onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value, page: 1 })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                  <select
                    value={userFilter.role}
                    onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value, page: 1 })}
                    className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-neutral-700"
                  >
                    <option value="all">All Roles</option>
                    <option value="customer">Customer</option>
                    <option value="delivery">Delivery Partner</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>

                  <select
                    value={userFilter.status}
                    onChange={(e) => setUserFilter({ ...userFilter, status: e.target.value, page: 1 })}
                    className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-neutral-700"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Users Data Container */}
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {usersData.users.map((u) => (
                        <tr key={u._id} className="hover:bg-neutral-50">
                          <td className="py-3 px-4 flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-neutral-900 block">{u.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">{u.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.role}
                              disabled={u.email === 'admin@crave.com'}
                              onChange={(e) => handleChangeUserRole(u._id, e.target.value)}
                              className="text-[11px] font-bold bg-neutral-100 border border-neutral-300 rounded-lg px-2 py-1"
                            >
                              <option value="customer">customer</option>
                              <option value="delivery">delivery</option>
                              <option value="vendor">vendor</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                u.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.email !== 'admin@crave.com' && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                                  u.isActive
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {u.isActive ? 'Block' : 'Unblock'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {usersData.users.length > 0 ? (
                    usersData.users.map((u) => (
                      <div key={u._id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-neutral-900 text-xs block truncate">{u.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono truncate block">{u.email}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                              u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Blocked'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Role:</span>
                            <select
                              value={u.role}
                              disabled={u.email === 'admin@crave.com'}
                              onChange={(e) => handleChangeUserRole(u._id, e.target.value)}
                              className="text-xs font-bold bg-neutral-100 border border-neutral-300 rounded-lg px-2 py-1"
                            >
                              <option value="customer">customer</option>
                              <option value="delivery">delivery</option>
                              <option value="vendor">vendor</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>

                          {u.email !== 'admin@crave.com' && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                                u.isActive
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {u.isActive ? 'Block User' : 'Activate User'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No users found matching this filter criteria.
                    </div>
                  )}
                </div>

                {/* Pagination */}
                <div className="p-3 sm:p-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
                  <span className="text-center sm:text-left">
                    Showing {usersData.users.length} of {usersData.total} users
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={userFilter.page <= 1}
                      onClick={() => setUserFilter({ ...userFilter, page: userFilter.page - 1 })}
                      className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-30 hover:bg-neutral-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-neutral-800 px-1">
                      Page {userFilter.page} / {usersData.totalPages}
                    </span>
                    <button
                      disabled={userFilter.page >= usersData.totalPages}
                      onClick={() => setUserFilter({ ...userFilter, page: userFilter.page + 1 })}
                      className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-30 hover:bg-neutral-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. DELIVERY PARTNERS & FLEET (KYC) TAB                         */}
          {/* ============================================================== */}
          {activeTab === 'partners' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Courier Fleet & KYC</h1>
                  <p className="text-xs text-neutral-500">
                    Review driver license submissions, verify documents, and inspect fleet ratings.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCsv('partners')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Export Fleet CSV</span>
                </button>
              </div>

              {/* Partners Data Container */}
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Courier</th>
                        <th className="py-3 px-4">Vehicle</th>
                        <th className="py-3 px-4">Duty Status</th>
                        <th className="py-3 px-4">KYC Review</th>
                        <th className="py-3 px-4">Deliveries</th>
                        <th className="py-3 px-4">Rating</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {partnersData.partners.map((p) => (
                        <tr key={p._id} className="hover:bg-neutral-50">
                          <td className="py-3 px-4 flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {p.user?.name?.[0]?.toUpperCase() || 'R'}
                            </div>
                            <div>
                              <span className="font-bold text-neutral-900 block">{p.user?.name || 'Rider'}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">{p.user?.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold capitalize text-neutral-800">{p.vehicle?.type}</span>
                            <span className="block text-[10px] text-neutral-400 font-mono">
                              {p.vehicle?.plateNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                p.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {p.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                p.documents?.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.documents?.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.documents?.status || 'pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-neutral-800">
                            {p.earnings?.deliveriesCompleted || 0}
                          </td>
                          <td className="py-3 px-4 font-black text-amber-600">
                            ★ {p.rating?.average?.toFixed(1) || '5.0'}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => setPartnerKycModal({ isOpen: true, partner: p, reason: '' })}
                              className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200"
                            >
                              Inspect KYC
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(p.user)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                                p.user?.isActive
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {p.user?.isActive ? 'Block' : 'Unblock'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {partnersData.partners.length > 0 ? (
                    partnersData.partners.map((p) => (
                      <div key={p._id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                              {p.user?.name?.[0]?.toUpperCase() || 'R'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-neutral-900 text-xs block truncate">{p.user?.name || 'Rider'}</span>
                              <span className="text-[10px] text-neutral-400 font-mono truncate block">{p.user?.email}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              p.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            {p.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-bold uppercase">Vehicle:</span>
                            <span className="font-bold capitalize text-neutral-800">{p.vehicle?.type} &bull; {p.vehicle?.plateNumber || 'No plate'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-bold uppercase">Deliveries:</span>
                            <span className="font-bold text-neutral-800">{p.earnings?.deliveriesCompleted || 0} completed (★ {p.rating?.average?.toFixed(1) || '5.0'})</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              p.documents?.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.documents?.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            KYC: {p.documents?.status || 'pending'}
                          </span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setPartnerKycModal({ isOpen: true, partner: p, reason: '' })}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs"
                            >
                              Inspect KYC
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(p.user)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                                p.user?.isActive
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {p.user?.isActive ? 'Block' : 'Unblock'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No delivery partners registered in fleet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. PRODUCTS CATALOG TAB                                        */}
          {/* ============================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Product Catalog</h1>
                  <p className="text-xs text-neutral-500">
                    Add new food & grocery items, adjust real-time stock levels, and set discounts.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <a
                    href="http://localhost:5000/api/products/export/csv"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-600" />
                    <span>Export CSV</span>
                  </a>
                  <button
                    onClick={() =>
                      setProductModal({
                        isOpen: true,
                        isEdit: false,
                        data: {
                          _id: null,
                          productId: '',
                          name: '',
                          brand: '',
                          subcategory: '',
                          price: '',
                          mrp: '',
                          discountPrice: '',
                          unit: '1 serving',
                          stock: 100,
                          category: categories[0]?._id || '',
                          type: 'food',
                          isVeg: true,
                          isFeatured: false,
                          isBestseller: false,
                          images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'],
                          description: '',
                          variants: [],
                        },
                      })
                    }
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {/* Products Data Container */}
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Stock</th>
                        <th className="py-3 px-4">Rating</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {productsData.products.map((prod) => (
                        <tr key={prod._id} className="hover:bg-neutral-50">
                          <td className="py-3 px-4 flex items-center space-x-3">
                            <img
                              src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                              alt={prod.name}
                              className="h-9 w-9 rounded-xl object-cover"
                            />
                            <div>
                              <span className="font-bold text-neutral-900 block">{prod.name}</span>
                              <span className="text-[10px] text-neutral-400">{prod.unit}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-neutral-700">
                            {prod.category?.name || 'Unassigned'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                prod.type === 'food' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {prod.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-black text-neutral-900">₹{prod.price % 1 === 0 ? prod.price : prod.price?.toFixed(2)}</span>
                            {prod.discountPrice > 0 && (
                              <span className="block text-[10px] text-rose-500 font-bold">
                                Deal: ₹{prod.discountPrice % 1 === 0 ? prod.discountPrice : prod.discountPrice?.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-black text-xs ${
                                prod.stock < 10 ? 'text-rose-600' : 'text-neutral-900'
                              }`}
                            >
                              {prod.stock} units
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-amber-600">
                            ★ {prod.rating?.average?.toFixed(1) || '0.0'}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() =>
                                setProductModal({
                                  isOpen: true,
                                  isEdit: true,
                                  data: {
                                    _id: prod._id,
                                    productId: prod.productId || '',
                                    name: prod.name,
                                    brand: prod.brand || '',
                                    subcategory: prod.subcategory || '',
                                    price: prod.price,
                                    mrp: prod.mrp || prod.price,
                                    discountPrice: prod.discountPrice || '',
                                    unit: prod.unit,
                                    stock: prod.stock,
                                    category: prod.category?._id || categories[0]?._id,
                                    type: prod.type,
                                    isVeg: prod.isVeg,
                                    isFeatured: Boolean(prod.isFeatured),
                                    isBestseller: Boolean(prod.isBestseller),
                                    images: prod.images,
                                    description: prod.description || '',
                                    variants: prod.variants || [],
                                  },
                                })
                              }
                              className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {productsData.products.length > 0 ? (
                    productsData.products.map((prod) => (
                      <div key={prod._id} className="p-4 space-y-3 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <img
                              src={prod.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                              alt={prod.name}
                              className="h-14 w-14 rounded-2xl object-cover flex-shrink-0 border border-neutral-200"
                            />
                            <div className="min-w-0">
                              <span className="font-extrabold text-neutral-900 text-xs block leading-snug">{prod.name}</span>
                              <span className="text-[10px] text-neutral-400 block">{prod.category?.name || 'Unassigned'} &bull; {prod.unit}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-black text-sm text-neutral-900 font-heading">
                                  ₹{prod.price % 1 === 0 ? prod.price : prod.price?.toFixed(2)}
                                </span>
                                {prod.discountPrice > 0 && (
                                  <span className="text-[10px] text-rose-500 font-bold">
                                    Deal: ₹{prod.discountPrice % 1 === 0 ? prod.discountPrice : prod.discountPrice?.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                prod.stock < 10 ? 'bg-rose-100 text-rose-700' : 'bg-neutral-100 text-neutral-800'
                              }`}
                            >
                              {prod.stock} units
                            </span>
                            <span className="font-bold text-amber-600 text-xs">
                              ★ {prod.rating?.average?.toFixed(1) || '0.0'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() =>
                                setProductModal({
                                  isOpen: true,
                                  isEdit: true,
                                  data: {
                                    _id: prod._id,
                                    productId: prod.productId || '',
                                    name: prod.name,
                                    brand: prod.brand || '',
                                    subcategory: prod.subcategory || '',
                                    price: prod.price,
                                    mrp: prod.mrp || prod.price,
                                    discountPrice: prod.discountPrice || '',
                                    unit: prod.unit,
                                    stock: prod.stock,
                                    category: prod.category?._id || categories[0]?._id,
                                    type: prod.type,
                                    isVeg: prod.isVeg,
                                    isFeatured: Boolean(prod.isFeatured),
                                    isBestseller: Boolean(prod.isBestseller),
                                    images: prod.images,
                                    description: prod.description || '',
                                    variants: prod.variants || [],
                                  },
                                })
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center gap-1 text-xs font-bold"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No products found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 6. CATEGORIES MANAGEMENT TAB                                   */}
          {/* ============================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Categories</h1>
                  <p className="text-xs text-neutral-500">Manage catalog taxonomy and display sorting order.</p>
                </div>
                <button
                  onClick={() =>
                    setCategoryModal({
                      isOpen: true,
                      isEdit: false,
                      data: {
                        _id: null,
                        name: '',
                        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
                        description: '',
                        type: 'both',
                        displayOrder: categories.length + 1,
                        isActive: true,
                      },
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={cat.image} alt={cat.name} className="h-12 w-12 rounded-2xl object-cover" />
                      <div>
                        <h3 className="font-bold text-neutral-900 text-sm">{cat.name}</h3>
                        <span className="text-[11px] text-neutral-400 block font-mono">/{cat.slug}</span>
                        <span className="text-[10px] text-brand-600 font-bold uppercase">{cat.type}</span>
                      </div>
                    </div>
                    <div className="space-x-1">
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 7. COUPONS MANAGEMENT TAB                                      */}
          {/* ============================================================== */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Coupons & Promotions</h1>
                  <p className="text-xs text-neutral-500">Configure discount codes, order minimums, and usage limits.</p>
                </div>
                <button
                  onClick={() =>
                    setCouponModal({
                      isOpen: true,
                      data: {
                        code: '',
                        description: '',
                        discountType: 'percentage',
                        discountValue: '',
                        minOrderValue: 20,
                        maxDiscount: 15,
                        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                        usageLimit: 1000,
                      },
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((c) => (
                  <div
                    key={c._id}
                    className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-brand-600 text-base bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-2">{c.description || 'General discount promotion'}</p>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="font-bold text-neutral-800">
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min Order Value:</span>
                        <span className="font-bold text-neutral-800">₹{c.minOrderValue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Redemptions:</span>
                        <span className="font-bold text-neutral-800">
                          {c.usedCount} / {c.usageLimit}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDeleteCoupon(c)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 8. HERO BANNERS MANAGEMENT TAB                                 */}
          {/* ============================================================== */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Hero Banners</h1>
                  <p className="text-xs text-neutral-500">Publish dynamic promo cards to customer home screen.</p>
                </div>
                <button
                  onClick={() =>
                    setBannerModal({
                      isOpen: true,
                      data: {
                        title: '',
                        subtitle: '',
                        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000',
                        linkUrl: '/products',
                        badge: 'EXCLUSIVE',
                        displayOrder: banners.length + 1,
                      },
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Banner</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((b) => (
                  <div
                    key={b._id}
                    className="relative rounded-3xl overflow-hidden shadow-md group border border-neutral-200"
                  >
                    <img src={b.imageUrl} alt={b.title} className="w-full h-44 object-cover brightness-75" />
                    <div className="absolute inset-0 p-5 flex flex-col justify-between text-white">
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-500">
                          {b.badge}
                        </span>
                        <h3 className="text-base font-black mt-2 leading-tight">{b.title}</h3>
                        <p className="text-xs text-neutral-200 mt-1 line-clamp-2">{b.subtitle}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-mono text-neutral-300">Order: {b.displayOrder}</span>
                        <button
                          onClick={() => handleDeleteBanner(b)}
                          className="p-1.5 rounded-xl bg-white/20 hover:bg-rose-600 text-white transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 9. AUDIT TRAIL LOGS TAB                                        */}
          {/* ============================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Audit Trail</h1>
                  <p className="text-xs text-neutral-500">
                    Immutable security log of all administrative actions, privilege elevations, and refunds.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="p-1.5 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
                {/* Desktop Audit Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Admin</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Entity</th>
                        <th className="py-3 px-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {auditLogsData.logs.map((log) => (
                        <tr key={log._id} className="hover:bg-neutral-50 font-sans">
                          <td className="py-3 px-4 text-neutral-500 text-[11px]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-neutral-900 block">{log.admin?.name || 'Root Admin'}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">{log.admin?.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-neutral-700">{log.entity}</td>
                          <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Audit Cards View */}
                <div className="md:hidden divide-y divide-neutral-100">
                  {auditLogsData.logs.length > 0 ? (
                    auditLogsData.logs.map((log) => (
                      <div key={log._id} className="p-3.5 space-y-1.5 bg-white text-xs">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-bold text-neutral-800">
                          {log.admin?.name || 'Root Admin'} &bull; <span className="text-neutral-500 font-normal">{log.entity}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          IP: {log.ipAddress || '127.0.0.1'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No audit logs found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 10. EXPORT CSV REPORTS TAB                                     */}
          {/* ============================================================== */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Export Reports to CSV</h1>
                <p className="text-xs text-neutral-500">
                  Instant one-click RFC 4180 compliant CSV exports for accounting, fleet logistics, and analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="h-10 w-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                      <Package className="h-5 w-5" />
                    </span>
                    <h3 className="font-black text-base text-neutral-900">Full Orders Ledger</h3>
                    <p className="text-xs text-neutral-500">
                      Export all customer orders, item snapshots, delivery addresses, status history, and payment states.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('orders')}
                    className="w-full py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Orders CSV</span>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <DollarSign className="h-5 w-5" />
                    </span>
                    <h3 className="font-black text-base text-neutral-900">Financial Revenue & Tax Report</h3>
                    <p className="text-xs text-neutral-500">
                      Accounting summary of gross merchandise value, sales tax collected, courier fees, and discounts.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('revenue')}
                    className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Financial CSV</span>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Users className="h-5 w-5" />
                    </span>
                    <h3 className="font-black text-base text-neutral-900">Registered Users Directory</h3>
                    <p className="text-xs text-neutral-500">
                      List of all customers, verified phone numbers, emails, addresses, and authorization roles.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('users')}
                    className="w-full py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Users CSV</span>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Bike className="h-5 w-5" />
                    </span>
                    <h3 className="font-black text-base text-neutral-900">Courier Fleet & Earnings Performance</h3>
                    <p className="text-xs text-neutral-500">
                      Rider roster, vehicle registrations, completed drops, cumulative earnings, and customer ratings.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCsv('partners')}
                    className="w-full py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Fleet CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CONFIRMATION DIALOG (CLEARANCE / DESTRUCTIVE ACTIONS) */}
      {/* ============================================================== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center space-x-3">
              <span
                className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                  confirmDialog.isDanger ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h3 className="text-base font-black text-neutral-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md ${
                  confirmDialog.isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
                }`}
              >
                {actionLoading ? 'Processing...' : confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: INSPECT & VERIFY PARTNER KYC                          */}
      {/* ============================================================== */}
      {partnerKycModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900">Courier KYC Verification</h3>
              <button
                onClick={() => setPartnerKycModal({ isOpen: false, partner: null, reason: '' })}
                className="p-1.5 rounded-full hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 space-y-1">
                <div className="font-bold text-neutral-900">{partnerKycModal.partner?.user?.name}</div>
                <div className="text-neutral-500">{partnerKycModal.partner?.user?.email}</div>
                <div className="text-neutral-500">Phone: {partnerKycModal.partner?.user?.phone || 'Not provided'}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-neutral-50">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Vehicle Type</span>
                  <div className="font-bold capitalize">{partnerKycModal.partner?.vehicle?.type}</div>
                  <div className="font-mono text-neutral-500 text-[11px] mt-0.5">
                    {partnerKycModal.partner?.vehicle?.plateNumber || 'No plate'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">License Number</span>
                  <div className="font-mono font-bold text-neutral-800">
                    {partnerKycModal.partner?.documents?.licenseNumber || 'LIC-894120'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Rejection Reason (if applicable):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expired license or blurry image"
                  value={partnerKycModal.reason}
                  onChange={(e) => setPartnerKycModal({ ...partnerKycModal, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-100">
              <button
                disabled={actionLoading}
                onClick={() =>
                  handleVerifyKyc(partnerKycModal.partner._id, 'rejected', partnerKycModal.reason)
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100"
              >
                Reject Documents
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleVerifyKyc(partnerKycModal.partner._id, 'approved')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Approve & Activate Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: MANUAL COURIER ASSIGNMENT                             */}
      {/* ============================================================== */}
      {assignPartnerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-neutral-900">
              Assign Courier to Order #{assignPartnerModal.order?.orderNumber}
            </h3>
            <p className="text-xs text-neutral-500">
              Select an available delivery partner to dispatch this order immediately.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700">Select Courier:</label>
              <select
                value={assignPartnerModal.partnerId}
                onChange={(e) => setAssignPartnerModal({ ...assignPartnerModal, partnerId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 font-bold"
              >
                {partnersData.partners.map((p) => (
                  <option key={p.user?._id} value={p.user?._id}>
                    {p.user?.name} ({p.vehicle?.type} - {p.isOnline ? 'Online' : 'Offline'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                onClick={() => setAssignPartnerModal({ isOpen: false, order: null, partnerId: '' })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleAssignPartner}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CREATE / EDIT PRODUCT                                 */}
      {/* ============================================================== */}
      {productModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900">
                {productModal.isEdit ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setProductModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-full hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={productModal.data.name}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Product ID (SKU)</label>
                  <input
                    type="text"
                    placeholder="e.g. CC-DAL-001"
                    value={productModal.data.productId || ''}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, productId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Sampann, Aashirvaad"
                    value={productModal.data.brand || ''}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, brand: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    placeholder="e.g. Yellow Dal, Whole Wheat"
                    value={productModal.data.subcategory || ''}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, subcategory: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 185"
                    value={productModal.data.mrp || ''}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, mrp: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productModal.data.price}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, price: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Discount Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productModal.data.discountPrice}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, discountPrice: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Default Unit / Size</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 serving, Large"
                    value={productModal.data.unit}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, unit: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Stock Availability</label>
                  <input
                    type="number"
                    required
                    value={productModal.data.stock}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, stock: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Category</label>
                  <select
                    value={productModal.data.category}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, category: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Section</label>
                  <select
                    value={productModal.data.type}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, type: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-bold"
                  >
                    <option value="food">Restaurant Food</option>
                    <option value="grocery">Quick Mart Grocery</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Featured & Bestseller */}
              <div className="flex items-center space-x-6 py-1">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(productModal.data.isBestseller)}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, isBestseller: e.target.checked },
                      })
                    }
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Mark as Bestseller 🔥</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(productModal.data.isFeatured)}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, isFeatured: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mark as Featured ✨</span>
                </label>
              </div>

              {/* Pack Sizes & Variants Manager */}
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-neutral-800 text-[11px] uppercase tracking-wider">
                    Pack Sizes & Variants ({productModal.data.variants?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const curVariants = [...(productModal.data.variants || [])];
                      curVariants.push({
                        size: '1kg',
                        unit: 'kg',
                        mrp: parseFloat(productModal.data.price || 100),
                        sellingPrice: parseFloat(productModal.data.price || 90),
                        discountPercent: 10,
                        stock: 50,
                        isDefault: curVariants.length === 0,
                      });
                      setProductModal({
                        ...productModal,
                        data: { ...productModal.data, variants: curVariants },
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  >
                    + Add Size Variant
                  </button>
                </div>

                {productModal.data.variants && productModal.data.variants.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {productModal.data.variants.map((v, vIdx) => (
                      <div
                        key={vIdx}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-2 rounded-xl bg-white border border-neutral-200 text-[11px]"
                      >
                        <input
                          type="text"
                          placeholder="Size (e.g. Regular)"
                          value={v.size}
                          onChange={(e) => {
                            const vars = [...productModal.data.variants];
                            vars[vIdx].size = e.target.value;
                            setProductModal({ ...productModal, data: { ...productModal.data, variants: vars } });
                          }}
                          className="flex-1 sm:w-20 px-2 py-1 border rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="MRP"
                          value={v.mrp}
                          onChange={(e) => {
                            const vars = [...productModal.data.variants];
                            vars[vIdx].mrp = parseFloat(e.target.value) || 0;
                            setProductModal({ ...productModal, data: { ...productModal.data, variants: vars } });
                          }}
                          className="w-16 px-2 py-1 border rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Sell Price"
                          value={v.sellingPrice}
                          onChange={(e) => {
                            const vars = [...productModal.data.variants];
                            vars[vIdx].sellingPrice = parseFloat(e.target.value) || 0;
                            setProductModal({ ...productModal, data: { ...productModal.data, variants: vars } });
                          }}
                          className="w-16 px-2 py-1 border rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => {
                            const vars = [...productModal.data.variants];
                            vars[vIdx].stock = parseInt(e.target.value, 10) || 0;
                            setProductModal({ ...productModal, data: { ...productModal.data, variants: vars } });
                          }}
                          className="w-16 px-2 py-1 border rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const vars = productModal.data.variants.filter((_, idx) => idx !== vIdx);
                            setProductModal({ ...productModal, data: { ...productModal.data, variants: vars } });
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg ml-auto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-400">
                    No individual pack sizes defined. The base unit & price above will be used.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Primary Image URL (1:1 Square)</label>
                <input
                  type="url"
                  required
                  value={productModal.data.images[0] || ''}
                  onChange={(e) =>
                    setProductModal({
                      ...productModal,
                      data: { ...productModal.data, images: [e.target.value] },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={productModal.data.description}
                  onChange={(e) =>
                    setProductModal({
                      ...productModal,
                      data: { ...productModal.data, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setProductModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600"
                >
                  {actionLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CREATE / EDIT CATEGORY                                */}
      {/* ============================================================== */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-neutral-900">
              {categoryModal.isEdit ? 'Edit Category' : 'Create Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryModal.data.name}
                  onChange={(e) =>
                    setCategoryModal({
                      ...categoryModal,
                      data: { ...categoryModal.data, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  required
                  value={categoryModal.data.image}
                  onChange={(e) =>
                    setCategoryModal({
                      ...categoryModal,
                      data: { ...categoryModal.data, image: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCategoryModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: CREATE COUPON                                         */}
      {/* ============================================================== */}
      {couponModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-neutral-900">Create New Coupon Promo</h3>
            <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH30"
                  value={couponModal.data.code}
                  onChange={(e) =>
                    setCouponModal({
                      ...couponModal,
                      data: { ...couponModal.data, code: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Discount Type</label>
                  <select
                    value={couponModal.data.discountType}
                    onChange={(e) =>
                      setCouponModal({
                        ...couponModal,
                        data: { ...couponModal.data, discountType: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 20"
                    value={couponModal.data.discountValue}
                    onChange={(e) =>
                      setCouponModal({
                        ...couponModal,
                        data: { ...couponModal.data, discountValue: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={couponModal.data.minOrderValue}
                    onChange={(e) =>
                      setCouponModal({
                        ...couponModal,
                        data: { ...couponModal.data, minOrderValue: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={couponModal.data.expiryDate}
                    onChange={(e) =>
                      setCouponModal({
                        ...couponModal,
                        data: { ...couponModal.data, expiryDate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCouponModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600"
                >
                  Create Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: CREATE HERO BANNER                                    */}
      {/* ============================================================== */}
      {bannerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-neutral-900">New Storefront Banner</h3>
            <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50% Off Gourmet Pizzas"
                  value={bannerModal.data.title}
                  onChange={(e) =>
                    setBannerModal({
                      ...bannerModal,
                      data: { ...bannerModal.data, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="Short marketing hook"
                  value={bannerModal.data.subtitle}
                  onChange={(e) =>
                    setBannerModal({
                      ...bannerModal,
                      data: { ...bannerModal.data, subtitle: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  required
                  value={bannerModal.data.imageUrl}
                  onChange={(e) =>
                    setBannerModal({
                      ...bannerModal,
                      data: { ...bannerModal.data, imageUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setBannerModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600"
                >
                  Publish Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
