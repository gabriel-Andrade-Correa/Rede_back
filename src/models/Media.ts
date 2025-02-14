import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'profile' | 'post' | 'feed';
  data: Buffer;
  mimeType: string;
  createdAt: Date;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    description?: string;
  };
}

const mediaSchema = new Schema<IMedia>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['profile', 'post', 'feed'],
    required: true
  },
  data: {
    type: Buffer,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    size: Number,
    description: String
  }
}, {
  timestamps: true
});

// Índice para melhorar a performance das buscas
mediaSchema.index({ userId: 1, type: 1 });

export const Media = mongoose.model<IMedia>('Media', mediaSchema); 