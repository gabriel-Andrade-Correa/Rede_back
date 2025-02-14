import { Request, Response } from 'express';
import { Media } from '../models/Media';
import mongoose from 'mongoose';
import sharp from 'sharp';

// Upload de mídia
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    // Validação do arquivo
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Nenhum arquivo enviado.',
        code: 'UPLOAD_NO_FILE'
      });
    }

    // Validação do tipo
    const { type = 'post', metadata: metadataStr } = req.body;
    if (!['profile', 'post', 'feed'].includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo de mídia inválido. Use: profile, post ou feed',
        code: 'UPLOAD_INVALID_TYPE'
      });
    }

    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (err) {
        return res.status(400).json({ 
          error: 'Formato de metadata inválido. Deve ser um JSON válido.',
          code: 'UPLOAD_INVALID_METADATA'
        });
      }
    }

    // Processamento da imagem com sharp
    const image = sharp(req.file.buffer);
    const imageMetadata = await image.metadata();

    // Redimensiona imagens muito grandes
    if (imageMetadata.width && imageMetadata.width > 2048) {
      image.resize(2048, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Converte para JPEG e otimiza
    const processedImageBuffer = await image
      .jpeg({ quality: 80 })
      .toBuffer();

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

    // Retorna resposta sem incluir o buffer da imagem
    res.status(201).json({
      id: media._id,
      type: media.type,
      mimeType: media.mimeType,
      createdAt: media.createdAt,
      metadata: media.metadata,
      url: `/api/media/${media._id}` // URL para acessar a imagem
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
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ 
        error: 'Mídia não encontrada.',
        code: 'MEDIA_NOT_FOUND'
      });
    }

    // Configuração de cache
    res.set('Cache-Control', 'public, max-age=31557600'); // 1 ano
    res.set('Content-Type', media.mimeType);
    res.send(media.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar mídia.',
      code: 'MEDIA_SERVER_ERROR'
    });
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