import { Router } from 'express';
import { getUserProfile, searchUsers } from '../controllers/userController';
import { auth } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(auth);

// Buscar usuários por nome (deve vir antes da rota com parâmetro)
router.get('/search', searchUsers);

// Buscar perfil do usuário
router.get('/:id', getUserProfile);

export default router; 