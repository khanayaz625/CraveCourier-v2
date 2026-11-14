import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';
import { Category, Product, User } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedGroceryCatalogue = async () => {
  try {
    console.info('[SEED-CATALOGUE] Connecting to MongoDB...');
    await mongoose.connect(ENV.MONGO_URI);
    console.info('[SEED-CATALOGUE] Connected to MongoDB.');

    // Find vendor user to assign as vendor
    let vendorUser = await User.findOne({ role: 'vendor' });
    if (!vendorUser) {
      vendorUser = await User.findOne({ role: 'admin' });
    }

    // Load JSON file
    const cataloguePath = path.resolve(__dirname, '../../../cravecourier_grocery_catalogue.json');
    if (!fs.existsSync(cataloguePath)) {
      throw new Error(`Catalogue file not found at: ${cataloguePath}`);
    }

    const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    console.info(`[SEED-CATALOGUE] Loaded ${catalogue.length} products from JSON.`);

    // 19 Required Categories
    const categoriesMap = {
      'all-types-of-dal-and-pulses': {
        name: 'All Types of Dal and Pulses',
        image: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Unpolished Toor, Moong, Chana, Masoor, Urad, Rajma & Kabuli Chana',
        subcategories: ['Yellow Dal', 'Whole Pulses', 'Split Pulses', 'Beans & Rajma', 'Chana & Chickpeas'],
        type: 'grocery',
        displayOrder: 10,
      },
      'atta-flour-and-grains': {
        name: 'Atta, Flour and Grains',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Chakki Fresh Sharbati Atta, Multigrain, Besan, Sooji, Maida & Millets',
        subcategories: ['Wheat Atta', 'Specialty Flours', 'Besan & Sooji', 'Millet Flours', 'Breakfast Grains'],
        type: 'grocery',
        displayOrder: 11,
      },
      'rice-and-basmati-rice': {
        name: 'Rice and Basmati Rice',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Aged Royal Basmati, Biryani Rice, Sona Masoori, Wada Kolam & Brown Rice',
        subcategories: ['Basmati Rice', 'Regional & Everyday Rice', 'Healthy & Brown Rice'],
        type: 'grocery',
        displayOrder: 12,
      },
      'cooking-oil-and-ghee': {
        name: 'Cooking Oil and Ghee',
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Kachi Ghani Mustard Oil, Desi Cow Ghee, Sunflower Oil & Olive Oil',
        subcategories: ['Mustard Oil', 'Refined Cooking Oils', 'Desi Ghee', 'Health & Olive Oils'],
        type: 'grocery',
        displayOrder: 13,
      },
      'masala-and-spices': {
        name: 'Masala and Spices',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Pure Haldi, Deggi Mirch, Dhaniya, Jeera, Elaichi & Blended Masalas',
        subcategories: ['Powdered Spices', 'Whole Spices (Khada Masala)', 'Blended Masalas'],
        type: 'grocery',
        displayOrder: 14,
      },
      'sugar-salt-and-sweeteners': {
        name: 'Sugar, Salt and Sweeteners',
        image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Madhur Sulphurless Sugar, Tata Salt, Sendha Namak, Gur & Pure Honey',
        subcategories: ['Refined Sugar', 'Salt & Rock Salt', 'Jaggery & Natural Sweeteners'],
        type: 'grocery',
        displayOrder: 15,
      },
      'dry-fruits-and-nuts': {
        name: 'Dry Fruits and Nuts',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'California Almonds, W240 Cashews, Kishmish, Akhrot, Pista & Makhana',
        subcategories: ['Almonds & Cashews', 'Raisins & Dates', 'Walnuts & Pistachios', 'Seeds & Superfoods'],
        type: 'grocery',
        displayOrder: 16,
      },
      'tea-coffee-and-beverages': {
        name: 'Tea, Coffee and Beverages',
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Tata Tea Gold, Nescafe Coffee, Rooh Afza, Bournvita, Juices & Soft Drinks',
        subcategories: ['Tea & Chai Patti', 'Coffee', 'Health Drinks & Syrups', 'Cold Drinks & Juices'],
        type: 'grocery',
        displayOrder: 17,
      },
      'biscuits-snacks-and-namkeen': {
        name: 'Biscuits, Snacks and Namkeen',
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Parle-G, Good Day, Haldiram Bhujia, Kurkure, Lays & Festive Sweets',
        subcategories: ['Daily Biscuits & Cookies', 'Indian Namkeen & Sev', 'Chips & Savory Snacks', 'Traditional Sweets'],
        type: 'grocery',
        displayOrder: 18,
      },
      'sauces-pickles-and-cooking-essentials': {
        name: 'Sauces, Pickles and Cooking Essentials',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Maggi Ketchup, Aam ka Achaar, Ginger Garlic Paste, Mayo & Vinegar',
        subcategories: ['Tomato Ketchup & Sauces', 'Traditional Indian Pickles (Achaar)', 'Pastes & Purees'],
        type: 'grocery',
        displayOrder: 19,
      },
      'dairy-and-refrigerated-products': {
        name: 'Dairy and Refrigerated Products',
        image: 'https://images.unsplash.com/photo-1528732263440-4dd1a18a4cc2?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Amul Milk, Amul Butter, Fresh Malai Paneer, Dahi, Cheese & Cream',
        subcategories: ['Fresh Milk & Curd', 'Butter & Fresh Paneer', 'Cheese & Cream'],
        type: 'grocery',
        displayOrder: 20,
      },
      'household-cleaning-products': {
        name: 'Household Cleaning Products',
        image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Surf Excel, Ariel, Vim Bar & Gel, Harpic, Lizol, Colin & Dettol',
        subcategories: ['Detergents & Laundry', 'Dishwashing', 'Surface Cleaners', 'Pooja & Cleaning Tools'],
        type: 'grocery',
        displayOrder: 21,
      },
      'personal-care-products': {
        name: 'Personal Care Products',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Colgate, Dettol Soap, Dove, Head & Shoulders, Parachute & Vaseline',
        subcategories: ['Oral Care & Toothpaste', 'Soaps & Body Wash', 'Hair Care & Oils', 'Skin Creams & Lotions', 'Men & Women Hygiene'],
        type: 'grocery',
        displayOrder: 22,
      },
      'fresh-vegetables': {
        name: 'Fresh Vegetables',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Farm fresh Tomatoes, Pyaaz, Aloo, Adrak, Hari Mirch, Palak & Bhindi',
        subcategories: ['Daily Essentials', 'Gourmet & Greens', 'Root Vegetables'],
        type: 'grocery',
        displayOrder: 23,
      },
      'fresh-fruits': {
        name: 'Fresh Fruits',
        image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Kashmiri Apples, Ripe Bananas, Nagpur Oranges, Anar, Papita & Daab',
        subcategories: ['Daily Table Fruits', 'Citrus & Melons', 'Seasonal Exotics'],
        type: 'grocery',
        displayOrder: 24,
      },
      'instant-food-and-ready-to-cook-products': {
        name: 'Instant Food and Ready-to-Cook Products',
        image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Maggi 2-Minute Noodles, Yippee, MTR Idli & Dosa Mix, Oats & Corn Flakes',
        subcategories: ['Instant Noodles & Pasta', 'Breakfast Cereals & Oats', 'Ready Breakfast Mixes'],
        type: 'grocery',
        displayOrder: 25,
      },
      'bakery-products': {
        name: 'Bakery Products',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Harvest Gold Bread, Brown Bread, Fresh Pav Buns, Burger Buns & Pizza Base',
        subcategories: ['Fresh Bread & Buns', 'Cakes & Muffins', 'Pizza Base & Pav'],
        type: 'grocery',
        displayOrder: 26,
      },
      'baby-care-essentials': {
        name: 'Baby Care Essentials',
        image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Pampers Diapers, Johnson Baby Shampoo & Soap, Himalaya Wipes & Cerelac',
        subcategories: ['Baby Diapers & Wipes', 'Baby Bath & Skin', 'Baby Cereals & Food'],
        type: 'grocery',
        displayOrder: 27,
      },
      'pooja-and-daily-kirana-essentials': {
        name: 'Pooja and Daily Kirana Essentials',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80&ar=1:1',
        description: 'Cycle Agarbatti, Bhimseni Kapoor, Cow Ghee Battis, Kumkum, Gangajal & Matchbox',
        subcategories: ['Incense & Dhoop', 'Camphor & Diyas', 'Puja Samagri & Holy Items'],
        type: 'grocery',
        displayOrder: 28,
      },
    };

    console.info('[SEED-CATALOGUE] Upserting 19 grocery categories...');
    const dbCatMap = {};
    for (const [slug, data] of Object.entries(categoriesMap)) {
      const catDoc = await Category.findOneAndUpdate(
        { slug },
        { ...data, slug },
        { upsert: true, new: true }
      );
      dbCatMap[slug] = catDoc._id;
    }
    console.info(`[SEED-CATALOGUE] Categories ensured: ${Object.keys(dbCatMap).length}`);

    // Upsert products
    console.info('[SEED-CATALOGUE] Inserting/Updating 291 products...');
    let count = 0;
    for (const p of catalogue) {
      const categoryId = dbCatMap[p.categorySlug];
      if (!categoryId) {
        console.warn(`[WARN] Category slug not found: ${p.categorySlug}`);
        continue;
      }

      await Product.findOneAndUpdate(
        { productId: p.productId },
        {
          productId: p.productId,
          name: p.name,
          slug: p.slug,
          brand: p.brand || '',
          subcategory: p.subcategory || '',
          description: p.description,
          images: p.images,
          imagePrompt: p.imagePrompt || '',
          mrp: p.mrp || p.price,
          price: p.price,
          discountPrice: p.discountPrice || p.sellingPrice,
          unit: p.unit,
          variants: p.variants || [],
          stock: p.stock || 100,
          category: categoryId,
          type: 'grocery',
          isVeg: true,
          isFeatured: Boolean(p.isFeatured),
          isBestseller: Boolean(p.isBestseller),
          rating: p.rating || { average: 4.5, count: 40 },
          keywords: p.keywords || [],
          vendor: vendorUser ? vendorUser._id : undefined,
          isActive: true,
        },
        { upsert: true, new: true }
      );
      count++;
    }

    console.info(`[SEED-CATALOGUE] Successfully seeded ${count} grocery products into MongoDB!`);
    await mongoose.disconnect();
    console.info('[SEED-CATALOGUE] Finished.');
  } catch (err) {
    console.error('[SEED-CATALOGUE] Error:', err);
    process.exit(1);
  }
};

seedGroceryCatalogue();
