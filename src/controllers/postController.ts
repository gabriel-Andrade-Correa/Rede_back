import { Request, Response } from 'express';
import { Post } from '../models/Post';
import { Media } from '../models/Media';
import mongoose from 'mongoose';

// Criar post
export const createPost = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando criação de post ===');
    const { imageUrl, description, firestoreId } = req.body;
    console.log('Dados recebidos:', { imageUrl, description, firestoreId });

    if (!imageUrl) {
      return res.status(400).json({
        error: 'URL da imagem é obrigatória',
        code: 'POST_NO_IMAGE'
      });
    }

    if (!firestoreId) {
      return res.status(400).json({
        error: 'ID do Firestore é obrigatório',
        code: 'POST_NO_FIRESTORE_ID'
      });
    }

    // Extrai o ID da mídia da URL
    const mediaId = imageUrl.includes('/api/media/') 
      ? imageUrl.split('/api/media/')[1]
      : imageUrl;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        error: 'ID da mídia inválido',
        code: 'POST_INVALID_MEDIA_ID'
      });
    }

    // Verifica se a mídia existe
    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({
        error: 'Mídia não encontrada',
        code: 'POST_MEDIA_NOT_FOUND'
      });
    }

    // Formata a URL corretamente
    const formattedImageUrl = `/api/media/${mediaId}`;

    // Verifica se já existe um post com este ID do Firestore
    const existingPost = await Post.findOne({ firestoreId });
    if (existingPost) {
      return res.status(400).json({
        error: 'Já existe um post com este ID',
        code: 'POST_DUPLICATE_ID'
      });
    }

    const post = new Post({
      userId: req.user._id,
      imageUrl: formattedImageUrl,
      description,
      likes: 0,
      firestoreId
    });

    console.log('Post a ser criado:', {
      userId: post.userId,
      imageUrl: post.imageUrl,
      description: post.description,
      firestoreId: post.firestoreId
    });

    await post.save();
    console.log('Post criado com sucesso. ID:', post._id);

    res.status(201).json({
      id: post._id,
      firestoreId: post.firestoreId,
      userId: post.userId,
      imageUrl: post.imageUrl,
      description: post.description,
      likes: post.likes,
      createdAt: post.createdAt
    });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json({
      error: 'Erro ao criar post',
      code: 'POST_CREATE_ERROR',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Listar posts do feed
export const getPosts = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando listagem de posts ===');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Busca os posts com informações completas do usuário
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'name photos',
        model: 'User'
      })
      .select('firestoreId imageUrl description likes createdAt userId likedBy')
      .lean();

    console.log(`Encontrados ${posts.length} posts`);

    const total = await Post.countDocuments();

    // Formata os posts para incluir informações do usuário
    const formattedPosts = posts.map(post => {
      const user = post.userId as any;
      console.log('Informações do usuário do post:', {
        userId: user._id,
        name: user.name,
        photos: user.photos
      });

      return {
        id: post._id,
        firestoreId: post.firestoreId,
        imageUrl: post.imageUrl,
        description: post.description,
        likes: post.likes,
        hasLiked: post.likedBy?.includes(req.user._id),
        createdAt: post.createdAt,
        user: {
          id: user._id,
          name: user.name,
          profilePicture: user.photos && user.photos.length > 0 
            ? `/api/media/${user.photos[0]}` 
            : null
        }
      };
    });

    console.log('Posts formatados com informações de usuário:', 
      formattedPosts.map(p => ({
        ...p,
        user: {
          ...p.user,
          profilePicture: p.user.profilePicture ? 'exists' : 'null'
        }
      }))
    );

    res.json({
      posts: formattedPosts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar posts:', error);
    res.status(500).json({
      error: 'Erro ao listar posts',
      code: 'POST_LIST_ERROR',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Buscar post específico
export const getPost = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando busca de post ===');
    console.log('ID do Firestore:', req.params.id);

    const post = await Post.findOne({ firestoreId: req.params.id })
      .populate({
        path: 'userId',
        select: 'name photos',
        model: 'User'
      });

    if (!post) {
      return res.status(404).json({
        error: 'Post não encontrado',
        code: 'POST_NOT_FOUND'
      });
    }

    const user = post.userId as any;
    res.json({
      id: post._id,
      firestoreId: post.firestoreId,
      imageUrl: post.imageUrl,
      description: post.description,
      likes: post.likes,
      hasLiked: post.likedBy?.includes(req.user._id),
      createdAt: post.createdAt,
      user: {
        id: user._id,
        name: user.name,
        profilePicture: user.photos && user.photos.length > 0 
          ? `/api/media/${user.photos[0]}` 
          : null
      }
    });
  } catch (error) {
    console.error('Erro ao buscar post:', error);
    res.status(500).json({
      error: 'Erro ao buscar post',
      code: 'POST_GET_ERROR'
    });
  }
};

// Atualizar likes do post
export const updateLikes = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando atualização de likes ===');
    console.log('ID do Firestore:', req.params.id);
    console.log('Usuário:', req.user._id);

    const post = await Post.findOne({ firestoreId: req.params.id });

    if (!post) {
      return res.status(404).json({
        error: 'Post não encontrado',
        code: 'POST_NOT_FOUND'
      });
    }

    // Verifica se o usuário já deu like
    const hasLiked = post.likedBy.includes(req.user._id);

    if (hasLiked) {
      // Remove o like
      post.likes = Math.max(0, post.likes - 1); // Evita likes negativos
      post.likedBy = post.likedBy.filter(userId => !userId.equals(req.user._id));
      console.log('Like removido do post');
    } else {
      // Adiciona o like
      post.likes += 1;
      post.likedBy.push(req.user._id);
      console.log('Like adicionado ao post');
    }

    await post.save();
    console.log('Post atualizado com sucesso');

    res.json({ 
      likes: post.likes,
      hasLiked: !hasLiked, // Retorna o novo estado
      firestoreId: post.firestoreId
    });
  } catch (error) {
    console.error('Erro ao atualizar likes:', error);
    res.status(500).json({
      error: 'Erro ao atualizar likes',
      code: 'POST_UPDATE_ERROR'
    });
  }
};

