import { Request, Response } from 'express';
import { User } from '../models/User';
import { Post } from '../models/Post';
import mongoose from 'mongoose';

// Buscar perfil do usuário
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando busca de perfil de usuário ===');
    console.log('ID do usuário:', req.params.id);

    // Verifica se o ID é válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('ID inválido:', req.params.id);
      return res.status(400).json({
        error: 'ID de usuário inválido',
        code: 'USER_INVALID_ID'
      });
    }

    // Busca o usuário e seus posts
    const [user, posts] = await Promise.all([
      User.findById(req.params.id)
        .select('name email photos firebaseUid')
        .lean(),
      Post.find({ userId: req.params.id })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    if (!user) {
      console.log('Usuário não encontrado');
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('Usuário encontrado:', {
      id: user._id,
      name: user.name,
      photos: user.photos?.length || 0,
      totalPosts: posts.length
    });

    // Formata a resposta
    const formattedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.photos && user.photos.length > 0 
        ? `/api/media/${user.photos[0]}`
        : null,
      posts: posts.map(post => ({
        id: post._id,
        firestoreId: post.firestoreId,
        imageUrl: post.imageUrl,
        description: post.description,
        likes: post.likes,
        hasLiked: post.likedBy?.includes(req.user._id),
        createdAt: post.createdAt
      }))
    };

    console.log('Resposta formatada:', {
      ...formattedUser,
      profilePicture: formattedUser.profilePicture ? 'exists' : 'null',
      totalPosts: formattedUser.posts.length
    });

    res.json(formattedUser);

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro ao buscar perfil do usuário',
      code: 'USER_GET_ERROR',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Buscar usuário por nome (para pesquisa)
export const searchUsers = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando busca de usuários ===');
    const { query } = req.query;
    console.log('Termo de busca:', query);

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Termo de busca é obrigatório',
        code: 'SEARCH_INVALID_QUERY'
      });
    }

    // Busca usuários que correspondam ao termo de busca
    const users = await User.find({
      name: { $regex: query, $options: 'i' }
    })
    .select('name photos')
    .lean()
    .limit(10);

    console.log(`Encontrados ${users.length} usuários`);

    // Formata a resposta
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      profilePicture: user.photos && user.photos.length > 0 
        ? `/api/media/${user.photos[0]}`
        : null
    }));

    console.log('Usuários formatados:', formattedUsers.map(u => ({
      ...u,
      profilePicture: u.profilePicture ? 'exists' : 'null'
    })));

    res.json(formattedUsers);

  } catch (error) {
    console.error('Erro na busca de usuários:', error);
    res.status(500).json({
      error: 'Erro ao buscar usuários',
      code: 'USER_SEARCH_ERROR',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 