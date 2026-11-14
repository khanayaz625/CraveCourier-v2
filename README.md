# 🛵 CraveCourier – Indian Kirana, Grocery & Food Delivery Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248.svg)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3+-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CraveCourier** is a full-stack hyper-local food and grocery delivery platform engineered for Indian towns and metropolitan markets. It combines freshly baked hot meals from local kitchens (such as Pizza 65) with a complete **290+ product Indian Kirana & Grocery catalogue** featuring multi-pack variant selection, live order tracking, transparent pricing, and instant dispatch.

---

## 🌟 Key Highlights

### 🛒 Complete Indian Kirana Catalogue (19 Categories, 290+ Products)
- **19 Core Product Categories**:
  1. All Types of Dal and Pulses (Toor, Moong, Chana, Masoor, Urad, Rajma, Kabuli Chana)
  2. Atta, Flour and Grains (Aashirvaad Sharbati, Besan, Sooji, Maida, Makki, Bajra, Poha)
  3. Rice and Basmati Rice (India Gate Classic, Daawat Biryani, Wada Kolam, Sona Masoori)
  4. Cooking Oil and Ghee (Fortune Kachi Ghani Mustard Oil, Engine, Amul Cow Ghee, Figaro)
  5. Masala and Spices (MDH Deggi Mirch, Tata Curcumin Haldi, Everest Kitchen King, Whole Spices)
  6. Sugar, Salt and Sweeteners (Madhur Sulphurless Sugar, Tata Salt, Sendha Namak, Honey)
  7. Dry Fruits and Nuts (Happilo California Badam, W240 Kaju, Kishmish, Akhrot, Makhana)
  8. Tea, Coffee and Beverages (Tata Tea Gold, Nescafe Classic, Rooh Afza, Bournvita)
  9. Biscuits, Snacks and Namkeen (Parle-G, Good Day, Haldiram's Bhujia, Kurkure, Sweets)
  10. Sauces, Pickles and Cooking Essentials (Maggi Ketchup, Aam ka Achaar, Ginger Garlic Paste)
  11. Dairy and Refrigerated Products (Amul Milk, Amul Butter, Fresh Paneer, Dahi, Cheese)
  12. Household Cleaning Products (Surf Excel, Ariel, Vim Bar & Gel, Harpic, Lizol, Colin)
  13. Personal Care Products (Colgate Strong Teeth, Dettol Soap, Dove, Parachute Hair Oil)
  14. Fresh Vegetables (Farm Tomatoes, Onions, Potatoes, Chillies, Palak, Bhindi, Lauki)
  15. Fresh Fruits (Kashmiri Apples, Bananas, Nagpur Oranges, Anar, Daab Nariyal)
  16. Instant Food and Ready-to-Cook (Maggi 2-Minute Noodles, Kellogg's Corn Flakes, MTR Idli)
  17. Bakery Products (Harvest Gold Bread, Brown Bread, Pav Buns, Burger Buns, Pizza Base)
  18. Baby Care Essentials (Pampers Pants M/L, Johnson's Baby Shampoo, Himalaya Wipes)
  19. Pooja and Daily Kirana Essentials (Cycle Agarbatti, Bhimseni Kapoor, Cow Ghee Battis)
- **Pack Sizes & Multi-Variants**: Select between different pack weights (`500g`, `1kg`, `2kg`, `5kg`, `500ml`, `1L`, `5L`) before adding to cart with dynamic MRP, discount calculation, and SKU stock tracking.
- **1:1 Square Product Photography**: Clean, centered e-commerce photography with white neutral backgrounds and AI prompt mappings.

### 🍕 Pizza 65 & Kitchen Delicacies
- Single Cheese Margherita, Delight Corn, Mix Veg Paneer, Tandoori Paneer, Shahi Double Cheese, and Kulhad Pizzas in Small and Large sizes.
- Desi Veg Aloo Tikki Burgers, Paneer Burgers, Grilled Sandwiches, and Loaded Peri-Peri / Cheesy Pizza Fries.

### 🚚 Transparent Town Delivery Model
- **1km Free Delivery**: Orders within 1km radius from the hub enjoy ₹0 delivery charge.
- **₹20 Beyond 1km**: Flat ₹20 delivery fee for extended distances with 0% extra hidden fees or platform surcharges.
- **Real-Time Geolocation Tracking**: Vector GPS simulation with Driver Scooter marker, distance calculation, ETA, and live Socket.io updates.

### 💖 Customer Storefront & Cart Features
- **Interactive Variant Picker**: Instant pack-size pills on cards and product detail pages.
- **Inline Quantity Stepper**: `- 1 +` stepper appears immediately when items enter the cart.
- **Saved Wishlist**: One-click heart toggle with persistent local storage and navigation badge counter.
- **3-Step Checkout**: Saved addresses with GPS detect, coupon validation (`WELCOME50`, `CRAVE20`), and Razorpay / Stripe / COD payment flows.

### 🛠️ Admin Operations & Bulk Tools
- **Complete Product CRUD**: Add, edit, delete, adjust inventory, and manage pack variants.
- **CSV & Excel Export**: 1-click catalogue download at `/api/products/export/csv`.
- **Bulk Product Import**: Fast batch JSON / CSV upload via `/api/products/import`.
- **Live Fleet & Order Management**: Real-time order dispatching and delivery partner assignment.

---

## 🏗️ Technology Architecture

- **Frontend**: React 18, Vite 5, Tailwind CSS, Zustand, Lucide React, Recharts, Canvas Confetti.
- **Backend**: Node.js, Express.js (ESM), Socket.io, Mongoose (MongoDB ODM), JWT Authentication, Helmet, Rate Limiter.
- **Database**: MongoDB 7.0 (with 2dsphere Geospatial indexing).
- **Tooling**: Python catalogue generator, CSV stream parser.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally on port 27017 or a MongoDB Atlas URI

### 1. Clone the Repository
```bash
git clone https://github.com/khanayaz625/CraveCourier-v2.git
cd CraveCourier-v2
```

### 2. Configure Environment Variables
Copy the example environment file for the server:
```bash
cp server/.env.example server/.env
```

### 3. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm install
npm --prefix server install
npm --prefix client install
```

### 4. Seed Categories & 290+ Products
```bash
# Seeds all 19 grocery categories and full 291 products
node server/src/seed/seedGroceryCatalogue.js
```

### 5. Launch Development Servers
```bash
# Run both Backend API (:5000) and Frontend Client (:5173) concurrently
npm run dev
```

---

## 🔑 Default Credentials

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Customer** | `customer@crave.com` | `Customer@12345` | Browse 290+ items, select variants, place orders |
| **Super Admin** | `admin@crave.com` | `Admin@12345` | Catalog management, CSV export, live KPIs |
| **Delivery Partner** | `delivery@crave.com` | `Delivery@12345` | Live delivery dispatch dashboard, GPS routes |
| **Vendor** | `vendor@crave.com` | `Vendor@12345` | Kitchen and store inventory control |

---

## 📄 Catalogue Data Assets

- `cravecourier_grocery_catalogue.json`: Complete 291-product structured JSON database.
- `cravecourier_grocery_catalogue.csv`: Full spreadsheet compatible export with variants and prompts.
- `generate_catalogue.py`: Automated catalogue synthesis script.

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).
