// ============================================
// ULTIMATE SHEETS SYNC - Google Sheets Integration
// ============================================

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Update source status
 */
async function updateSourceStatus(sourceId, status, data) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT || './config/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Find the row
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'DATA_SOURCES_MASTER!A:A',
  });
  
  const rows = response.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === sourceId) {
      const rowNum = i + 1;
      
      const values = [[
        new Date().toISOString(), // LastSync
        data.nextSync || new Date(Date.now() + 86400000).toISOString(),
        status,
        data.downloadStatus || status,
        data.uploadStatus || 'Pending',
        data.recordsBefore || 0,
        data.newRecords || 0,
        data.totalRecords || 0,
        data.sizeBefore || 0,
        data.sizeAfter || 0,
        data.storagePath || '',
        data.resumePoint || '',
        data.error || '',
        data.retryCount || 0,
        data.nextRetry || '',
        data.healthScore || '100%',
        data.priority || 'Medium',
        data.notes || ''
      ]];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: `DATA_SOURCES_MASTER!L${rowNum}:AF${rowNum}`,
        valueInputOption: 'RAW',
        resource: { values }
      });
      
      console.log(`Updated source ${sourceId} status to ${status}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Add payment record
 */
async function addPaymentRecord(payment) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'PAYMENTS!A:O',
    valueInputOption: 'RAW',
    resource: {
      values: [[
        payment.txnId,
        payment.userId,
        payment.planId,
        payment.amount,
        payment.currency || 'USD',
        payment.method,
        'Completed',
        new Date().toISOString(),
        payment.paypalTxnId || '',
        payment.stripeTxnId || '',
        payment.cryptoHash || '',
        payment.commission || 0,
        payment.netAmount || payment.amount,
        'No',
        '',
        '',
        payment.notes || ''
      ]]
    }
  });
  
  console.log(`Payment record added: ${payment.txnId}`);
}

/**
 * Add testimonial
 */
async function addTestimonial(testimonial) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'TESTIMONIALS!A:N',
    valueInputOption: 'RAW',
    resource: {
      values: [[
        `T${Date.now()}`,
        testimonial.userId,
        testimonial.name,
        testimonial.state,
        testimonial.amount,
        testimonial.foundDate,
        testimonial.screenshotUrl,
        testimonial.caption,
        'Pending', // Approval status
        'No', // Featured
        0, // Likes
        0, // Shares
        new Date().toISOString(),
        false // AI Verified
      ]]
    }
  });
  
  console.log(`Testimonial added for ${testimonial.name}`);
}

/**
 * Update analytics
 */
async function updateAnalytics(data) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'ANALYTICS!A:M',
    valueInputOption: 'RAW',
    resource: {
      values: [[
        new Date().toISOString().split('T')[0],
        data.visitors || 0,
        data.uniqueVisitors || 0,
        data.pageViews || 0,
        data.searches || 0,
        data.uniqueSearches || 0,
        data.finds || 0,
        data.premiumSignups || 0,
        data.revenue || 0,
        data.refunds || 0,
        data.netRevenue || data.revenue,
        data.topState || '',
        data.topSearch || '',
        data.avgTime || '0:00',
        data.bounceRate || 0,
        data.conversionRate || 0,
        data.aiAccuracy || 98.5,
        data.notes || ''
      ]]
    }
  });
  
  console.log('Analytics updated');
}

/**
 * Log error
 */
async function logError(error) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'ERROR_LOGS!A:K',
    valueInputOption: 'RAW',
    resource: {
      values: [[
        `ERR${Date.now()}`,
        new Date().toISOString(),
        error.sourceId || 'N/A',
        error.sourceName || 'System',
        error.type || 'General',
        error.message,
        error.stack || '',
        0,
        'Pending',
        '',
        '',
        false
      ]]
    }
  });
  
  console.log('Error logged');
}

/**
 * Generate daily report
 */
async function generateDailyReport() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Get today's data from all sheets
  const sources = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'DATA_SOURCES_MASTER!A:AF'
  });
  
  const payments = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'PAYMENTS!A:O'
  });
  
  // Calculate stats
  const totalSources = sources.data.values?.length - 1 || 0;
  const successful = sources.data.values?.filter((r, i) => i > 0 && r[16] === 'Completed').length || 0;
  const failed = sources.data.values?.filter((r, i) => i > 0 && r[16] === 'Failed').length || 0;
  
  const todayPayments = payments.data.values?.filter((r, i) => {
    if (i === 0) return false;
    const date = new Date(r[7]);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }) || [];
  
  const revenue = todayPayments.reduce((sum, p) => sum + parseFloat(p[3] || 0), 0);
  
  const report = {
    date: new Date().toISOString().split('T')[0],
    totalSources,
    successful,
    failed,
    successRate: totalSources ? Math.round((successful / totalSources) * 100) : 0,
    revenue,
    paymentsCount: todayPayments.length,
    timestamp: new Date().toISOString()
  };
  
  // Save report
  fs.writeFileSync(`./reports/daily-${report.date}.json`, JSON.stringify(report, null, 2));
  
  console.log('Daily report generated:', report);
  
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--report')) {
    await generateDailyReport();
  } else {
    console.log('Syncing with Google Sheets...');
    // Default sync operations
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateSourceStatus,
  addPaymentRecord,
  addTestimonial,
  updateAnalytics,
  logError,
  generateDailyReport
};
