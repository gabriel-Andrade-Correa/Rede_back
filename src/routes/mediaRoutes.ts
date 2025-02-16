import { Router } from 'express';
import multer from 'multer';
import { uploadMedia, getMedia, getUserMedia, deleteMedia } from '../controllers/mediaController';
import { auth } from '../middlewares/auth';
import upload from '../middlewares/upload';

const router = Router();

// Middleware para tratar preflight requests
router.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400' // 24 horas
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Rota de health check (deve vir antes das outras)
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Rotas que precisam de autenticação
router.post('/upload', auth, upload.single('file'), uploadMedia);
router.get('/user/:userId/:type?', auth, getUserMedia);
router.delete('/:id', auth, deleteMedia);

// Rota para buscar mídia específica (autenticação opcional, verificada no controller)
router.get('/:id', async (req, res, next) => {
  try {
    // Tenta autenticar, mas não retorna erro se falhar
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await auth(req, res, () => {});
    }
    next();
  } catch (error) {
    // Ignora erros de autenticação e continua
    next();
  }
}, getMedia);

export default router; 