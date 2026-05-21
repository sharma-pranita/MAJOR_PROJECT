const { MongoClient } = require("mongodb");
const config = require("./config");

let client = new MongoClient(config.mongoUrl);
let db = null;

async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas");
  } catch (err) {
    console.error(`MongoDB Atlas connection failed: ${err.message}`);
    throw err;
  }
  db = client.db(config.dbName);
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("files").createIndex({ user_id: 1 });
  await db.collection("files").createIndex({ id: 1, user_id: 1 });
  return db;
}

function getDB() {
  if (!db) {
    throw new Error("Database not initialized! Call connectDB first.");
  }
  return db;
}

async function getUserByEmail(email) {
  const database = getDB();
  return await database.collection("users").findOne({ email });
}

async function createUser(userData) {
  const database = getDB();
  await database.collection("users").insertOne(userData);
  return userData;
}

async function createFileMetadata(fileData) {
  const database = getDB();
  await database.collection("files").insertOne(fileData);
  return fileData;
}

async function getUserFiles(userId) {
  const database = getDB();
  return await database
    .collection("files")
    .find({ user_id: userId })
    .project({ _id: 0 })
    .toArray();
}

async function getFileById(fileId, userId) {
  const database = getDB();
  return await database
    .collection("files")
    .findOne({ id: fileId, user_id: userId });
}

async function updateFileVersionCount(fileId, userId, versionCount) {
  const database = getDB();
  await database
    .collection("files")
    .updateOne(
      { id: fileId, user_id: userId },
      { $set: { version_count: versionCount } },
    );
}

async function deleteFile(fileId, userId) {
  const database = getDB();
  const result = await database
    .collection("files")
    .deleteOne({ id: fileId, user_id: userId });
  return result.deletedCount > 0;
}

async function closeDBConnection() {
  await client.close();
  console.log("MongoDB connection closed.");
}

module.exports = {
  connectDB,
  getDB,
  getUserByEmail,
  createUser,
  createFileMetadata,
  getUserFiles,
  getFileById,
  updateFileVersionCount,
  deleteFile,
  closeDBConnection,
};
