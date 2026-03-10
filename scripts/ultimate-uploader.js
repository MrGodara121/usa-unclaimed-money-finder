// ============================================
// ULTIMATE UPLOADER - Backblaze B2 Upload with Verification
// ============================================

const B2 = require('@backblaze/b2');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COMPRESSED_DIR = './compressed';
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY
});

/**
 * Upload file to B2 with verification
 */
async function uploadToB2(filePath, remotePath) {
  await b2.authorize();
  
  const fileName = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);
  
  // Calculate SHA1 for verification
  const sha1 = crypto.createHash('sha1');
  const fileContent = fs.readFileSync(filePath);
  sha1.update(fileContent);
  const fileSha1 = sha1.digest('hex');
  
  const { data: uploadUrl } = await b2.getUploadUrl({
    bucketId: process.env.B2_BUCKET_ID
  });
  
  const response = await b2.uploadFile({
    uploadUrl: uploadUrl.uploadUrl,
    uploadAuthToken: uploadUrl.authorizationToken,
    fileName: remotePath,
    data: fileStream,
    contentLength: stats.size,
    hash: fileSha1,
    info: {
      'source': 'github-actions',
      'original': fileName,
      'compressed': 'true',
      'uploaded': new Date().toISOString()
    }
  });
  
  console.log(`✅ Uploaded: ${fileName} -> b2://${process.env.B2_BUCKET}/${remotePath}`);
  
  return {
    fileId: response.data.fileId,
    fileName: response.data.fileName,
    size: stats.size,
    sha1: fileSha1
  };
}

/**
 * Upload with lifecycle rules
 */
async function uploadWithLifecycle(filePath, type) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const week = getWeekNumber(date);
  
  let remotePath;
  
  switch(type) {
    case 'daily':
      remotePath = `daily/${year}/${month}/${day}/${path.basename(filePath)}`;
      break;
    case 'weekly':
      remotePath = `weekly/${year}/W${week}/${path.basename(filePath)}`;
      break;
    case 'monthly':
      remotePath = `monthly/${year}/${month}/${path.basename(filePath)}`;
      break;
    case 'quarterly':
      const quarter = Math.floor((date.getMonth() + 3) / 3);
      remotePath = `quarterly/${year}/Q${quarter}/${path.basename(filePath)}`;
      break;
    case 'annual':
      remotePath = `annual/${year}/${path.basename(filePath)}`;
      break;
    default:
      remotePath = `other/${year}/${month}/${day}/${path.basename(filePath)}`;
  }
  
  return uploadToB2(filePath, remotePath);
}

/**
 * Get week number
 */
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Verify upload integrity
 */
async function verifyUpload(fileId, originalSha1) {
  await b2.authorize();
  
  const response = await b2.getFileInfo({
    fileId: fileId
  });
  
  const uploadedSha1 = response.data.contentSha1;
  const isValid = uploadedSha1 === originalSha1;
  
  console.log(`Verification: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
  
  return isValid;
}

/**
 * Batch upload all files
 */
async function batchUpload() {
  const files = fs.readdirSync(COMPRESSED_DIR);
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(COMPRESSED_DIR, file);
    
    // Determine file type based on naming convention
    let type = 'other';
    if (file.includes('daily') || file.match(/[A-Z]{2}_/)) type = 'daily';
    else if (file.includes('weekly')) type = 'weekly';
    else if (file.includes('monthly')) type = 'monthly';
    else if (file.includes('quarterly')) type = 'quarterly';
    else if (file.includes('annual')) type = 'annual';
    
    try {
      const result = await uploadWithLifecycle(filePath, type);
      
      // Verify upload
      const verified = await verifyUpload(result.fileId, result.sha1);
      
      results.push({
        file,
        success: true,
        verified,
        path: result.fileName
      });
      
      // Remove local file after successful upload and verification
      if (verified) {
        fs.unlinkSync(filePath);
      }
      
    } catch (error) {
      console.error(`Failed to upload ${file}:`, error.message);
      results.push({ file, success: false, error: error.message });
    }
  }
  
  console.log(`\n=== UPLOAD SUMMARY ===`);
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Verified: ${results.filter(r => r.verified).length}`);
  
  return results;
}

async function main() {
  console.log('Starting upload to Backblaze B2...');
  await batchUpload();
  console.log('Upload completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadToB2, uploadWithLifecycle, verifyUpload, batchUpload };
