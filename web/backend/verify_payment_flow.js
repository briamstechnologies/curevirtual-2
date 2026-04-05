const path = require('path');

// Try loading .env from current directory AND root
require('dotenv').config(); 
if (!process.env.STRIPE_SECRET_KEY) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function verifyPaymentFlow() {
  console.log('💳 Verifying Stripe Payment Flow Integration...\n');

  try {
    // 1. Check for existing Price IDs
    console.log('🔍 [Stripe] Checking for existing Price IDs...');
    const prices = await stripe.prices.list({ active: true, limit: 10 });

    let selectedPrice = null;
    if (process.env.STRIPE_PRICE_ID_SESSION) {
        selectedPrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_SESSION);
    } else if (prices.data.length > 0) {
        selectedPrice = prices.data[0];
    }

    if (!selectedPrice) {
       console.log('⚠️ [Stripe] No active Price IDs found. Attempting to create a temporary test price...');
       const product = await stripe.products.create({ name: 'Verification Test Product' });
       selectedPrice = await stripe.prices.create({
         unit_amount: 1000, 
         currency: 'usd',
         product: product.id,
       });
       console.log(`✅ [Stripe] Created test price ID: ${selectedPrice.id}`);
    } else {
       console.log(`✅ [Stripe] Using Price ID: ${selectedPrice.id} (Type: ${selectedPrice.type})`);
    }

    const mode = selectedPrice.type === 'recurring' ? 'subscription' : 'payment';
    console.log(`🚀 [Stripe] Attempting to create a Checkout Session in ${mode} mode...`);

    // 2. Attempt to create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: selectedPrice.id, quantity: 1 }],
      mode: mode,
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });

    console.log('✅ [Stripe] Checkout Session created successfully!');
    console.log(`🔗 [Stripe] Session URL: ${session.url}`);
    console.log('\nVerification of Payment integration flow was successful!');

  } catch (err) {
    console.error(`❌ [Stripe] Payment Flow Verification failed: ${err.message}`);
    process.exit(1);
  }
}

verifyPaymentFlow();
