import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import mediaRoutes from './routes/mediaRoutes';
import postRoutes from './routes/postRoutes';
import userRoutes from './routes/userRoutes';

// Configuração das variáveis de ambiente
dotenv.config();

// Criação da aplicação Express
const app = express();

// Configuração do servidor HTTP e Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? '*' // Permite qualquer origem em desenvolvimento
      : ['https://seu-app.com'], // URL do app em produção
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
});

// Middlewares
app.use((req, res, next) => {
  // Não loga requisições de mídia para reduzir ruído
  if (!req.url.startsWith('/api/media/')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? '*' // Permite qualquer origem em desenvolvimento
    : ['https://seu-app.com'], // URL do app em produção
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: true
}));

// Configurar headers padrão para todas as respostas
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    const allowedOrigins = ['https://seu-app.com'];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  
  // Responder imediatamente a requisições OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Configuração do MongoDB
const mongooseOptions = {
  serverApi: {
    version: "1" as const,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 60000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 50,
  wtimeoutMS: 2500,
  serverSelectionTimeoutMS: 60000,
  heartbeatFrequencyMS: 1000,
  family: 4 // Force IPv4
};

// Conexão com o MongoDB Atlas
console.log('Tentando conectar ao MongoDB Atlas...');
console.log('URI:', process.env.MONGODB_URI?.split('@')[1]); // Log seguro da URI (sem credenciais)

mongoose.connect(process.env.MONGODB_URI!, mongooseOptions)
  .then(() => {
    console.log('Conectado ao MongoDB Atlas com sucesso!');
  })
  .catch((error) => {
    console.error('Erro ao conectar ao MongoDB:', error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\nDicas de solução:');
      console.log('1. Verifique se seu IP está na lista de IPs permitidos no MongoDB Atlas:');
      console.log('   - Acesse https://cloud.mongodb.com');
      console.log('   - Vá em "Network Access"');
      console.log('   - Clique em "+ ADD IP ADDRESS"');
      console.log('   - Adicione seu IP atual ou 0.0.0.0/0 para testes');
      console.log('\n2. Verifique se as credenciais estão corretas no arquivo .env');
      console.log('\n3. Verifique se o cluster está ativo no MongoDB Atlas');
    }
    process.exit(1);
  });

// Configuração básica do Socket.io
io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
  });
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// Inicialização do servidor
const PORT = Number(process.env.PORT) || 3000;

// Configurar o servidor para ouvir em todas as interfaces
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT} e aceitando conexões de qualquer IP`);
}); 