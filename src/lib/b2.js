import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || "temp",
  applicationKey: process.env.B2_APPLICATION_KEY || "temp",
});

/**
 * Uploads a file buffer to Backblaze B2 bucket and returns the public download URL.
 * @param {Buffer} fileBuffer 
 * @param {string} fileName 
 * @param {string} mimeType 
 * @returns {Promise<string>} The public download URL of the uploaded file
 */
export async function uploadToB2(fileBuffer, fileName, mimeType) {
  const keyId = process.env.B2_APPLICATION_KEY_ID;
  const key = process.env.B2_APPLICATION_KEY;
  const bucketId = process.env.B2_BUCKET_ID;
  const bucketName = process.env.B2_BUCKET_NAME;

  if (!keyId || !key || !bucketId || !bucketName) {
    throw new Error("Missing Backblaze B2 environment variables (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, B2_BUCKET_NAME).");
  }

  // Update client keys dynamically if they weren't set during module initialization
  b2.applicationKeyId = keyId;
  b2.applicationKey = key;

  // 1. Authorize B2 session
  const authResponse = await b2.authorize();
  const downloadUrl = authResponse.data.downloadUrl;

  // 2. Get upload URL for the target bucket
  const uploadUrlResponse = await b2.getUploadUrl({
    bucketId: bucketId,
  });

  const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

  // 3. Upload raw file buffer
  await b2.uploadFile({
    uploadUrl,
    uploadAuthToken: authorizationToken,
    fileName,
    data: fileBuffer,
    contentType: mimeType,
  });

  // 4. Return formatted public download URL
  return `${downloadUrl}/file/${bucketName}/${fileName}`;
}

/**
 * Generates a short-lived download authorization token for files prefix 'contributions/'
 * @returns {Promise<string|null>} The authorization token
 */
export async function getDownloadToken() {
  const keyId = process.env.B2_APPLICATION_KEY_ID;
  const key = process.env.B2_APPLICATION_KEY;
  const bucketId = process.env.B2_BUCKET_ID;

  if (!keyId || !key || !bucketId) {
    return null;
  }

  b2.applicationKeyId = keyId;
  b2.applicationKey = key;

  await b2.authorize();
  const res = await b2.getDownloadAuthorization({
    bucketId: bucketId,
    fileNamePrefix: "contributions/",
    validDurationInSeconds: 3600, // 1 hour
  });
  return res.data.authorizationToken;
}

/**
 * Appends authorization query parameter to file_urls of materials if present
 * @param {Array} items
 * @returns {Promise<Array>}
 */
export async function signUrls(items) {
  if (!items || items.length === 0) return items;
  const hasFiles = items.some(item => item.file_url);
  if (!hasFiles) return items;

  try {
    const token = await getDownloadToken();
    if (!token) return items;
    return items.map(item => {
      if (item.file_url) {
        // Support files that might already have query params
        const separator = item.file_url.includes("?") ? "&" : "?";
        return {
          ...item,
          file_url: `${item.file_url}${separator}Authorization=${token}`
        };
      }
      return item;
    });
  } catch (err) {
    console.error("[signUrls] Error signing B2 private URLs:", err);
    return items;
  }
}
