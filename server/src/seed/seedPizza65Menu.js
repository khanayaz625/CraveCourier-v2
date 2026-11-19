import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { Product } from '../models/Product.model.js';
import { Category } from '../models/Category.model.js';
import { User } from '../models/User.model.js';

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-');

export async function seedPizza65() {
  try {
    console.log('Connecting to MongoDB for Pizza 65 menu seeding...');
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Find or create Vendor
    let vendor = await User.findOne({ email: 'vendor@crave.com' });
    if (!vendor) {
      vendor = await User.findOne({ role: 'admin' });
    }

    // 2. Ensure Categories exist with clean metadata
    const categoriesData = [
      {
        name: 'Pizzas',
        slug: 'pizzas',
        image: '/images/products/margherita-pizza.jpg',
        description: 'Freshly baked hand-tossed pizzas & trending kulhad pizzas',
        type: 'food',
        displayOrder: 1,
        isActive: true,
      },
      {
        name: 'Burgers',
        slug: 'burgers',
        image: '/images/products/veg-aloo-tikki-cheese-burger.jpg',
        description: 'Crispy golden aloo tikki & loaded cheese burgers',
        type: 'food',
        displayOrder: 2,
        isActive: true,
      },
      {
        name: 'Sandwiches',
        slug: 'sandwiches',
        image: '/images/products/cheese-corn-grilled-paneer-sandwich.jpg',
        description: 'Freshly grilled vegetable, paneer & pizza sandwiches',
        type: 'food',
        displayOrder: 3,
        isActive: true,
      },
      {
        name: 'Fries & Sides',
        slug: 'fries',
        image: '/images/products/peri-peri-fries.jpg',
        description: 'Crispy salted, peri-peri & cheesy loaded fries',
        type: 'food',
        displayOrder: 4,
        isActive: true,
      },
    ];

    const categoryMap = {};
    for (const catData of categoriesData) {
      let cat = await Category.findOne({ slug: catData.slug });
      if (!cat) {
        cat = await Category.create(catData);
      } else {
        cat.image = catData.image;
        cat.description = catData.description;
        await cat.save();
      }
      categoryMap[catData.slug] = cat._id;
    }
    console.log('Categories initialized.');

    // 3. Clear any existing products to guarantee ONLY Pizza 65 items exist
    console.log('Purging existing product records...');
    await Product.deleteMany({});
    console.log('Products collection cleared.');

    // 4. All 18 Items from the Pizza 65 Menu Card
    const pizza65Products = [
      // ==========================================
      // PIZZAS
      // ==========================================
      {
        name: 'Margherita Pizza',
        brand: 'Pizza 65',
        categorySlug: 'pizzas',
        subcategory: 'Pizzas',
        description: 'Classic Italian pizza loaded with 100% real mozzarella cheese, fresh basil leaves, and rich herb tomato sauce on a hand-tossed golden crust.',
        image: '/images/products/margherita-pizza.jpg',
        price: 60,
        mrp: 80,
        unit: '1 Pizza',
        variants: [
          { size: 'Small (S)', unit: '7 inch', mrp: 80, sellingPrice: 60, discountPercent: 25, stock: 50, isDefault: true },
          { size: 'Large (L)', unit: '10 inch', mrp: 100, sellingPrice: 80, discountPercent: 20, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['pizza', 'margherita', 'cheese', 'pizza 65', 'veg'],
      },
      {
        name: 'Delight Corn Pizza',
        brand: 'Pizza 65',
        categorySlug: 'pizzas',
        subcategory: 'Pizzas',
        description: 'Golden sweet corn kernels with creamy melted mozzarella cheese and signature Italian seasoning on a freshly baked crust.',
        image: '/images/products/delight-corn-pizza.jpg',
        price: 70,
        mrp: 90,
        unit: '1 Pizza',
        variants: [
          { size: 'Small (S)', unit: '7 inch', mrp: 90, sellingPrice: 70, discountPercent: 22, stock: 50, isDefault: true },
          { size: 'Large (L)', unit: '10 inch', mrp: 120, sellingPrice: 100, discountPercent: 17, stock: 50, isDefault: false },
        ],
        isBestseller: false,
        isFeatured: true,
        tags: ['pizza', 'corn', 'sweet corn', 'pizza 65', 'veg'],
      },
      {
        name: 'Mix Veg Paneer Pizza',
        brand: 'Pizza 65',
        categorySlug: 'pizzas',
        subcategory: 'Pizzas',
        description: 'Loaded with fresh cottage cheese (paneer) cubes, crunchy capsicum, sweet onion, juicy tomatoes, and liquid cheese.',
        image: '/images/products/mix-veg-paneer-pizza.jpg',
        price: 80,
        mrp: 100,
        unit: '1 Pizza',
        variants: [
          { size: 'Small (S)', unit: '7 inch', mrp: 100, sellingPrice: 80, discountPercent: 20, stock: 50, isDefault: true },
          { size: 'Large (L)', unit: '10 inch', mrp: 140, sellingPrice: 110, discountPercent: 21, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['pizza', 'paneer', 'mix veg', 'pizza 65', 'veg'],
      },
      {
        name: 'Tandoori Paneer Cheese Pizza',
        brand: 'Pizza 65',
        categorySlug: 'pizzas',
        subcategory: 'Pizzas',
        description: 'Spicy marinated tandoori paneer chunks tossed with smokey tandoori sauce, red paprika, crisp capsicum, and mozzarella cheese.',
        image: '/images/products/tandoori-paneer-cheese-pizza.jpg',
        price: 80,
        mrp: 100,
        unit: '1 Pizza',
        variants: [
          { size: 'Small (S)', unit: '7 inch', mrp: 100, sellingPrice: 80, discountPercent: 20, stock: 50, isDefault: true },
          { size: 'Large (L)', unit: '10 inch', mrp: 160, sellingPrice: 130, discountPercent: 19, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['pizza', 'tandoori paneer', 'cheese', 'spicy', 'pizza 65', 'veg'],
      },
      {
        name: 'Shahi Double Cheese Paneer Pizza',
        brand: 'Pizza 65',
        categorySlug: 'pizzas',
        subcategory: 'Pizzas',
        description: 'Royal indulgence with a double layer of mozzarella & cheddar cheese, spiced marinated paneer cubes, and aromatic herbs.',
        image: '/images/products/shahi-double-cheese-paneer-pizza.jpg',
        price: 100,
        mrp: 130,
        unit: '1 Pizza',
        variants: [
          { size: 'Small (S)', unit: '7 inch', mrp: 130, sellingPrice: 100, discountPercent: 23, stock: 50, isDefault: true },
          { size: 'Large (L)', unit: '10 inch', mrp: 190, sellingPrice: 150, discountPercent: 21, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['pizza', 'double cheese', 'shahi', 'paneer', 'pizza 65', 'veg'],
      },
      {
        name: 'Kulhad Pizza',
        brand: 'Pizza 65',
        categorySlug: 'pizzas',
        subcategory: 'Pizzas',
        description: 'Trending clay kulhad baked pizza filled with diced veggies, sweet corn, paneer, oregano seasoning, and overflowing melted cheese.',
        image: '/images/products/kulhad-pizza.jpg',
        price: 60,
        mrp: 80,
        unit: '1 Kulhad',
        variants: [
          { size: 'Small (S)', unit: 'Standard Clay Pot', mrp: 80, sellingPrice: 60, discountPercent: 25, stock: 50, isDefault: true },
          { size: 'Large (L)', unit: 'Jumbo Clay Pot', mrp: 110, sellingPrice: 90, discountPercent: 18, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['kulhad pizza', 'trending', 'clay pot', 'cheese', 'pizza 65', 'veg'],
      },

      // ==========================================
      // BURGERS
      // ==========================================
      {
        name: 'Veg Aloo Tikki Burger',
        brand: 'Pizza 65',
        categorySlug: 'burgers',
        subcategory: 'Burgers',
        description: 'Crispy golden spiced potato patty topped with sliced tomatoes, crunchy onions, and signature burger mayonnaise in toasted sesame buns.',
        image: '/images/products/veg-aloo-tikki-burger.jpg',
        price: 40,
        mrp: 50,
        unit: '1 Burger',
        variants: [
          { size: 'Standard', unit: '1 Burger', mrp: 50, sellingPrice: 40, discountPercent: 20, stock: 50, isDefault: true },
        ],
        isBestseller: false,
        isFeatured: true,
        tags: ['burger', 'aloo tikki', 'crispy', 'pizza 65', 'veg'],
      },
      {
        name: 'Veg Aloo Tikki Cheese Burger',
        brand: 'Pizza 65',
        categorySlug: 'burgers',
        subcategory: 'Burgers',
        description: 'Classic crunchy aloo tikki topped with a thick slice of melted processed cheese, fresh lettuce, onion rings, and tangy secret sauce.',
        image: '/images/products/veg-aloo-tikki-cheese-burger.jpg',
        price: 50,
        mrp: 65,
        unit: '1 Burger',
        variants: [
          { size: 'Standard', unit: '1 Burger', mrp: 65, sellingPrice: 50, discountPercent: 23, stock: 50, isDefault: true },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['burger', 'cheese burger', 'aloo tikki', 'pizza 65', 'veg'],
      },
      {
        name: 'Paneer Aloo Tikki Cheese Burger',
        brand: 'Pizza 65',
        categorySlug: 'burgers',
        subcategory: 'Burgers',
        description: 'Crispy aloo tikki layered with a soft grilled paneer slice, melting cheese slice, fresh veggies, and spicy chipotle mayo.',
        image: '/images/products/paneer-aloo-tikki-cheese-burger.jpg',
        price: 60,
        mrp: 80,
        unit: '1 Burger',
        variants: [
          { size: 'Standard', unit: '1 Burger', mrp: 80, sellingPrice: 60, discountPercent: 25, stock: 50, isDefault: true },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['burger', 'paneer burger', 'cheese burger', 'pizza 65', 'veg'],
      },
      {
        name: 'Double Aloo Tikki Cheese Burger',
        brand: 'Pizza 65',
        categorySlug: 'burgers',
        subcategory: 'Burgers',
        description: 'Two crispy spiced potato patties stacked with double cheese, fresh salad greens, sliced tomatoes, and creamy dressing.',
        image: '/images/products/double-aloo-tikki-cheese-burger.jpg',
        price: 70,
        mrp: 90,
        unit: '1 Burger',
        variants: [
          { size: 'Standard', unit: 'Double Patty Burger', mrp: 90, sellingPrice: 70, discountPercent: 22, stock: 50, isDefault: true },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['burger', 'double tikki', 'double cheese', 'pizza 65', 'veg'],
      },

      // ==========================================
      // SANDWICHES
      // ==========================================
      {
        name: 'Veg Sandwich',
        brand: 'Pizza 65',
        categorySlug: 'sandwiches',
        subcategory: 'Sandwiches',
        description: 'Triangles of bread filled with cucumber, fresh tomatoes, bell peppers, boiled potatoes, and mint green chutney.',
        image: '/images/products/veg-sandwich.jpg',
        price: 40,
        mrp: 50,
        unit: '1 Sandwich',
        variants: [
          { size: 'Regular', unit: 'Single Layer', mrp: 50, sellingPrice: 40, discountPercent: 20, stock: 50, isDefault: true },
          { size: 'Grilled / Large', unit: 'Double Layer Grilled', mrp: 75, sellingPrice: 60, discountPercent: 20, stock: 50, isDefault: false },
        ],
        isBestseller: false,
        isFeatured: true,
        tags: ['sandwich', 'veg sandwich', 'pizza 65', 'veg'],
      },
      {
        name: 'Veg Cheese Sandwich',
        brand: 'Pizza 65',
        categorySlug: 'sandwiches',
        subcategory: 'Sandwiches',
        description: 'Loaded with chopped fresh veggies, green chutney, special sandwich masala, and generous grated cheese grilled until golden crisp.',
        image: '/images/products/veg-cheese-sandwich.jpg',
        price: 50,
        mrp: 65,
        unit: '1 Sandwich',
        variants: [
          { size: 'Regular', unit: 'Single Layer', mrp: 65, sellingPrice: 50, discountPercent: 23, stock: 50, isDefault: true },
          { size: 'Grilled / Large', unit: 'Double Layer Grilled', mrp: 90, sellingPrice: 70, discountPercent: 22, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['sandwich', 'cheese sandwich', 'grilled', 'pizza 65', 'veg'],
      },
      {
        name: 'Cheese Corn Grilled Paneer Sandwich',
        brand: 'Pizza 65',
        categorySlug: 'sandwiches',
        subcategory: 'Sandwiches',
        description: 'Perfectlys grilled multi-layer sandwich packed with succulent paneer cubes, juicy sweet corn, and gooey melted mozzarella cheese.',
        image: '/images/products/cheese-corn-grilled-paneer-sandwich.jpg',
        price: 60,
        mrp: 75,
        unit: '1 Sandwich',
        variants: [
          { size: 'Regular', unit: 'Grilled', mrp: 75, sellingPrice: 60, discountPercent: 20, stock: 50, isDefault: true },
          { size: 'Large', unit: 'Jumbo Grilled', mrp: 100, sellingPrice: 80, discountPercent: 20, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['sandwich', 'paneer sandwich', 'corn cheese', 'grilled', 'pizza 65', 'veg'],
      },
      {
        name: 'Masala Cheese Pizza Sandwich',
        brand: 'Pizza 65',
        categorySlug: 'sandwiches',
        subcategory: 'Sandwiches',
        description: 'Hybrid fusion sandwich stuffed with spicy pizza sauce, capsicum, corn, paneer, chatpata masala, and overflowing stretchy cheese.',
        image: '/images/products/masala-cheese-pizza-sandwich.jpg',
        price: 80,
        mrp: 100,
        unit: '1 Sandwich',
        variants: [
          { size: 'Regular', unit: 'Regular Cut', mrp: 100, sellingPrice: 80, discountPercent: 20, stock: 50, isDefault: true },
          { size: 'Jumbo / Large', unit: 'Jumbo 3-Layer', mrp: 150, sellingPrice: 120, discountPercent: 20, stock: 50, isDefault: false },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['sandwich', 'pizza sandwich', 'masala cheese', 'pizza 65', 'veg'],
      },

      // ==========================================
      // FRIES
      // ==========================================
      {
        name: 'Plain Salted Fries',
        brand: 'Pizza 65',
        categorySlug: 'fries',
        subcategory: 'Fries',
        description: 'Classic thin-cut French fries fried to golden perfection and lightly sprinkled with sea salt. Served hot and crispy.',
        image: '/images/products/plain-salted-fries.jpg',
        price: 20,
        mrp: 25,
        unit: '1 Portion',
        variants: [
          { size: 'Regular', unit: '1 Portion', mrp: 25, sellingPrice: 20, discountPercent: 20, stock: 50, isDefault: true },
        ],
        isBestseller: false,
        isFeatured: true,
        tags: ['fries', 'french fries', 'salted', 'pizza 65', 'veg'],
      },
      {
        name: 'Peri-Peri Fries',
        brand: 'Pizza 65',
        categorySlug: 'fries',
        subcategory: 'Fries',
        description: 'Crispy golden fries tossed in bold African peri-peri spice seasoning. Spicy, tangy, and addictive.',
        image: '/images/products/peri-peri-fries.jpg',
        price: 30,
        mrp: 40,
        unit: '1 Portion',
        variants: [
          { size: 'Regular', unit: '1 Portion', mrp: 40, sellingPrice: 30, discountPercent: 25, stock: 50, isDefault: true },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['fries', 'peri peri', 'spicy fries', 'pizza 65', 'veg'],
      },
      {
        name: 'Cheese Fries',
        brand: 'Pizza 65',
        categorySlug: 'fries',
        subcategory: 'Fries',
        description: 'Hot crispy French fries generously smothered with warm melted cheddar cheese sauce and a pinch of mixed Italian herbs.',
        image: '/images/products/cheese-fries.jpg',
        price: 50,
        mrp: 65,
        unit: '1 Portion',
        variants: [
          { size: 'Regular', unit: '1 Portion', mrp: 65, sellingPrice: 50, discountPercent: 23, stock: 50, isDefault: true },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['fries', 'cheese fries', 'cheddar', 'pizza 65', 'veg'],
      },
      {
        name: 'Mayo-Cheesy Pizza Fries',
        brand: 'Pizza 65',
        categorySlug: 'fries',
        subcategory: 'Fries',
        description: 'Loaded fries topped with pizza marinara sauce, garlic mayonnaise, melted mozzarella cheese, chopped capsicum, and oregano.',
        image: '/images/products/mayo-cheesy-pizza-fries.jpg',
        price: 80,
        mrp: 100,
        unit: '1 Portion',
        variants: [
          { size: 'Regular', unit: '1 Loaded Platter', mrp: 100, sellingPrice: 80, discountPercent: 20, stock: 50, isDefault: true },
        ],
        isBestseller: true,
        isFeatured: true,
        tags: ['fries', 'pizza fries', 'mayo cheesy', 'loaded fries', 'pizza 65', 'veg'],
      },
    ];

    console.log(`Inserting ${pizza65Products.length} Pizza 65 menu products...`);

    const insertedDocs = [];
    for (const p of pizza65Products) {
      const categoryId = categoryMap[p.categorySlug];
      const productDoc = await Product.create({
        name: p.name,
        slug: slugify(p.name.split('(')[0]),
        brand: p.brand,
        subcategory: p.subcategory,
        description: p.description,
        images: [p.image],
        price: p.price,
        mrp: p.mrp,
        discountPrice: p.price,
        unit: p.unit,
        variants: p.variants,
        stock: 50,
        category: categoryId,
        type: 'food',
        isVeg: true,
        isFeatured: p.isFeatured,
        isBestseller: p.isBestseller,
        rating: { average: 4.8, count: 35 },
        vendor: vendor?._id,
        tags: p.tags,
        isActive: true,
      });
      insertedDocs.push(productDoc);
    }

    console.log(`Successfully seeded ${insertedDocs.length} products from the Pizza 65 menu.`);

    const count = await Product.countDocuments();
    console.log(`Final product count in database: ${count}`);

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedPizza65();
