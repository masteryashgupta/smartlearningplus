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
