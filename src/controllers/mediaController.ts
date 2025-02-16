import { Request, Response } from 'express';
import { Media } from '../models/Media';
import { User } from '../models/User';
import mongoose from 'mongoose';
import sharp from 'sharp';

// Upload de mídia
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    console.log('Iniciando upload de mídia');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('File:', req.file);

    // Validação do arquivo
    if (!req.file) {
      console.log('Nenhum arquivo recebido');
      return res.status(400).json({ 
        error: 'Nenhum arquivo enviado.',
        code: 'UPLOAD_NO_FILE'
      });
    }

    // Validação do tipo
    const { type = 'post', metadata: metadataStr } = req.body;
    console.log('Tipo de mídia:', type);
    
    if (!['profile', 'post', 'feed'].includes(type)) {
      console.log('Tipo de mídia inválido:', type);
      return res.status(400).json({ 
        error: 'Tipo de mídia inválido. Use: profile, post ou feed',
        code: 'UPLOAD_INVALID_TYPE'
      });
    }

    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
        console.log('Metadata:', metadata);
      } catch (err) {
        console.log('Erro ao parsear metadata:', err);
        return res.status(400).json({ 
          error: 'Formato de metadata inválido. Deve ser um JSON válido.',
          code: 'UPLOAD_INVALID_METADATA'
        });
      }
    }

    // Processamento da imagem com sharp
    const image = sharp(req.file.buffer);
    const imageMetadata = await image.metadata();
    console.log('Metadata da imagem:', imageMetadata);

    // Redimensiona imagens muito grandes
    if (imageMetadata.width && imageMetadata.width > 2048) {
      console.log(`Redimensionando imagem de ${imageMetadata.width}px para 2048px`);
      image.resize(2048, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Converte para JPEG e otimiza
    const processedImageBuffer = await image
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Tamanho da imagem processada:', processedImageBuffer.length, 'bytes');

    // Cria o objeto de mídia
    const media = new Media({
      userId: req.user._id,
      type,
      data: processedImageBuffer,
      mimeType: 'image/jpeg',
      metadata: {
        ...metadata,
        width: imageMetadata.width,
        height: imageMetadata.height,
        size: processedImageBuffer.length,
      }
    });

    await media.save();
    console.log('Mídia salva com ID:', media._id);

    // Se for uma foto de perfil, atualiza o usuário
    if (type === 'profile') {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { photos: media._id }
      });
      console.log('Foto de perfil atualizada para o usuário:', req.user._id);
    }

    const mediaUrl = `/api/media/${media._id}`;
    console.log('URL da mídia:', mediaUrl);

    // Retorna resposta sem incluir o buffer da imagem
    res.status(201).json({
      id: media._id,
      type: media.type,
      mimeType: media.mimeType,
      createdAt: media.createdAt,
      metadata: media.metadata,
      url: mediaUrl
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      error: 'Erro ao processar upload da mídia.',
      code: 'UPLOAD_SERVER_ERROR'
    });
  }
};

// Buscar mídia específica
export const getMedia = async (req: Request, res: Response) => {
  try {
    // Log detalhado para debug
    console.log('=== Início da requisição getMedia ===');
    console.log('ID da mídia:', req.params.id);
    console.log('Headers recebidos:', JSON.stringify(req.headers, null, 2));
    console.log('Método:', req.method);
    console.log('Usuário autenticado:', req.user ? 'Sim' : 'Não');

    // Verifica se o ID é válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('ID inválido:', req.params.id);
      return res.status(400).json({
        error: 'ID de mídia inválido',
        code: 'MEDIA_INVALID_ID'
      });
    }

    // Busca a mídia
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      console.log('Mídia não encontrada:', req.params.id);
      return res.status(404).json({ 
        error: 'Mídia não encontrada.',
        code: 'MEDIA_NOT_FOUND'
      });
    }

    // Verifica autenticação apenas para mídias privadas (profile)
    if (media.type === 'profile' && !req.user) {
      console.log('Tentativa de acesso não autorizado a mídia privada');
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'AUTH_REQUIRED'
      });
    }

    // Log da mídia encontrada
    console.log('Mídia encontrada:', {
      id: media._id,
      type: media.type,
      userId: media.userId,
      size: media.data.length,
      isPublic: ['post', 'feed'].includes(media.type)
    });

    // Configuração simplificada de headers
    const headers = {
      'Content-Type': media.mimeType,
      'Content-Length': String(media.data.length),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': media.type === 'profile' ? 'private, no-cache' : 'public, max-age=31536000',
      'Pragma': media.type === 'profile' ? 'no-cache' : 'public',
      'Expires': media.type === 'profile' ? '0' : new Date(Date.now() + 31536000000).toUTCString() // 1 ano
    };

    // Aplica os headers
    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    console.log('Headers configurados:', headers);

    // Se for OPTIONS, retorna 200 OK
    if (req.method === 'OPTIONS') {
      console.log('Requisição OPTIONS - retornando 200');
      return res.status(200).end();
    }

    // Envia a mídia
    console.log('Enviando mídia...');
    res.status(200).send(media.data);
    console.log('Mídia enviada com sucesso');

  } catch (error: any) {
    console.error('Erro ao buscar mídia:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar mídia.',
      code: 'MEDIA_SERVER_ERROR',
      details: error?.message || 'Erro desconhecido'
    });
  } finally {
    console.log('=== Fim da requisição getMedia ===');
  }
};

// Buscar todas as mídias de um usuário
export const getUserMedia = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'ID de usuário inválido.',
        code: 'MEDIA_INVALID_USER_ID'
      });
    }

    const query: any = { userId };
    if (type && ['profile', 'post', 'feed'].includes(type as string)) {
      query.type = type;
    }

    const media = await Media.find(query)
      .select('-data') // Exclui o campo data para reduzir o tamanho da resposta
      .sort({ createdAt: -1 });

    res.json(media.map(m => ({
      ...m.toJSON(),
      url: `/api/media/${m._id}`
    })));
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar mídias do usuário.',
      code: 'MEDIA_SERVER_ERROR'
    });
  }
};

// Deletar mídia
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!media) {
      return res.status(404).json({ 
        error: 'Mídia não encontrada ou sem permissão para deletar.',
        code: 'MEDIA_NOT_FOUND'
      });
    }

    await media.deleteOne();
    res.json({ 
      message: 'Mídia deletada com sucesso.',
      code: 'MEDIA_DELETED'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao deletar mídia.',
      code: 'MEDIA_SERVER_ERROR'
    });
  }
}; 