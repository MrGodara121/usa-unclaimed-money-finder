// ============================================
// ULTIMATE AI - All AI Features
// ============================================

const axios = require('axios');

/**
 * Feature 1: AI Name Match
 */
function aiNameMatch(searchName, database) {
  const matches = [];
  
  database.forEach(item => {
    const similarity = stringSimilarity(searchName.toLowerCase(), item.name.toLowerCase());
    if (similarity > 0.8) {
      matches.push({ ...item, similarity });
    }
  });
  
  return matches.sort((a, b) => b.similarity - a.similarity);
}

function stringSimilarity(s1, s2) {
  let longer = s1, shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

function editDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

/**
 * Feature 4: AI Amount Predictor
 */
function aiAmountPredictor(state, propertyType, years, historicalData) {
  const filtered = historicalData.filter(d => 
    d.state === state && d.type === propertyType
  );
  
  if (filtered.length === 0) {
    return {
      predicted: 500,
      min: 100,
      max: 1000,
      confidence: 70,
      factors: ['Using national average']
    };
  }
  
  const avg = filtered.reduce((sum, d) => sum + d.amount, 0) / filtered.length;
  const min = Math.min(...filtered.map(d => d.amount));
  const max = Math.max(...filtered.map(d => d.amount));
  const stdDev = calculateStdDev(filtered.map(d => d.amount));
  
  // Adjust for years (inflation 3% per year)
  const inflationFactor = Math.pow(1.03, years);
  const predicted = avg * inflationFactor;
  
  // Calculate confidence based on data size and variance
  const dataPoints = filtered.length;
  const variance = stdDev / avg;
  let confidence = Math.min(95, 60 + dataPoints / 10);
  if (variance > 0.5) confidence -= 10;
  
  return {
    predicted: Math.round(predicted),
    min: Math.round(min * inflationFactor),
    max: Math.round(max * inflationFactor),
    confidence: Math.round(confidence),
    factors: [
      `Based on ${dataPoints} claims in ${state}`,
      `Average claim: $${Math.round(avg)}`,
      `Variance: ${Math.round(variance * 100)}%`
    ]
  };
}

function calculateStdDev(values) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Feature 6: AI Chatbot
 */
async function aiChatbot(message, context = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return ruleBasedResponse(message, context);
  }
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for USA Unclaimed Money Finder. Answer questions about unclaimed money, how to search, claim process, premium features, etc. Be friendly and concise.'
        },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${message}`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return ruleBasedResponse(message, context);
  }
}

function ruleBasedResponse(message, context) {
  const lower = message.toLowerCase();
  
  if (lower.includes('how to search')) {
    return "🔍 To search, just enter your first and last name in the search box. You can also use voice search by clicking the microphone icon. Premium users can upload documents for automatic name extraction from PDFs and images.";
  }
  
  if (lower.includes('premium') || lower.includes('upgrade')) {
    if (context.premium) {
      return "⭐ You're already a premium member! Enjoy unlimited searches, family tracking, auto-form fill, and priority support.";
    } else {
      return "💎 Premium plans start at just $4.99/month. You get unlimited searches, family tracking (up to 5 names), auto-form fill for claims, SMS alerts, and priority support. Check our Premium page for details and a 3-day free trial!";
    }
  }
  
  if (lower.includes('claim') || lower.includes('how to get money')) {
    return "💰 When you find money in your name, click the 'Claim Now' button. You'll need to verify your identity with proof of ID and address. Premium users get auto-filled forms that make this process 10x faster. Each state has its own claim process, but we guide you through it.";
  }
  
  if (lower.includes('cost') || lower.includes('price') || lower.includes('fee')) {
    return "💵 Our basic search is completely free! Premium plans start at $4.99/month. We never charge for finding money - only for premium features that make the process faster and easier.";
  }
  
  if (lower.includes('data') || lower.includes('sources')) {
    return "📊 We search 69 government sources including all 50 states, federal agencies like HUD, FDIC, PBGC, Treasury, DOL, and more. Our data is updated daily and has 98.5% accuracy.";
  }
  
  if (lower.includes('ai') || lower.includes('artificial intelligence')) {
    return "🤖 Our AI features include: fuzzy name matching (finds John even if spelled Jon), voice search, family tree scanning, amount prediction, OCR document reading, fraud detection, tax calculator, success prediction, and auto-translation to 10+ languages.";
  }
  
  return "I'm not sure about that. Please check our FAQ page at https://usaunclaimed.com/resources/faq or contact support at support@usaunclaimed.com for more help.";
}

/**
 * Feature 8: AI Tax Calculator
 */
function aiTaxCalculator(amount, state, year) {
  // Federal tax brackets 2026
  const brackets = [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11926, max: 48475, rate: 0.12 },
    { min: 48476, max: 103350, rate: 0.22 },
    { min: 103351, max: 197300, rate: 0.24 },
    { min: 197301, max: 250525, rate: 0.32 },
    { min: 250526, max: 626350, rate: 0.35 },
    { min: 626351, max: Infinity, rate: 0.37 }
  ];
  
  let federalTax = 0;
  let remaining = amount;
  
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min + 1);
    federalTax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }
  
  // State tax rates (simplified averages)
  const stateRates = {
    'CA': 0.093, 'TX': 0, 'FL': 0, 'NY': 0.0685, 'PA': 0.0307,
    'IL': 0.0495, 'OH': 0.0399, 'GA': 0.0575, 'NC': 0.0525,
    'MI': 0.0425, 'NJ': 0.0637, 'VA': 0.0575, 'WA': 0,
    'AZ': 0.045, 'MA': 0.05, 'TN': 0, 'IN': 0.0323,
    'MO': 0.0495, 'MD': 0.0575, 'WI': 0.0765, 'CO': 0.0455,
    'MN': 0.0985, 'SC': 0.07, 'AL': 0.05, 'LA': 0.06,
    'KY': 0.05, 'OR': 0.099, 'OK': 0.0475, 'CT': 0.0699,
    'UT': 0.0495, 'IA': 0.0853, 'NV': 0, 'AR': 0.059,
    'MS': 0.05, 'KS': 0.057, 'NM': 0.059, 'NE': 0.0684,
    'WV': 0.065, 'ID': 0.06925, 'HI': 0.11, 'NH': 0.05,
    'ME': 0.0715, 'MT': 0.0675, 'RI': 0.0599, 'DE': 0.066,
    'SD': 0, 'ND': 0.029, 'AK': 0, 'VT': 0.086, 'WY': 0
  };
  
  const stateRate = stateRates[state] || 0.05;
  const stateTax = amount * stateRate;
  
  const totalTax = federalTax + stateTax;
  const netAmount = amount - totalTax;
  const effectiveRate = (totalTax / amount) * 100;
  
  return {
    grossAmount: amount,
    federalTax: Math.round(federalTax),
    stateTax: Math.round(stateTax),
    totalTax: Math.round(totalTax),
    netAmount: Math.round(netAmount),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown: {
      federal: `${Math.round((federalTax / amount) * 100)}%`,
      state: `${Math.round((stateTax / amount) * 100)}%`
    }
  };
}

/**
 * Feature 9: AI Success Predictor
 */
function aiSuccessPredictor(userData, propertyData) {
  let score = 50;
  const factors = [];
  
  // Time factor - newer claims are easier
  const yearsSinceReport = (new Date().getFullYear() - new Date(propertyData.reportedDate).getFullYear());
  if (yearsSinceReport < 1) {
    score += 20;
    factors.push('Recently reported (higher chance)');
  } else if (yearsSinceReport > 5) {
    score -= 10;
    factors.push('Older claim (may need more documentation)');
  }
  
  // Amount factor
  if (propertyData.amount < 1000) {
    score += 10;
    factors.push('Small amount (easier to process)');
  } else if (propertyData.amount > 10000) {
    score -= 5;
    factors.push('Large amount (may require extra verification)');
  }
  
  // User verification factor
  if (userData.verified) {
    score += 15;
    factors.push('Identity verified');
  }
  
  // Premium user factor
  if (userData.premium) {
    score += 10;
    factors.push('Premium member (get assistance)');
  }
  
  // Property type factor
  const easyTypes = ['cash', 'refund', 'wage'];
  const hardTypes = ['stock', 'bond', 'real estate'];
  
  if (easyTypes.includes(propertyData.type)) {
    score += 5;
    factors.push('Easy claim type');
  } else if (hardTypes.includes(propertyData.type)) {
    score -= 5;
    factors.push('Complex claim type');
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  return {
    probability: score,
    level: score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low',
    factors,
    recommendation: getRecommendation(score, propertyData)
  };
}

function getRecommendation(score, propertyData) {
  if (score >= 75) {
    return "✅ Good chance of success! File your claim now.";
  } else if (score >= 50) {
    return "⚠️ Average chance. Consider getting help from premium service.";
  } else {
    return "❌ Lower chance. You may need legal assistance. Check with an attorney.";
  }
}

/**
 * Feature 10: AI Auto-Translate
 */
async function aiTranslate(text, targetLanguage) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    return { translated: text, source: 'en', target: targetLanguage, note: 'Translation service not configured' };
  }
  
  try {
    const response = await axios.post(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      q: text,
      target: targetLanguage,
      format: 'text'
    });
    
    return {
      translated: response.data.data.translations[0].translatedText,
      source: response.data.data.translations[0].detectedSourceLanguage || 'en',
      target: targetLanguage
    };
  } catch (error) {
    console.error('Translation error:', error.message);
    return { translated: text, source: 'en', target: targetLanguage, error: error.message };
  }
}

/**
 * Feature 5: AI Document Reader (OCR)
 */
function aiDocumentReader(text) {
  // Extract names using regex
  const namePattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
  const names = text.match(namePattern) || [];
  
  // Extract amounts
  const amountPattern = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const amounts = text.match(amountPattern) || [];
  
  // Extract emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailPattern) || [];
  
  // Extract phone numbers
  const phonePattern = /\b(\+?1[-.]?)?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}\b/g;
  const phones = text.match(phonePattern) || [];
  
  return {
    names: [...new Set(names)],
    amounts: [...new Set(amounts)],
    emails: [...new Set(emails)],
    phones: [...new Set(phones)],
    confidence: names.length > 0 ? 85 : 0
  };
}

/**
 * Feature 7: AI Fraud Detector
 */
function aiFraudDetector(claimData, historicalData) {
  let riskScore = 0;
  const flags = [];
  
  // Check multiple claims
  const userClaims = historicalData.filter(c => c.userId === claimData.userId);
  if (userClaims.length > 5) {
    riskScore += 20;
    flags.push('Multiple claims from same user');
  }
  
  // Check amount anomalies
  const avgAmount = historicalData.reduce((sum, c) => sum + c.amount, 0) / historicalData.length;
  if (claimData.amount > avgAmount * 5) {
    riskScore += 30;
    flags.push(`Amount $${claimData.amount} is 5x above average $${Math.round(avgAmount)}`);
  }
  
  // Check location mismatch
  if (claimData.userState !== claimData.propertyState) {
    riskScore += 15;
    flags.push(`Location mismatch: user in ${claimData.userState}, property in ${claimData.propertyState}`);
  }
  
  // Check name similarity with known frauds
  const fraudNames = ['test', 'testuser', 'admin', 'fake']; // In production, load from database
  if (fraudNames.some(name => claimData.firstName.toLowerCase().includes(name))) {
    riskScore += 40;
    flags.push('Suspicious name pattern');
  }
  
  // Time anomaly (claim filed at unusual hour)
  const hour = new Date(claimData.timestamp).getHours();
  if (hour >= 1 && hour <= 5) {
    riskScore += 10;
    flags.push('Unusual claim time (1-5 AM)');
  }
  
  return {
    riskScore,
    riskLevel: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
    flags,
    recommendation: riskScore >= 70 ? 'Manual review required' : 'Auto-approve',
    requires2FA: riskScore >= 50
  };
}

async function main() {
  console.log('AI Features ready!');
  
  // Example usage
  const nameMatch = aiNameMatch('Jon Smith', [
    { name: 'John Smith', amount: 5000 },
    { name: 'Jonathan Smith', amount: 3000 },
    { name: 'Jane Doe', amount: 2000 }
  ]);
  console.log('Name Match:', nameMatch);
  
  const taxCalc = aiTaxCalculator(5000, 'CA', 2026);
  console.log('Tax Calculator:', taxCalc);
  
  const predictor = aiSuccessPredictor(
    { verified: true, premium: true },
    { amount: 5000, type: 'cash', reportedDate: '2025-01-01' }
  );
  console.log('Success Predictor:', predictor);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  aiNameMatch,
  aiAmountPredictor,
  aiChatbot,
  aiTaxCalculator,
  aiSuccessPredictor,
  aiTranslate,
  aiDocumentReader,
  aiFraudDetector
};
