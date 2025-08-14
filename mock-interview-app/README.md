# AI Mock Interview Application

A comprehensive Next.js application that provides AI-powered mock interviews with speech recognition, question generation, and performance analysis.

## Features

- **Resume Upload**: Upload PDF resumes for analysis
- **Job Details Input**: Specify job title, company, and requirements
- **AI-Powered Questions**: Dynamic question generation based on resume and job details
- **Speech Recognition**: Voice input for answers with real-time transcription
- **Text-to-Speech**: AI reads questions aloud
- **Performance Analysis**: Comprehensive scoring and feedback
- **Detailed Reports**: Downloadable interview reports with improvement suggestions

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **OpenAI API** for question generation and analysis
- **Web Speech API** for speech recognition and synthesis
- **Lucide React** for icons

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_NAME=AI Mock Interview
```

### 3. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and paste it in your `.env.local` file

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Landing Page
- Upload your resume (PDF format)
- Fill in job details (title, company, description, requirements)
- Click "Start Mock Interview"

### 2. Interview Process
- Review interview details
- Click "Start Interview" to begin
- Questions will be read aloud by AI
- Answer using voice recording or text input
- Navigate through questions using "Next Question"

### 3. Report Generation
- View comprehensive performance analysis
- See scores for different categories
- Review strengths and areas for improvement
- Download detailed report
- Start a new interview

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page with resume upload
│   ├── interview/
│   │   └── page.tsx          # Interview interface
│   ├── report/
│   │   └── page.tsx          # Performance report
│   └── api/
│       ├── generate-questions/
│       │   └── route.ts      # OpenAI question generation
│       └── analyze-performance/
│           └── route.ts      # Performance analysis
├── components/               # Reusable components
└── styles/                  # Global styles
```

## API Endpoints

### POST /api/generate-questions
Generates interview questions based on resume and job details.

**Request Body:**
```json
{
  "resumeContent": "string",
  "jobDetails": {
    "title": "string",
    "company": "string",
    "description": "string",
    "requirements": "string"
  }
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": 1,
      "text": "string",
      "category": "string"
    }
  ]
}
```

### POST /api/analyze-performance
Analyzes interview performance and provides feedback.

**Request Body:**
```json
{
  "questions": [...],
  "answers": [...],
  "jobDetails": {...}
}
```

**Response:**
```json
{
  "overallScore": 85,
  "technicalScore": 80,
  "behavioralScore": 90,
  "communicationScore": 85,
  "strengths": [...],
  "weaknesses": [...],
  "suggestions": [...]
}
```

## Browser Compatibility

This application uses the Web Speech API, which is supported in:
- Chrome/Chromium browsers
- Edge
- Safari (limited support)

For best experience, use Chrome or Edge.

## Features in Detail

### Speech Recognition
- Real-time voice-to-text conversion
- Continuous listening mode
- Error handling for unsupported browsers

### Text-to-Speech
- AI reads questions aloud
- Adjustable speech rate and pitch
- Mute/unmute functionality

### Performance Analysis
- Overall score calculation
- Category-specific scoring (Technical, Behavioral, Communication)
- Strengths and weaknesses identification
- Actionable improvement suggestions

### Report Generation
- Comprehensive performance metrics
- Question-by-question analysis
- Downloadable text reports
- Visual score indicators

## Customization

### Adding New Question Categories
1. Update the question generation prompt in `/api/generate-questions/route.ts`
2. Add new category styles in the interview interface
3. Update the performance analysis logic

### Modifying Scoring Algorithm
1. Edit the `generateMockAnalysis` function in `/api/analyze-performance/route.ts`
2. Adjust scoring weights and criteria
3. Add new evaluation metrics

### Styling Changes
- Modify Tailwind classes in component files
- Update color schemes and layouts
- Add new UI components as needed

## Troubleshooting

### Speech Recognition Not Working
- Ensure you're using a supported browser (Chrome/Edge)
- Check microphone permissions
- Try refreshing the page

### OpenAI API Errors
- Verify your API key is correct
- Check your OpenAI account has sufficient credits
- Ensure the API key has the necessary permissions

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript compilation with `npm run build`
- Verify environment variables are set correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser compatibility
3. Verify API key configuration
4. Check console for error messages
