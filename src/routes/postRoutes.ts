import { Router } from 'express';
import { createPost, getPosts, getPost, updateLikes, deletePost, updatePost, checkLike } from '../controllers/postController';
import { auth } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas de posts
router.post('/', createPost);
router.get('/', getPosts);
router.get('/:id', getPost);
router.post('/:id/like', updateLikes);
router.get('/:id/like', checkLike);
router.delete('/:id', deletePost);
router.put('/:id', updatePost);

export default router; 