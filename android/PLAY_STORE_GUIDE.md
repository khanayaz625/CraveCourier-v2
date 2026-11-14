# Crave - Google Play Store Release & Deployment Playbook

This master guide provides the complete, end-to-end instructions for packaging and releasing the **Crave Food & Grocery Delivery** platform to the **Google Play Store**.

---

## Table of Contents
1. [Option A (Recommended): Trusted Web Activity (TWA) with Bubblewrap](#1-option-a-recommended-trusted-web-activity-twa-with-bubblewrap)
2. [Option B: Native Bridge with Capacitor](#2-option-b-native-bridge-with-capacitor)
3. [App Signing & Keystore Handling](#3-app-signing--keystore-handling)
4. [Digital Asset Links Verification (Zero URL Bar)](#4-digital-asset-links-verification-zero-url-bar)
5. [Play Store Assets & Graphic Specifications](#5-play-store-assets--graphic-specifications)
6. [Store Listing Metadata (Copywriting & SEO)](#6-store-listing-metadata-copywriting--seo)
7. [Play Console Data Safety Form Exact Answers](#7-play-console-data-safety-form-exact-answers)
8. [Internal Testing Track & Release Verification](#8-internal-testing-track--release-verification)

---

## 1. Option A (Recommended): Trusted Web Activity (TWA) with Bubblewrap

A **Trusted Web Activity (TWA)** wraps your verified PWA directly into an Android App Bundle (`.aab`) powered by Android's modern Chrome Custom Tabs engine:
- **Instant updates:** Every frontend change deployed to your web server immediately reflects in the Android app without submitting new app updates to Google Play.
- **Ultra-lightweight:** Bundle size is typically under **3 MB** (compared to 30MB+ for native wrappers).
- **Zero URL Bar:** Seamless native look and feel when verified via Digital Asset Links.

### Step 1.1: Generate the Production Keystore
Generate a 2048-bit RSA signing key using Java's `keytool`:

```bash
cd d:\food-delivery\Crave\android

# Run the automated Windows script:
generate-keystore.bat

# Or run the manual command:
keytool -genkey -v \
  -keystore crave-release-key.keystore \
  -alias crave-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Extract the SHA-256 fingerprint:
```bash
keytool -list -v -keystore crave-release-key.keystore -alias crave-key | findstr "SHA256:"
```
*Example output:* `SHA256: E5:2F:98:B4:4D:23:6B:8F:90:31:4A:21:5C:8B:E7:F4:02:18:93:7B:64:91:30:4A:E9:12:87:3F:89:12:4D:5E`

---

### Step 1.2: Host Digital Asset Links on Your Domain
Copy the extracted fingerprint into [client/public/.well-known/assetlinks.json](file:///d:/food-delivery/Crave/client/public/.well-known/assetlinks.json):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.crave.app",
      "sha256_cert_fingerprints": [
        "E5:2F:98:B4:4D:23:6B:8F:90:31:4A:21:5C:8B:E7:F4:02:18:93:7B:64:91:30:4A:E9:12:87:3F:89:12:4D:5E"
      ]
    }
  }
]
```

Deploy your web app. Confirm this URL returns `HTTP 200` with header `Content-Type: application/json`:
```
https://crave-delivery.com/.well-known/assetlinks.json
```

---

### Step 1.3: Initialize and Build with Bubblewrap CLI
Google maintains `@bubblewrap/cli` to generate production Android projects directly from a Web App Manifest.

Inside the `android/` directory:

```bash
# Automated build via helper script:
build-twa.bat

# Or run via npx:
npx @bubblewrap/cli build
```

If you are initializing from scratch against your live domain:
```bash
npx @bubblewrap/cli init --manifest=https://crave-delivery.com/manifest.webmanifest
```

**Bubblewrap Prompt Values:**
- **Application name:** `Crave Food & Grocery Delivery`
- **Short name:** `Crave`
- **Package ID:** `com.crave.app`
- **Display mode:** `standalone`
- **Orientation:** `default`
- **Status bar color:** `#FF6B35`
- **Splash screen color:** `#FF6B35`
- **Icon URL:** `https://crave-delivery.com/icons/pwa-512x512.png`
- **Maskable Icon URL:** `https://crave-delivery.com/icons/maskable-icon-512x512.png`
- **Keystore path:** `./crave-release-key.keystore`
- **Key alias:** `crave-key`

This produces `app-release-bundle.aab` ready for upload to Google Play Console.

---

## 2. Option B: Native Bridge with Capacitor

If your roadmap requires deep hardware level access (e.g., custom native hardware thermal printer SDKs for restaurant kitchens, low-level Bluetooth scales, or background wake locks), Capacitor is the ideal choice.

Refer to the complete setup guide in [android/CAPACITOR_SETUP.md](file:///d:/food-delivery/Crave/android/CAPACITOR_SETUP.md).

---

## 3. App Signing & Keystore Handling

### Crucial Distinction: Upload Key vs. Google Play App Signing
When you upload `app-release-bundle.aab` to Google Play:
1. Your local `crave-release-key.keystore` is your **Upload Key**.
2. Google Play strips your upload signature and signs the user-facing APKs with an **App Signing Key** managed securely in Google Cloud Key Management Service (KMS).

> [!IMPORTANT]
> Because Google re-signs the application with Google Play App Signing, **Google's SHA-256 fingerprint will be different from your local upload key fingerprint**.
>
> Once you upload your first release in the Google Play Console:
> 1. Go to **Release** &rarr; **Setup** &rarr; **App Integrity** &rarr; **App Signing**.
> 2. Copy the **App signing key certificate SHA-256 fingerprint**.
> 3. Add this SHA-256 fingerprint to your `client/public/.well-known/assetlinks.json` alongside your upload key fingerprint:
>
> ```json
> "sha256_cert_fingerprints": [
>   "YOUR_LOCAL_UPLOAD_KEY_FINGERPRINT",
>   "GOOGLE_PLAY_APP_SIGNING_KEY_FINGERPRINT"
> ]
> ```
> 4. Deploy the updated `assetlinks.json` to your server. This ensures the app runs with **no browser URL bar** for both your local test builds and official Play Store installs!

---

## 4. Digital Asset Links Verification (Zero URL Bar)

To verify that Android and Chrome correctly recognize your app's digital asset link:

1. **Google Statement List Verification Tool:**
   Visit:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://crave-delivery.com&relation=delegate_permission/common.handle_all_urls`
   You should see your `com.crave.app` statement returned with `status: SUCCESS`.

2. **Command Line Device Test (via ADB):**
   ```bash
   adb install app-release-signed.apk
   adb shell pm get-app-links com.crave.app
   ```
   *Expected output:* `crave-delivery.com: verified`

---

## 5. Play Store Assets & Graphic Specifications

| Asset | Dimensions | Format | Requirements |
|---|---|---|---|
| **App Icon** | 512 &times; 512 px | 32-bit PNG | Max 1024 KB. No transparency on background. Square shape with no rounded corners (Google applies rounding). Located at [client/public/icons/pwa-512x512.png](file:///d:/food-delivery/Crave/client/public/icons/pwa-512x512.png). |
| **Feature Graphic** | 1024 &times; 500 px | JPEG or 24-bit PNG | Max 15 MB. No transparency. Displays at the top of your store listing. Use Crave vibrant gradient `#FF6B35` &rarr; `#2EC4B6` with hero slogan "Hot Food & Fresh Groceries in 20 Mins". |
| **Phone Screenshots** | 1080 &times; 1920 px (or 9:16) | JPEG or PNG | Min 4 screenshots, max 8. Showcase: 1. Home Discovery, 2. Live Map Order Tracking, 3. Cart & 1-Click Stripe Checkout, 4. Fresh Mart & Groceries. |
| **7-inch Tablet Screenshots** | 1200 &times; 1920 px | JPEG or PNG | Min 1 screenshot. |
| **10-inch Tablet Screenshots** | 1600 &times; 2560 px | JPEG or PNG | Min 1 screenshot. |

---

## 6. Store Listing Metadata (Copywriting & SEO)

### App Title (Max 30 characters)
```
Crave: Food & Grocery Delivery
```

### Short Description (Max 80 characters)
```
Order hot restaurant meals and fresh daily groceries delivered to your doorstep.
```

### Full Description (Max 4,000 characters)
```markdown
Craving your favorite restaurant dishes or need fresh groceries in minutes? Crave brings hot meals, snacks, daily essentials, and fresh produce straight to your doorstep with lightning-fast delivery!

🍔 ALL YOUR FAVORITE RESTAURANTS
Discover the best local eateries, top fast-food chains, gourmet cafes, and bakery delights in your neighborhood. From piping-hot artisan pizzas and burgers to sushi, tacos, and authentic local meals.

🥦 FRESH GROCERY & DAILY ESSENTIALS
Skip the supermarket lines! Stock your pantry with fresh vegetables, crisp fruits, organic dairy, farm-fresh eggs, beverages, and household staples delivered in as fast as 20 minutes.

📍 LIVE REAL-TIME GPS TRACKING
Watch your order travel from the kitchen to your table on an interactive live map:
- Order Placed & Confirmed
- Kitchen Preparing with Care
- Rider Assigned & Picked Up
- Live GPS navigation straight to your door

💳 SEAMLESS & SECURE PAYMENT
Pay with confidence using:
- Credit / Debit Cards (Stripe PCI-DSS certified security)
- Digital Wallets & Instant UPI
- Cash on Delivery (COD)

🛵 SAFE & VERIFIED DELIVERIES
Every delivery is verified with a secure One-Time Password (OTP) delivered to your app to ensure your order reaches the right hands every single time.

⚡ EXCLUSIVE DEALS & SAVINGS
Enjoy daily coupons, seasonal discounts, flash sales on fresh grocery baskets, and free delivery perks!

Download Crave today and satisfy every craving!
```

---

## 7. Play Console Data Safety Form Exact Answers

Google Play requires accurate disclosure of all collected and shared user data:

### 1. Data Collection & Sharing Overview
- Does your app collect or share any user data? **Yes**
- Is all user data encrypted in transit? **Yes** (HTTPS / TLS 1.3)
- Do you provide a way for users to request data deletion? **Yes** (Users can request account deletion via in-app profile or privacy@crave-delivery.com)

### 2. Specific Data Types:
- **Location &rarr; Approximate Location & Precise Location:**
  - *Collected?* **Yes**
  - *Shared?* **Yes** (Shared with delivery partner to fulfill order drop-off and show customer live delivery progress)
  - *Purpose:* App functionality, Order delivery logistics, Fraud prevention.
  - *Ephemeral?* No (Stored with Order records for delivery history).
- **Personal Info &rarr; Name, Email, Phone Number, User IDs:**
  - *Collected?* **Yes**
  - *Purpose:* Account management, Authentication, Customer support.
- **Financial Info &rarr; Purchase History:**
  - *Collected?* **Yes** (Order items and amounts for order history).
- **Financial Info &rarr; Payment Info:**
  - *Collected?* **No** (Processed directly by PCI-DSS compliant Stripe SDK / web elements; Crave does not receive or store card numbers).
- **Photos & Videos &rarr; Files & Docs (Delivery Partners Only):**
  - *Collected?* **Yes** (KYC driver license and identity upload for delivery partner onboarding).
- **Device or Other IDs &rarr; Device Identifiers:**
  - *Collected?* **Yes** (Firebase Cloud Messaging push tokens for delivery notifications).

---

## 8. Internal Testing Track & Release Verification

Before opening your app to production, always release to the **Internal Testing Track**:

1. Log in to [Google Play Console](https://play.google.com/console).
2. Select your app: **Crave: Food & Grocery Delivery**.
3. Under the **Testing** section on the left sidebar, click **Internal testing**.
4. Click **Create new release** in the top right.
5. In the **App bundles** drop zone, drag and drop `app-release-bundle.aab`.
6. Enter a **Release name** (e.g., `1.0.0 (Build 1)`).
7. Under **Release notes**, enter:
   ```
   Initial Crave delivery beta release with live GPS order tracking, Stripe payments, and offline support.
   ```
8. Click **Next** &rarr; **Save** &rarr; **Review release** &rarr; **Start rollout to Internal testing**.

### Testing Checklist for Internal Testers:
- [ ] Install via opt-in link: `https://play.google.com/apps/testing/com.crave.app`
- [ ] Confirm no Chrome URL address bar appears at the top (validates Asset Links).
- [ ] Log in as Customer &rarr; browse products &rarr; add to cart.
- [ ] Place an order using Stripe test card `4242 4242 4242 4242`.
- [ ] Verify live tracking map loads and updates order status.
- [ ] Log in as Delivery Partner &rarr; accept incoming order &rarr; simulate pickup &rarr; enter OTP to complete delivery.
- [ ] Verify push notifications are received when order status changes.
- [ ] Test offline behavior by enabling Airplane Mode: ensure [offline.html](file:///d:/food-delivery/Crave/client/public/offline.html) renders cleanly with retry button.

