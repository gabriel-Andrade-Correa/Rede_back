import multer from 'multer';

// Configuração do Multer para armazenar arquivos na memória
const storage = multer.memoryStorage();

// Configuração do upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('Recebendo arquivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Aceita qualquer tipo de imagem
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
});

export default upload; 