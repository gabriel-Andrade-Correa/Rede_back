import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { User } from '../models/User';
import * as serviceAccount from '../config/firebase-service-account.json';

// Verificar se o Firebase já foi inicializado
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key
      }),
    });
    
    console.log('Firebase Admin SDK inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error);
    throw error;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
      firebaseUser?: admin.auth.DecodedIdToken;
    }
  }
}

interface FirebaseError extends Error {
  code?: string;
  message: string;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Iniciando verificação de autenticação...');
    
    // Verifica se o header de autorização existe
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      console.log('Header de autorização não encontrado');
      return res.status(401).json({ 
        error: 'Token não fornecido.',
        code: 'AUTH_NO_TOKEN'
      });
    }

    // Verifica se o formato do token está correto
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Formato do header de autorização inválido');
      return res.status(401).json({ 
        error: 'Formato de token inválido. Use: Bearer <token>',
        code: 'AUTH_INVALID_FORMAT'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extraído do header');

    try {
      console.log('Tentando verificar o token...');
      // Verifica o token do Firebase com opções específicas
      const decodedToken = await admin.auth().verifyIdToken(token, true);
      console.log('Token verificado com sucesso:', decodedToken);
      
      // Busca o usuário no banco
      console.log('Buscando usuário no banco de dados...');
      let user = await User.findOne({ firebaseUid: decodedToken.uid });
      
      // Se o usuário não existir, cria um novo
      if (!user) {
        console.log('Usuário não encontrado, criando novo usuário...');
        user = await User.create({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email?.split('@')[0],
          // outros campos podem ser preenchidos depois
        });
        console.log('Novo usuário criado:', user);
      } else {
        console.log('Usuário encontrado:', user);
      }

      // Adiciona as informações à requisição
      req.user = user;
      req.token = token;
      req.firebaseUser = decodedToken;
      console.log('Autenticação concluída com sucesso');
      next();
    } catch (err) {
      const firebaseError = err as FirebaseError;
      console.error('Erro detalhado ao verificar token:', firebaseError);
      return res.status(401).json({ 
        error: 'Token inválido ou expirado.',
        code: 'AUTH_INVALID_TOKEN',
        details: firebaseError.message
      });
    }
  } catch (error) {
    const serverError = error as FirebaseError;
    console.error('Erro no middleware de autenticação:', serverError);
    res.status(500).json({ 
      error: 'Erro interno no servidor durante autenticação.',
      code: 'AUTH_SERVER_ERROR',
      details: serverError.message
    });
  }
};