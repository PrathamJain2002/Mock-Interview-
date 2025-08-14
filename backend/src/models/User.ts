import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  mobileNumber: string;
  email?: string;
  overallScore: number;
  technicalScore: number;
  behavioralScore: number;
  communicationScore: number;
  jobTitle: string;
  company: string;
  interviewDate: Date;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  questions: Array<{
    id: number;
    text: string;
    category: string;
  }>;
  answers: Array<{
    questionId: number;
    answer: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  technicalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  behavioralScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  communicationScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  interviewDate: {
    type: Date,
    default: Date.now
  },
  strengths: [{
    type: String,
    trim: true
  }],
  weaknesses: [{
    type: String,
    trim: true
  }],
  suggestions: [{
    type: String,
    trim: true
  }],
  questions: [{
    id: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    }
  }],
  answers: [{
    questionId: {
      type: Number,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create index for mobile number for quick lookups
UserSchema.index({ mobileNumber: 1 });

// Create index for interview date for sorting
UserSchema.index({ interviewDate: -1 });

export default mongoose.model<IUser>('User', UserSchema);
