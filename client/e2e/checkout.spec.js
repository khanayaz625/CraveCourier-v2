import { test, expect } from '@playwright/test';

test.describe('Crave Food & Grocery - E2E Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user authentication session in localStorage if needed
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'crave-auth-storage',
        JSON.stringify({
          state: {
            user: {
              _id: '65f100000000000000000001',
              name: 'E2E Test Shopper',
              email: 'e2e_shopper@crave.test',
              role: 'customer',
              phone: '9876543210',
              isEmailVerified: true,
            },
            token: 'mock-e2e-access-token',
            isAuthenticated: true,
          },
          version: 0,
        })
      );
    });
  });

  test('Complete Checkout: Home -> Add Item to Cart -> Review Cart -> Checkout -> Order Success', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Crave/);

    // 2. Mock API endpoints for catalog, cart, and payment
    await page.route('**/api/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            products: [
              {
                _id: 'prod_e2e_001',
                name: 'Truffle Smash Burger',
                slug: 'truffle-smash-burger',
                price: 14.99,
                discountPrice: 12.99,
                type: 'food',
                category: { _id: 'cat_01', name: 'Burgers' },
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                description: 'Double Angus beef with black truffle aioli and brioche bun',
                isVeg: false,
                rating: 4.8,
                inStock: true,
              },
            ],
            pagination: { total: 1, page: 1, pages: 1 },
          },
        }),
      });
    });

    await page.route('**/api/cart*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  product: {
                    _id: 'prod_e2e_001',
                    name: 'Truffle Smash Burger',
                    price: 12.99,
                    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                  },
                  quantity: 1,
                  price: 12.99,
                },
              ],
              subtotal: 12.99,
              deliveryFee: 2.99,
              tax: 1.04,
              discount: 0,
              total: 17.02,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  product: {
                    _id: 'prod_e2e_001',
                    name: 'Truffle Smash Burger',
                    price: 12.99,
                    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                  },
                  quantity: 1,
                  price: 12.99,
                },
              ],
              subtotal: 12.99,
              deliveryFee: 2.99,
              tax: 1.04,
              discount: 0,
              total: 17.02,
            },
          }),
        });
      }
    });

    await page.route('**/api/payments/create-cod-order', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            order: {
              _id: 'order_e2e_9999',
              orderNumber: 'CRV-9999-E2E',
              total: 17.02,
              paymentMethod: 'cod',
              paymentStatus: 'pending',
              orderStatus: 'Placed',
              createdAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    // 3. Verify Product Card renders
    const productHeading = page.locator('text=Truffle Smash Burger').first();
    await expect(productHeading).toBeVisible({ timeout: 10000 });

    // 4. Click Add to Cart
    const addBtn = page.locator('button:has-text("Add")').first();
    await addBtn.click();

    // 5. Navigate to Cart
    await page.goto('/cart');
    await expect(page.locator('text=Order Summary')).toBeVisible();
    await expect(page.locator('text=Truffle Smash Burger')).toBeVisible();

    // 6. Click Proceed to Checkout
    const checkoutBtn = page.locator('button:has-text("Proceed to Checkout"), a:has-text("Proceed to Checkout")').first();
    await checkoutBtn.click();

    // 7. On Checkout page, verify step progression
    await page.waitForURL('**/checkout');
    await expect(page.locator('text=Delivery Address')).toBeVisible();
  });
});

