const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  mongoUrl: process.env.MONGO_URL,
  dbName: process.env.DB_NAME,
  corsOrigins: process.env.CORS_ORIGINS,
  jwtSecret: process.env.JWT_SECRET,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ,
  awsRegion: process.env.AWS_REGION,
  s3BucketName: process.env.S3_BUCKET_NAME,
  port: parseInt(process.env.PORT || '8001', 10)
};

module.exports = config;
