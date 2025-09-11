const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test all API endpoints
async function testAllEndpoints() {
  console.log('🚀 Testing AI Mock Interview API Endpoints\n');
  
  try {
    // 1. Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health Check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health Check Failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Get All Users/Interviews (if any exist)
    console.log('2️⃣ Testing Get All Interviews...');
    try {
      // First, let's try to get stats to see if there's any data
      const statsResponse = await axios.get(`${BASE_URL}/users/stats`);
      console.log('✅ Statistics:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Stats Failed:', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Test Resume Parsing (with a sample)
    console.log('3️⃣ Testing Resume Parse Endpoint...');
    try {
      const parseResponse = await axios.post(`${BASE_URL}/resume/parse`, {
        // This will likely fail without a file, but we can test the endpoint
        test: 'data'
      });
      console.log('✅ Resume Parse Response:', parseResponse.data);
    } catch (error) {
      console.log('❌ Resume Parse Failed (Expected):', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Test Question Generation
    console.log('4️⃣ Testing Question Generation...');
    try {
      const questionsResponse = await axios.post(`${BASE_URL}/questions/generate`, {
        jobTitle: 'Software Engineer',
        company: 'Test Company',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: '2 years'
      });
      console.log('✅ Questions Generated:', JSON.stringify(questionsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Question Generation Failed:', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Test Performance Analysis
    console.log('5️⃣ Testing Performance Analysis...');
    try {
      const performanceResponse = await axios.post(`${BASE_URL}/performance/analyze`, {
        questions: ['What is React?', 'Explain JavaScript closures'],
        answers: ['React is a library', 'Closures are functions that remember their scope'],
        jobTitle: 'Software Engineer'
      });
      console.log('✅ Performance Analysis:', JSON.stringify(performanceResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Performance Analysis Failed:', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 6. Create a Sample Interview Record
    console.log('6️⃣ Testing Create Sample Interview...');
    try {
      const sampleInterview = {
        name: 'John Doe',
        mobileNumber: '+1234567890',
        email: 'john.doe@example.com',
        overallScore: 85,
        technicalScore: 90,
        behavioralScore: 80,
        communicationScore: 85,
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        strengths: ['Strong technical skills', 'Good communication'],
        weaknesses: ['Needs more experience with testing'],
        suggestions: ['Practice unit testing', 'Learn more about DevOps'],
        questions: [
          {
            id: 1,
            text: 'What is React?',
            category: 'Technical'
          },
          {
            id: 2,
            text: 'Explain your experience with Node.js',
            category: 'Technical'
          }
        ],
        answers: [
          {
            questionId: 1,
            answer: 'React is a JavaScript library for building user interfaces',
            timestamp: new Date()
          },
          {
            questionId: 2,
            answer: 'I have 2 years of Node.js experience building backend APIs',
            timestamp: new Date()
          }
        ]
      };
      
      const createResponse = await axios.post(`${BASE_URL}/users/save-interview`, sampleInterview);
      console.log('✅ Sample Interview Created:', JSON.stringify(createResponse.data, null, 2));
      
      // Now get the created interview
      if (createResponse.data.userId) {
        console.log('\n7️⃣ Testing Get Specific Interview...');
        const getInterviewResponse = await axios.get(`${BASE_URL}/users/interview/${createResponse.data.userId}`);
        console.log('✅ Retrieved Interview:', JSON.stringify(getInterviewResponse.data, null, 2));
      }
      
      // Get all interviews for this user
      console.log('\n8️⃣ Testing Get User Interviews...');
      const userInterviewsResponse = await axios.get(`${BASE_URL}/users/interviews/+1234567890`);
      console.log('✅ User Interviews:', JSON.stringify(userInterviewsResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ Create Interview Failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ General Error:', error.message);
  }
}

// Run the tests
testAllEndpoints();
