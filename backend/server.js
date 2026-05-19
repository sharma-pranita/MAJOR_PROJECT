const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const {
  connectDB,
  getUserByEmail,
  createUser,
  createFileMetadata,
  getUserFiles,
  getFileById,
  updateFileVersionCount,
  deleteFile,
  closeDBConnection
} = require('./database');
const {
  hashPassword,
  verifyPassword,
  createAccessToken,
  authenticateToken
} = require('./auth');
const s3Service = require('./s3_service');

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiRouter = express.Router();

apiRouter.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }

  try {
    await connectDB();
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    const userData = {
      id: userId,
      email,
      password_hash: passwordHash,
      created_at: createdAt
    };

    await createUser(userData);
    const accessToken = createAccessToken({ sub: userId });

    return res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: userId,
        email,
        created_at: createdAt
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }

  try {
    await connectDB();
    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const accessToken = createAccessToken({ sub: user.id });

    return res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.post('/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'No file uploaded' });
  }

  try {
    await connectDB();
    const fileContent = req.file.buffer;
    const fileId = uuidv4();
    const s3Key = `${req.userId}/${fileId}/${req.file.originalname}`;
    const contentType = req.file.mimetype || 'application/octet-stream';

    const s3Result = await s3Service.uploadFile(fileContent, s3Key, contentType);

    const fileData = {
      id: fileId,
      user_id: req.userId,
      filename: req.file.originalname,
      s3_key: s3Key,
      size: fileContent.length,
      content_type: contentType,
      uploaded_at: new Date().toISOString(),
      version_count: 1
    };

    await createFileMetadata(fileData);

    return res.json({
      id: fileId,
      filename: req.file.originalname,
      size: fileContent.length,
      version_id: s3Result.version_id,
      uploaded_at: fileData.uploaded_at
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.get('/files', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    const files = await getUserFiles(req.userId);

    const responseFiles = files.map(f => ({
      id: f.id,
      filename: f.filename,
      size: f.size,
      content_type: f.content_type,
      uploaded_at: f.uploaded_at,
      version_count: f.version_count || 1
    }));

    return res.json(responseFiles);
  } catch (err) {
    console.error('List files error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.get('/files/:file_id/versions', authenticateToken, async (req, res) => {
  const fileId = req.params.file_id;
  try {
    await connectDB();
    const fileData = await getFileById(fileId, req.userId);
    if (!fileData) {
      return res.status(404).json({ detail: 'File not found' });
    }

    const versions = await s3Service.listObjectVersions(fileData.s3_key);
    await updateFileVersionCount(fileId, req.userId, versions.length);

    const responseVersions = versions.map(v => ({
      version_id: v.version_id,
      size: v.size,
      uploaded_at: v.last_modified,
      is_latest: v.is_latest
    }));

    return res.json(responseVersions);
  } catch (err) {
    console.error('List versions error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.get('/files/:file_id/download', authenticateToken, async (req, res) => {
  const fileId = req.params.file_id;
  const versionId = req.query.version_id || null;

  try {
    await connectDB();
    const fileData = await getFileById(fileId, req.userId);
    if (!fileData) {
      return res.status(404).json({ detail: 'File not found' });
    }

    const content = await s3Service.downloadFile(fileData.s3_key, versionId);

    res.setHeader('Content-Type', fileData.content_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
    return res.send(content);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.post('/files/:file_id/restore', authenticateToken, async (req, res) => {
  const fileId = req.params.file_id;
  const versionId = req.query.version_id;

  if (!versionId) {
    return res.status(400).json({ detail: 'version_id query parameter is required' });
  }

  try {
    await connectDB();
    const fileData = await getFileById(fileId, req.userId);
    if (!fileData) {
      return res.status(404).json({ detail: 'File not found' });
    }

    const result = await s3Service.restoreVersion(fileData.s3_key, versionId);

    return res.json({
      message: 'Version restored successfully',
      ...result
    });
  } catch (err) {
    console.error('Restore error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete('/files/:file_id', authenticateToken, async (req, res) => {
  const fileId = req.params.file_id;
  try {
    await connectDB();
    const fileData = await getFileById(fileId, req.userId);
    if (!fileData) {
      return res.status(404).json({ detail: 'File not found' });
    }

    await s3Service.deleteAllVersions(fileData.s3_key);
    await deleteFile(fileId, req.userId);

    return res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

apiRouter.get('/health', (req, res) => {
  return res.json({ status: 'healthy', service: 'CloudShield API' });
});

app.use('/api', apiRouter);

async function startServer() {
  try {
    await connectDB();
    const PORT = config.port;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`CloudShield Express API running on http://localhost:${PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Shutting down gracefully...');
      await closeDBConnection();
      server.close(() => {
        console.log('Express server closed.');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      await closeDBConnection();
      server.close(() => {
        console.log('Express server closed.');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('Database connection failed on server startup:', err);
    process.exit(1);
  }
}

startServer();
