# Backend do Aplicativo de Relacionamento

Backend em Node.js com TypeScript para um aplicativo de relacionamento.

## Tecnologias Utilizadas

- Node.js
- TypeScript
- Express
- MongoDB com Mongoose
- JWT para autenticação
- Socket.io para chat em tempo real
- Multer para upload de imagens

## Pré-requisitos

- Node.js (versão 14 ou superior)
- MongoDB instalado e rodando localmente
- NPM ou Yarn

## Instalação

1. Clone o repositório:
```bash
git clone [url-do-repositorio]
cd [nome-do-diretorio]
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
- Crie um arquivo `.env` na raiz do projeto
- Copie o conteúdo de `.env.example` (se existir) ou configure as seguintes variáveis:
  ```
  PORT=3000
  MONGODB_URI=mongodb://localhost:27017/dating-app
  JWT_SECRET=seu_jwt_secret_aqui
  JWT_EXPIRES_IN=7d
  NODE_ENV=development
  ```

## Executando o Projeto

1. Para desenvolvimento:
```bash
npm run dev
```

2. Para produção:
```bash
npm run build
npm start
```

## Rotas da API

### Autenticação

- POST `/api/auth/register` - Registro de novo usuário
  ```json
  {
    "name": "Nome Completo",
    "email": "email@exemplo.com",
    "password": "senha123",
    "birthDate": "1990-01-01",
    "gender": "male"
  }
  ```

- POST `/api/auth/login` - Login de usuário
  ```json
  {
    "email": "email@exemplo.com",
    "password": "senha123"
  }
  ```

## Estrutura do Projeto

```
src/
  ├── config/           // Configurações do app
  ├── models/           // Modelos do Mongoose
  ├── controllers/      // Controladores da API
  ├── routes/           // Rotas da API
  ├── middlewares/      // Middlewares (auth, etc)
  ├── services/         // Lógica de negócio
  └── utils/            // Funções utilitárias
```

## Funcionalidades Implementadas

- [x] Autenticação (registro/login)
- [ ] CRUD de perfil de usuário
- [ ] Upload e gerenciamento de fotos
- [ ] Feed de posts
- [ ] Sistema de matches
- [ ] Chat entre usuários

## Próximos Passos

1. Implementar CRUD completo do perfil de usuário
2. Adicionar upload de imagens com Multer
3. Desenvolver sistema de matches
4. Implementar chat em tempo real
5. Adicionar validações e tratamento de erros
6. Implementar testes unitários e de integração 