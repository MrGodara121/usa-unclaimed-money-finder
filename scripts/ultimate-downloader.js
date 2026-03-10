// ============================================
// ULTIMATE DOWNLOADER - All 69 Sources + Resume + Health Monitor
// ============================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Configuration
const TEMP_DIR = './temp';
const MAX_RETRIES = 3;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Get all data sources from Google Sheets
 */
async function getDataSources() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT || './config/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'DATA_SOURCES_MASTER!A2:Z',
  });
  
  return response.data.values || [];
}

/**
 * Download with resume support
 */
async function downloadWithResume(source) {
  const [id, name, state, url, format, size, accuracy, freq, day, time] = source;
  
  const filename = `${state}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
  const filepath = path.join(TEMP_DIR, filename);
  const resumeFile = `${filepath}.resume`;
  
  let downloadedSize = 0;
  let headers = {};
  
  // Check if partial download exists
  if (fs.existsSync(resumeFile)) {
    downloadedSize = parseInt(fs.readFileSync(resumeFile, 'utf8'));
    headers.Range = `bytes=${downloadedSize}-`;
    console.log(`Resuming ${name} from byte ${downloadedSize}`);
  }
  
  try {
    const response = await axios({
      method: 'get',
      url,
      headers,
      responseType: 'stream',
      timeout: 300000, // 5 minutes
      maxContentLength: Infinity
    });
    
    const totalSize = parseInt(response.headers['content-length']) + downloadedSize;
    const writeStream = fs.createWriteStream(filepath, { flags: downloadedSize > 0 ? 'a' : 'w' });
    
    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      fs.writeFileSync(resumeFile, downloadedSize.toString());
      console.log(`${name}: ${Math.round((downloadedSize / totalSize) * 100)}%`);
    });
    
    response.data.pipe(writeStream);
    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Download complete - remove resume file
    fs.unlinkSync(resumeFile);
    
    return { success: true, filepath, size: downloadedSize };
    
  } catch (error) {
    console.error(`Download failed for ${name}:`, error.message);
    return { success: false, error: error.message, downloaded: downloadedSize };
  }
}

/**
 * Update Google Sheets status
 */
async function updateStatus(sourceId, status, details) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Find the row and update
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'DATA_SOURCES_MASTER!A:A',
  });
  
  const rows = response.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === sourceId) {
      const rowNum = i + 1;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: `DATA_SOURCES_MASTER!R${rowNum}:Z${rowNum}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            new Date().toISOString(), // LastSync
            new Date(Date.now() + 86400000).toISOString(), // NextSync
            status, // SyncStatus
            status, // DownloadStatus
            'Pending', // UploadStatus
            details.records || 0,
            details.newRecords || 0,
            details.totalRecords || 0,
            details.sizeBefore || 0,
            details.sizeAfter || 0,
            details.path || '',
            details.resumePoint || '',
            details.error || '',
            details.retry || 0,
            details.nextRetry || ''
          ]]
        }
      });
      
      break;
    }
  }
}

/**
 * Check source health
 */
async function checkHealth(source) {
  const [id, name, url] = source;
  
  try {
    const start = Date.now();
    const response = await axios.head(url, { timeout: 10000 });
    const latency = Date.now() - start;
    
    return {
      id,
      status: response.status === 200 ? 'Healthy' : 'Issue',
      latency,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      id,
      status: 'Unhealthy',
      error: error.message,
      lastCheck: new Date()
    };
  }
}

/**
 * Resume failed downloads
 */
async function resumeFailed() {
  const sources = await getDataSources();
  const failed = sources.filter(s => s[17] === 'Failed' || s[17] === 'Downloading');
  
  for (const source of failed) {
    const retryCount = parseInt(source[25]) || 0;
    if (retryCount < MAX_RETRIES) {
      console.log(`Resuming ${source[1]}...`);
      const result = await downloadWithResume(source);
      
      if (result.success) {
        await updateStatus(source[0], 'Success', { filepath: result.filepath });
      } else {
        const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 60000); // Exponential backoff
        await updateStatus(source[0], 'Failed', { 
          error: result.error, 
          retry: retryCount + 1,
          nextRetry: nextRetry.toISOString(),
          resumePoint: result.downloaded
        });
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--resume')) {
    console.log('Resuming failed downloads...');
    await resumeFailed();
    return;
  }
  
  if (args.includes('--health')) {
    console.log('Checking source health...');
    const sources = await getDataSources();
    for (const source of sources) {
      const health = await checkHealth(source);
      console.log(`${source[1]}: ${health.status} (${health.latency}ms)`);
    }
    return;
  }
  
  console.log('Starting download for all 69 sources...');
  const sources = await getDataSources();
  
  for (const source of sources) {
    if (source[6] === 'Daily') { // Only daily for now
      console.log(`Downloading ${source[1]}...`);
      const result = await downloadWithResume(source);
      
      if (result.success) {
        await updateStatus(source[0], 'Success', { 
          records: 0,
          filepath: result.filepath,
          sizeAfter: result.size
        });
      } else {
        await updateStatus(source[0], 'Failed', { 
          error: result.error,
          resumePoint: result.downloaded
        });
      }
    }
  }
  
  console.log('All downloads completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadWithResume, resumeFailed, checkHealth };
