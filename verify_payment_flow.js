import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function verifyPaymentFlow() {
  console.log('💳 Verifying Stripe Payment Flow Integration...\n');

  try {
    // 1. Check if we have some prices already
    console.log('🔍 [Stripe] Checking for existing Price IDs...');
    const prices = await stripe.prices.list({ active: true, limit: 3 });

    let priceId = process.env.STRIPE_PRICE_ID_SESSION || (prices.data.length > 0 ? prices.data[0].id : null);

    if (!priceId) {
       console.log('⚠️ [Stripe] No active Price IDs found on this account. Attempting to create a temporary test price...');
       const product = await stripe.products.create({ name: 'Verification Test Product' });
       const testPrice = await stripe.prices.create({
         unit_amount: 1000, // $10.00
         currency: 'usd',
         product: product.id,
       });
       priceId = testPrice.id;
       console.log(`✅ [Stripe] Created test price ID: ${priceId}`);
    } else {
       console.log(`✅ [Stripe] Using Price ID: ${priceId}`);
    }

    // 2. Attempt to create a Checkout Session
    console.log('🚀 [Stripe] Attempting to create a Checkout Session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });

    console.log('✅ [Stripe] Checkout Session created successfully!');
    console.log(`🔗 [Stripe] Session URL (Test Checkout): ${session.url}`);
    console.log('\nVerification of Payment integration flow was successful!');

  } catch (err) {
    console.error(`❌ [Stripe] Payment Flow Verification failed: ${err.message}`);
    if (err.message.includes('No such price')) {
        console.error('ℹ️ Hint: Check if STRIPE_PRICE_ID_SESSION in your .env exists in your Stripe dashboard.');
    }
    process.exit(1);
  }
}

verifyPaymentFlow();
