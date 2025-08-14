# MongoDB Setup Guide

## Prerequisites
1. Install MongoDB Community Edition on your system
2. Make sure MongoDB service is running

## Installation Steps

### 1. Install MongoDB Dependencies
```bash
npm install mongoose @types/mongoose
```

### 2. Create Environment File
Create a `.env` file in the backend directory with the following content:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/interview-app

# AI Configuration - Ollama (Local AI) - PRIMARY
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# OpenAI Configuration (Cloud AI Alternative)
OPENAI_API_KEY=your_openai_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### 3. Start MongoDB Service

#### On Windows:
```bash
# Start MongoDB service
net start MongoDB

# Or if using MongoDB as a Windows service
sc start MongoDB
```

#### On macOS/Linux:
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or using brew (macOS)
brew services start mongodb-community
```

### 4. Verify MongoDB Connection
```bash
# Connect to MongoDB shell
mongosh

# Or if using older version
mongo

# Check if database exists
show dbs

# Use interview-app database
use interview-app

# Check collections
show collections
```

## Database Schema

The application creates the following collections:

### Users Collection
- **name**: Full name of the candidate (required)
- **mobileNumber**: Mobile number (required, indexed)
- **email**: Email address (optional)
- **overallScore**: Overall interview score (0-100)
- **technicalScore**: Technical skills score (0-100)
- **behavioralScore**: Behavioral skills score (0-100)
- **communicationScore**: Communication skills score (0-100)
- **jobTitle**: Applied job title
- **company**: Company name
- **interviewDate**: Date of interview
- **strengths**: Array of identified strengths
- **weaknesses**: Array of areas for improvement
- **suggestions**: Array of improvement suggestions
- **questions**: Array of interview questions
- **answers**: Array of candidate answers
- **createdAt**: Record creation timestamp
- **updatedAt**: Record update timestamp

## API Endpoints

### User Management
- `POST /api/users/save-interview` - Save interview results
- `GET /api/users/interviews/:mobileNumber` - Get user's interview history
- `GET /api/users/interview/:id` - Get specific interview details
- `GET /api/users/stats` - Get overall statistics

## Testing the Integration

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd ../mock-interview-app
   npm run dev
   ```

3. Complete an interview and check MongoDB:
   ```bash
   mongosh
   use interview-app
   db.users.find().pretty()
   ```

## Troubleshooting

### Connection Issues
- Ensure MongoDB service is running
- Check if port 27017 is available
- Verify MongoDB URI in .env file

### Database Issues
- Check MongoDB logs for errors
- Ensure database permissions are correct
- Verify collection indexes are created

### API Issues
- Check backend console for error messages
- Verify API endpoints are accessible
- Check CORS configuration
