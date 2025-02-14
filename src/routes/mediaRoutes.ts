import { Router } from 'express';
import { uploadMedia, getMedia, getUserMedia, deleteMedia } from '../controllers/mediaController';
import { auth } from '../middlewares/auth';
import upload from '../middlewares/upload';

const router = Router();

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas de mídia
// No backend
router.post('/media/upload', upload.single('file'), async (req, res) => {
    try {
        console.log("chegou");
      const file = req.file; // arquivo enviado
      const { type, userId, metadata } = req.body; // outros campos
  
      // Seu código de processamento aqui
  
      res.json({ mediaId: 'id_gerado' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
router.get('/:id', getMedia);
router.get('/user/:userId', getUserMedia);
router.delete('/:id', deleteMedia);

export default router; 