# CloudShield

A full-stack cloud file storage application with version control, built with React, Node.js, MongoDB Atlas, and AWS S3.

## Features

- User registration and login with JWT authentication
- File upload, download, and deletion via AWS S3
- Version history and version restore for all uploaded files
- Configurable CORS for secure cross-origin access

## Tech Stack

**Frontend:** React, React Router, Tailwind CSS, Axios  
**Backend:** Node.js, Express, MongoDB Atlas, AWS S3, JWT

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB Atlas cluster
- AWS S3 bucket with versioning enabled

### Installation

```bash
git clone <repo-url>
cd MAJOR_PROJECT
npm run install-all
```

### Configuration

Create `backend/.env`:

```env
MONGO_URL=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/
DB_NAME=cloudshield
JWT_SECRET=your-secret
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-bucket-name
CORS_ORIGINS=http://localhost:3000
PORT=8001
```

> Ensure your IP is whitelisted in MongoDB Atlas under Network Access.

### Running Locally

```bash
npm run dev
```

- Backend: http://localhost:8001  
- Frontend: http://localhost:3000

## API Reference

All routes are prefixed with `/api`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login and receive access token |
| POST | `/files/upload` | Yes | Upload a file |
| GET | `/files` | Yes | List all user files |
| GET | `/files/:id/versions` | Yes | List all versions of a file |
| GET | `/files/:id/download` | Yes | Download a file (optional `?version_id=`) |
| POST | `/files/:id/restore` | Yes | Restore a specific version |
| DELETE | `/files/:id` | Yes | Delete a file and all versions |
| GET | `/health` | No | Health check |

## Deployment

**Backend** is deployed on [Render](https://render.com) via `render.yaml`.  
**Frontend** is deployed on [Vercel](https://vercel.com) via `vercel.json`.

Set the required environment variables in each platform's dashboard before deploying.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and frontend concurrently |
| `npm run backend` | Start backend only |
| `npm run frontend` | Start frontend only |
| `npm run install-all` | Install all dependencies |
