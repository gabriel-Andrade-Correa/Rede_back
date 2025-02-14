import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  password?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  photos: string[];
  interests: string[];
  location?: {
    type: string;
    coordinates: number[];
  };
  matches: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    minlength: 6
  },
  birthDate: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  bio: {
    type: String,
    maxlength: 500
  },
  photos: [{
    type: String
  }],
  interests: [{
    type: String
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  matches: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Índice geoespacial
userSchema.index({ location: '2dsphere' });

// Middleware para hash da senha (opcional agora que usamos Firebase)
userSchema.pre('save', async function(next) {
  if (this.password && this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      next(error);
    }
  }
  next();
});

// Método para comparar senhas (opcional agora que usamos Firebase)
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 