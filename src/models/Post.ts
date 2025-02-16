import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  imageUrl: string;
  description?: string;
  likes: number;
  likedBy: mongoose.Types.ObjectId[]; // Array de IDs de usuários que deram like
  createdAt: Date;
  firestoreId: string; // ID do documento no Firestore
}

const postSchema = new Schema<IPost>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  firestoreId: {
    type: String,
    required: true,
    unique: true // Garante que não haverá duplicatas
  }
}, {
  timestamps: true
});

// Índices para melhorar a performance das buscas
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ firestoreId: 1 }); // Índice para buscar por ID do Firestore
postSchema.index({ likedBy: 1 }); // Índice para buscar likes de usuários

export const Post = mongoose.model<IPost>('Post', postSchema); 