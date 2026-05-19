const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectVersionsCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');

class S3Service {
  constructor() {
    this.bucketName = config.s3BucketName;
    this.localMode = false;
    this.localStoragePath = path.join(__dirname, 'local_storage');

    if (
      !config.awsAccessKeyId ||
      !config.awsSecretAccessKey ||
      config.awsAccessKeyId.startsWith('mock') ||
      config.awsSecretAccessKey.startsWith('mock')
    ) {
      console.log('AWS S3 credentials not provided or mock. Falling back to Local Filesystem Versioned Storage.');
      this.localMode = true;
      this.initLocalStorage();
    } else {
      try {
        this.s3Client = new S3Client({
          region: config.awsRegion,
          credentials: {
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey
          }
        });
        console.log('AWS S3 Client initialized successfully.');
      } catch (err) {
        console.warn('Failed to initialize AWS S3 client. Falling back to Local Filesystem Versioned Storage.', err.message);
        this.localMode = true;
        this.initLocalStorage();
      }
    }
  }

  initLocalStorage() {
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  async uploadFile(fileContent, fileKey, contentType = 'application/octet-stream') {
    if (this.localMode) {
      return await this.uploadLocal(fileContent, fileKey);
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileContent,
        ContentType: contentType
      });
      const response = await this.s3Client.send(command);
      console.log(`Uploaded to AWS S3: ${fileKey}, Version: ${response.VersionId}`);
      return {
        version_id: response.VersionId,
        etag: response.ETag
      };
    } catch (err) {
      console.error(`AWS S3 Upload failed for ${fileKey}: ${err.message}. Retrying via Local Storage.`);
      this.localMode = true;
      this.initLocalStorage();
      return await this.uploadLocal(fileContent, fileKey);
    }
  }

  async downloadFile(fileKey, versionId = null) {
    if (this.localMode) {
      return await this.downloadLocal(fileKey, versionId);
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileKey
      };
      if (versionId) {
        params.VersionId = versionId;
      }
      const command = new GetObjectCommand(params);
      const response = await this.s3Client.send(command);

      const streamToBuffer = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });

      const content = await streamToBuffer(response.Body);
      console.log(`Downloaded from AWS S3: ${fileKey}, Version: ${versionId || 'latest'}`);
      return content;
    } catch (err) {
      console.warn(`AWS S3 Download failed for ${fileKey}: ${err.message}. Trying Local Storage.`);
      return await this.downloadLocal(fileKey, versionId);
    }
  }

  async listObjectVersions(fileKey) {
    if (this.localMode) {
      return await this.listLocalVersions(fileKey);
    }

    try {
      const command = new ListObjectVersionsCommand({
        Bucket: this.bucketName,
        Prefix: fileKey
      });
      const response = await this.s3Client.send(command);
      const versions = [];

      if (response.Versions) {
        for (const version of response.Versions) {
          if (version.Key === fileKey) {
            versions.push({
              version_id: version.VersionId,
              is_latest: version.IsLatest,
              last_modified: version.LastModified.toISOString(),
              size: version.Size
            });
          }
        }
      }

      console.log(`Found ${versions.length} versions in AWS S3 for ${fileKey}`);
      return versions.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
    } catch (err) {
      console.warn(`AWS S3 List Versions failed for ${fileKey}: ${err.message}. Trying Local Storage.`);
      return await this.listLocalVersions(fileKey);
    }
  }

  async restoreVersion(fileKey, versionId) {
    if (this.localMode) {
      return await this.restoreLocalVersion(fileKey, versionId);
    }

    try {
      const copySource = `${this.bucketName}/${fileKey}?versionId=${versionId}`;
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: encodeURIComponent(copySource),
        Key: fileKey
      });
      const response = await this.s3Client.send(command);
      console.log(`Version restored in AWS S3: ${fileKey}, Version: ${versionId}`);
      return {
        restored_from_version: versionId,
        new_version_id: response.VersionId
      };
    } catch (err) {
      console.warn(`AWS S3 Restore failed for ${fileKey}: ${err.message}. Trying Local Storage.`);
      return await this.restoreLocalVersion(fileKey, versionId);
    }
  }

  getLocalPaths(fileKey) {
    const parts = fileKey.split('/');
    if (parts.length < 3) {
      const safeKey = fileKey.replace(/[^a-zA-Z0-9]/g, '_');
      const dirPath = path.join(this.localStoragePath, 'default');
      return { dirPath, filename: safeKey };
    }
    const [userId, fileId, filename] = parts;
    const dirPath = path.join(this.localStoragePath, userId, fileId);
    return { dirPath, filename };
  }

  async uploadLocal(fileContent, fileKey) {
    const { dirPath, filename } = this.getLocalPaths(fileKey);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const versionId = uuidv4();
    const localFilePath = path.join(dirPath, `${versionId}_${filename}`);

    fs.writeFileSync(localFilePath, fileContent);
    console.log(`[LOCAL STORAGE] File saved: ${localFilePath}, Version: ${versionId}`);

    return {
      version_id: versionId,
      etag: `"${versionId}"`
    };
  }

  async downloadLocal(fileKey, versionId = null) {
    const { dirPath, filename } = this.getLocalPaths(fileKey);

    if (!fs.existsSync(dirPath)) {
      throw new Error(`File not found: ${fileKey}`);
    }

    const files = fs.readdirSync(dirPath);
    let targetFile = null;

    if (versionId) {
      targetFile = files.find(file => file.startsWith(`${versionId}_`));
    } else {
      let latestTime = 0;
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
          targetFile = file;
        }
      }
    }

    if (!targetFile) {
      throw new Error(`Target file version not found: ${fileKey} (version: ${versionId || 'latest'})`);
    }

    const filePath = path.join(dirPath, targetFile);
    return fs.readFileSync(filePath);
  }

  async listLocalVersions(fileKey) {
    const { dirPath, filename } = this.getLocalPaths(fileKey);

    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const files = fs.readdirSync(dirPath);

    const fileStats = files.map(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const underscoreIdx = file.indexOf('_');
      const versionId = underscoreIdx !== -1 ? file.substring(0, underscoreIdx) : 'unknown';
      return {
        version_id: versionId,
        filePath,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    });

    fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

    return fileStats.map((item, idx) => ({
      version_id: item.version_id,
      is_latest: idx === 0,
      last_modified: item.lastModified,
      size: item.size
    }));
  }

  async restoreLocalVersion(fileKey, versionId) {
    const { dirPath, filename } = this.getLocalPaths(fileKey);

    if (!fs.existsSync(dirPath)) {
      throw new Error(`File not found: ${fileKey}`);
    }

    const files = fs.readdirSync(dirPath);
    const sourceFile = files.find(file => file.startsWith(`${versionId}_`));

    if (!sourceFile) {
      throw new Error(`Version ${versionId} not found to restore`);
    }

    const sourcePath = path.join(dirPath, sourceFile);
    const content = fs.readFileSync(sourcePath);

    const result = await this.uploadLocal(content, fileKey);

    return {
      restored_from_version: versionId,
      new_version_id: result.version_id
    };
  }

  async deleteAllVersions(fileKey) {
    if (this.localMode) {
      return await this.deleteLocalAllVersions(fileKey);
    }

    try {
      const { DeleteObjectsCommand } = require('@aws-sdk/client-s3');
      const versions = await this.listObjectVersions(fileKey);
      if (versions.length === 0) return;

      const objects = versions.map(v => ({ Key: fileKey, VersionId: v.version_id }));
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: { Objects: objects, Quiet: true }
      });
      await this.s3Client.send(command);
      console.log(`[S3] Deleted all ${versions.length} versions of ${fileKey}`);
    } catch (err) {
      console.warn(`AWS S3 Delete failed for ${fileKey}: ${err.message}. Trying Local Storage.`);
      return await this.deleteLocalAllVersions(fileKey);
    }
  }

  async deleteLocalAllVersions(fileKey) {
    const { dirPath } = this.getLocalPaths(fileKey);
    if (!fs.existsSync(dirPath)) return;

    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`[LOCAL STORAGE] Deleted all versions at: ${dirPath}`);
  }
}

const s3Service = new S3Service();
module.exports = s3Service;
