const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
  dbName: process.env.DB_NAME || 'test_database',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  s3BucketName: process.env.S3_BUCKET_NAME || 'major-project-cloudbased',
  port: parseInt(process.env.PORT || '8001', 10)
};

module.exports = config;