// Verificar se usuário deu like em um post
export const checkLike = async (req: Request, res: Response) => {
  try {
    console.log('=== Verificando like do usuário ===');
    console.log('ID do Firestore:', req.params.id);
    console.log('Usuário:', req.user._id);

    const post = await Post.findOne({ firestoreId: req.params.id });

    if (!post) {
      return res.status(404).json({
        error: 'Post não encontrado',
        code: 'POST_NOT_FOUND'
      });
    }

    const hasLiked = post.likedBy.includes(req.user._id);
    console.log('Usuário já deu like?', hasLiked);

    res.json({ 
      hasLiked,
      likes: post.likes,
      firestoreId: post.firestoreId
    });
  } catch (error) {
    console.error('Erro ao verificar like:', error);
    res.status(500).json({
      error: 'Erro ao verificar like',
      code: 'LIKE_CHECK_ERROR'
    });
  }
};

// Deletar post
export const deletePost = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando deleção de post ===');
    console.log('ID do Firestore:', req.params.id);
    console.log('Usuário:', req.user._id);

    // Busca o post pelo ID do Firestore
    const post = await Post.findOne({
      firestoreId: req.params.id,
      userId: req.user._id
    });

    if (!post) {
      console.log('Post não encontrado ou sem permissão');
      return res.status(404).json({
        error: 'Post não encontrado ou sem permissão para deletar',
        code: 'POST_NOT_FOUND'
      });
    }

    console.log('Post encontrado:', {
      id: post._id,
      firestoreId: post.firestoreId,
      userId: post.userId,
      imageUrl: post.imageUrl
    });

    // Extrai o ID da mídia da URL
    const mediaId = post.imageUrl.split('/api/media/')[1];
    console.log('ID da mídia associada:', mediaId);

    // Deleta a mídia associada
    if (mediaId && mongoose.Types.ObjectId.isValid(mediaId)) {
      try {
        const mediaDeleteResult = await Media.findOneAndDelete({
          _id: mediaId,
          userId: req.user._id
        });
        console.log('Resultado da deleção da mídia:', mediaDeleteResult ? 'Sucesso' : 'Mídia não encontrada');
      } catch (mediaError) {
        console.error('Erro ao deletar mídia:', mediaError);
      }
    }

    // Deleta o post
    await post.deleteOne();
    console.log('Post deletado com sucesso');

    res.json({
      message: 'Post deletado com sucesso',
      code: 'POST_DELETED',
      deletedPost: {
        id: post._id,
        firestoreId: post.firestoreId,
        imageUrl: post.imageUrl,
        mediaId
      }
    });

  } catch (error: any) {
    console.error('Erro detalhado ao deletar post:', error);
    res.status(500).json({
      error: 'Erro ao deletar post',
      code: 'POST_DELETE_ERROR',
      details: {
        message: error?.message || 'Erro desconhecido',
        type: error?.name,
        path: error?.path
      }
    });
  }
};

// Atualizar post
export const updatePost = async (req: Request, res: Response) => {
  try {
    console.log('=== Iniciando atualização de post ===');
    console.log('ID do Firestore:', req.params.id);
    console.log('Usuário:', req.user._id);
    console.log('Dados recebidos:', req.body);

    const { description } = req.body;

    // Busca o post pelo ID do Firestore
    const post = await Post.findOne({
      firestoreId: req.params.id,
      userId: req.user._id
    });

    if (!post) {
      console.log('Post não encontrado ou sem permissão');
      return res.status(404).json({
        error: 'Post não encontrado ou sem permissão para editar',
        code: 'POST_NOT_FOUND'
      });
    }

    console.log('Post encontrado:', {
      id: post._id,
      firestoreId: post.firestoreId,
      userId: post.userId,
      description: post.description
    });

    // Atualiza a descrição
    post.description = description;
    await post.save();

    console.log('Post atualizado com sucesso');

    res.json({
      message: 'Post atualizado com sucesso',
      code: 'POST_UPDATED',
      post: {
        id: post._id,
        firestoreId: post.firestoreId,
        description: post.description,
        imageUrl: post.imageUrl,
        likes: post.likes,
        createdAt: post.createdAt
      }
    });

  } catch (error: any) {
    console.error('Erro detalhado ao atualizar post:', error);
    res.status(500).json({
      error: 'Erro ao atualizar post',
      code: 'POST_UPDATE_ERROR',
      details: {
        message: error?.message || 'Erro desconhecido',
        type: error?.name,
        path: error?.path
      }
    });
  }
}; 