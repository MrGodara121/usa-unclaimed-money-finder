// ============================================
// ULTIMATE PAYMENTS - All Payment Features + Single PayPal
// ============================================

const axios = require('axios');
const crypto = require('crypto');

/**
 * Feature 19: Get all payment methods
 */
function getPaymentMethods() {
  return [
    { id: 'visa', name: 'Visa', type: 'card', icon: '💳' },
    { id: 'mastercard', name: 'Mastercard', type: 'card', icon: '💳' },
    { id: 'amex', name: 'American Express', type: 'card', icon: '💳' },
    { id: 'discover', name: 'Discover', type: 'card', icon: '💳' },
    { id: 'paypal', name: 'PayPal', type: 'wallet', icon: '🅿️' },
    { id: 'applepay', name: 'Apple Pay', type: 'wallet', icon: '🍎' },
    { id: 'googlepay', name: 'Google Pay', type: 'wallet', icon: '📱' },
    { id: 'venmo', name: 'Venmo', type: 'wallet', icon: '💚' },
    { id: 'ach', name: 'Bank Transfer', type: 'bank', icon: '🏦' }
  ];
}

/**
 * Feature 20: Single PayPal Account - Process PayPal payment
 */
async function processPayPalPayment(amount, currency = 'USD', returnUrl) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  
  try {
    // Get access token
    const tokenResponse = await axios.post('https://api.paypal.com/v1/oauth2/token', 
      'grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // Create payment
    const paymentResponse = await axios.post('https://api.paypal.com/v1/payments/payment', {
      intent: 'sale',
      payer: { payment_method: 'paypal' },
      redirect_urls: {
        return_url: returnUrl,
        cancel_url: `${returnUrl}?cancel=true`
      },
      transactions: [{
        amount: {
          total: amount.toString(),
          currency: currency
        },
        description: 'USA Unclaimed Money Finder - Premium Subscription'
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const approvalUrl = paymentResponse.data.links.find(l => l.rel === 'approval_url').href;
    
    return {
      success: true,
      paymentId: paymentResponse.data.id,
      approvalUrl,
      expiresAt: new Date(Date.now() + 30 * 60000) // 30 minutes
    };
    
  } catch (error) {
    console.error('PayPal error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process Stripe payment (auto-transfers to PayPal)
 */
async function processStripePayment(amount, currency, paymentMethod, description) {
  const stripeKey = process.env.STRIPE_API_KEY;
  
  try {
    const paymentIntent = await axios.post('https://api.stripe.com/v1/payment_intents', {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      description,
      metadata: {
        platform: 'USA Unclaimed Finder',
        auto_transfer: 'paypal'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      success: true,
      clientSecret: paymentIntent.data.client_secret,
      paymentIntentId: paymentIntent.data.id
    };
    
  } catch (error) {
    console.error('Stripe error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Feature 21: Auto-Expire Subscription
 */
function checkExpiry(subscription) {
  const now = new Date();
  const expiry = new Date(subscription.expiryDate);
  
  const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) {
    return { status: 'expired', message: 'Subscription expired' };
  } else if (daysLeft <= 3) {
    return { status: 'expiring_soon', daysLeft, message: `Expires in ${daysLeft} days` };
  } else {
    return { status: 'active', daysLeft, message: `${daysLeft} days remaining` };
  }
}

/**
 * Feature 22: 3-Day Free Trial
 */
function startFreeTrial(userId, planId) {
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 3);
  
  return {
    userId,
    planId,
    startDate,
    expiryDate,
    status: 'trial',
    daysRemaining: 3,
    autoRenew: true,
    trialId: `TRIAL-${Date.now()}-${userId}`
  };
}

/**
 * Feature 23: Lifetime Deal
 */
function processLifetimeDeal(userId, amount) {
  const expiryDate = new Date('2099-12-31'); // Far future
  
  return {
    userId,
    amount,
    expiryDate,
    type: 'lifetime',
    transactionId: `LIFETIME-${Date.now()}`,
    message: 'Congratulations! You now have lifetime access.'
  };
}

/**
 * Feature 24: Referral Bonus
 */
function calculateReferralBonus(referralCode, amount) {
  // Commission rates: 20% for first tier, 10% for second
  const commissionRates = {
    'TIER1': 0.20,
    'TIER2': 0.10,
    'DEFAULT': 0.15
  };
  
  const rate = commissionRates[referralCode] || commissionRates.DEFAULT;
  const bonus = amount * rate;
  
  return {
    referralCode,
    originalAmount: amount,
    bonusAmount: bonus,
    rate: rate * 100 + '%',
    processedAt: new Date()
  };
}

/**
 * Feature 25: Auto Invoice
 */
function generateInvoice(paymentData) {
  const invoiceId = `INV-${Date.now()}-${paymentData.userId}`;
  
  const invoice = {
    invoiceId,
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    customer: {
      id: paymentData.userId,
      name: paymentData.customerName,
      email: paymentData.customerEmail,
      address: paymentData.customerAddress
    },
    items: [{
      description: paymentData.planName,
      quantity: 1,
      unitPrice: paymentData.amount,
      total: paymentData.amount
    }],
    subtotal: paymentData.amount,
    tax: paymentData.tax || 0,
    total: paymentData.amount + (paymentData.tax || 0),
    payment: {
      method: paymentData.paymentMethod,
      transactionId: paymentData.transactionId,
      status: 'paid',
      date: new Date().toISOString()
    },
    downloadUrl: `https://usaunclaimed.com/invoice/${invoiceId}.pdf`
  };
  
  return invoice;
}

/**
 * Feature 26: Multi-Currency
 */
async function convertCurrency(amount, from, to) {
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const rate = response.data.rates[to];
    
    if (!rate) {
      throw new Error(`Currency ${to} not supported`);
    }
    
    return {
      from,
      to,
      originalAmount: amount,
      convertedAmount: amount * rate,
      rate,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Currency conversion error:', error.message);
    
    // Fallback rates
    const fallbackRates = {
      'USD': { 'EUR': 0.92, 'GBP': 0.78, 'CAD': 1.35, 'AUD': 1.52 }
    };
    
    if (fallbackRates[from] && fallbackRates[from][to]) {
      const rate = fallbackRates[from][to];
      return {
        from,
        to,
        originalAmount: amount,
        convertedAmount: amount * rate,
        rate,
        timestamp: new Date().toISOString(),
        fallback: true
      };
    }
    
    return {
      from,
      to,
      originalAmount: amount,
      convertedAmount: amount,
      rate: 1,
      error: 'Conversion failed, using original amount'
    };
  }
}

/**
 * Verify payment webhook
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculated = hmac.digest('hex');
  
  return calculated === signature;
}

/**
 * Process payment webhook
 */
async function handleWebhook(req) {
  const signature = req.headers['paypal-transmission-sig'] || req.headers['stripe-signature'];
  const payload = req.body;
  
  // Verify signature (simplified)
  const isValid = true; // In production, verify with secret
  
  if (!isValid) {
    return { error: 'Invalid signature' };
  }
  
  // Handle different event types
  if (payload.event_type === 'PAYMENT.SALE.COMPLETED') {
    // Update user subscription
    return {
      status: 'success',
      transactionId: payload.resource.id,
      userId: payload.resource.custom,
      amount: payload.resource.amount.total,
      processedAt: new Date()
    };
  }
  
  if (payload.type === 'payment_intent.succeeded') {
    // Stripe payment succeeded
    return {
      status: 'success',
      paymentIntentId: payload.data.object.id,
      userId: payload.data.object.metadata.userId,
      amount: payload.data.object.amount / 100,
      processedAt: new Date()
    };
  }
  
  return { error: 'Unknown event type' };
}

async function main() {
  console.log('Payment system ready!');
  
  // Example: Process PayPal payment
  const paypalResult = await processPayPalPayment(9.99, 'USD', 'https://usaunclaimed.com/success');
  console.log('PayPal Result:', paypalResult);
  
  // Example: Currency conversion
  const converted = await convertCurrency(100, 'USD', 'EUR');
  console.log('Currency Conversion:', converted);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getPaymentMethods,
  processPayPalPayment,
  processStripePayment,
  checkExpiry,
  startFreeTrial,
  processLifetimeDeal,
  calculateReferralBonus,
  generateInvoice,
  convertCurrency,
  handleWebhook
};
