import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';

dotenv.config();

const app = express();
const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

// Configurações do Express
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota de teste para verificar se o servidor está funcionando
app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});

// Rota principal que mostra a interface
app.get('/', async (req, res) => {
    try {
        await client.connect();
        const database = client.db();
        const collections = await database.listCollections().toArray();
        
        // Início do HTML
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Visualizador do Banco de Dados</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .collection { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }
                .document { margin: 10px 0; padding: 10px; background: #f5f5f5; }
                .media-preview { max-width: 200px; max-height: 200px; }
                .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
                .tab { padding: 10px; cursor: pointer; border: 1px solid #ccc; }
                .tab.active { background: #007bff; color: white; }
                .collection-content { display: none; }
                .collection-content.active { display: block; }
                .user-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
                .post-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
                .post-image { max-width: 300px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>Visualizador do Banco de Dados</h1>
            <div class="tabs">
        `;

        // Adiciona tabs para cada coleção
        collections.forEach((collection, index) => {
            html += `
                <div class="tab ${index === 0 ? 'active' : ''}" 
                     onclick="showCollection('${collection.name}')">
                    ${collection.name}
                </div>
            `;
        });

        html += `</div>`;

        // Adiciona conteúdo de cada coleção
        for (const [index, collection] of collections.entries()) {
            const documents = await database.collection(collection.name)
                .find({})
                .limit(10)
                .toArray();

            html += `
            <div class="collection-content ${index === 0 ? 'active' : ''}" 
                 id="${collection.name}">
                <h2>Coleção: ${collection.name}</h2>
            `;

            documents.forEach(doc => {
                if (collection.name === 'media') {
                    // Renderiza documentos de mídia
                    html += `
                    <div class="document">
                        <p>ID: ${doc._id}</p>
                        <p>Tipo: ${doc.type}</p>
                        <p>Usuário: ${doc.userId}</p>
                        <img class="media-preview" 
                             src="/api/media/${doc._id}" 
                             onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAQlBMVEX///+hoaGdnZ2ampqXl5eUlJSRkZGOjo7x8fHt7e3p6ens7Oz19fX39/f7+/vl5eXi4uLe3t7b29vY2NjV1dXR0dF1c073AAAC50lEQVR4nO2b63KrIBRGFY1CY4x5/1c9RNS0ntZGYQs9s75fM50Z4cNc2Rcwvx4PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8I/yY1NFMAxBVDcLv3Qqn67v8WqOL4dxGN+OWbY9Wvd1/yJ1PaFfUsZV0TbN0qE1K4u4lK/Ea1eMR+bJzRQn+yw+3G9tnE5Ec4hVIz+WQHaMGw9Sj1yZvyuDs6dI+9H8iHF6v1LhLklV+6UB0aiXiTQwVqMZxG4zLWRF0oxmWGhQiQu+WdE0t5UGRSIv+GZFk9xWGjSRvOCbFU1zW2lQCwxmRVPdVhpkEoNZ0VS3lQaVxGBWNNVtpYHIYFb0XbfzBvq/QZpbYhB9aPBuIDF41+1sg7qQGMy7neX2bBAKDObdznJ7NhgFBvNuZ7k9G0TLXECzfBbNcns2aOXv8Ioj2e2zQXLMHHR0JLt9NigFBvNuZ7k9G4gM5t3OcvtsIDGYdzvL7cVAYDDvdpbbiwH/HZ53O8vtxaDhG8y7neX2YsB/yLNuZ7m9GBT8p1zDQG7A76PZXe61wYS9vWC4vTGQGGS4vTHgP0UZbm8MJAZpbm8MJAZpbm8MJH108mKQ5PbGQNJJZy8GSW5vDPhddPpikOL2xkDSyxOsX7i9MZD0E9nrZ67bGwNJT5u9IOK6vTGQ9PXZ60Ou2xsDSW+BvUDmur0x4Pc3yWthptsrg4DdY+evyVlurwz4fV7+spLl9sqA3+vnL+xZbq8M+Ocx/BM1ltsrA/6JIv9Mk+X2yoB/qs0/l2e5vTLgn23wLzc4bq8M+NdL/AsujtsrA/4VH/+Sk+P2yoB/zcu/aGa5vTLgX7Xzr/s5bq8M+D8b8H/4wHF7ZcD/6QbD7ZUB/8cnDLdXBvwfEDHcXhnwf4KV7vbKgP+jsXS3lwb8n72lu70yMPDfQqS6vTQw8N+jpLm9NjDw38Skub02MPDfJaW5vTYw8N+GpbkFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4Hf5C1IBqyFsHYoGAAAAAElFTkSuQmCC'">
                    </div>
                    `;
                } else if (collection.name === 'posts') {
                    // Renderiza posts
                    html += `
                    <div class="post-card">
                        <p><strong>ID:</strong> ${doc._id}</p>
                        <p><strong>Usuário:</strong> ${doc.userId}</p>
                        <p><strong>Descrição:</strong> ${doc.description || 'Sem descrição'}</p>
                        <p><strong>Likes:</strong> ${doc.likes}</p>
                        <img class="post-image" 
                             src="${doc.imageUrl}" 
                             onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAQlBMVEX///+hoaGdnZ2ampqXl5eUlJSRkZGOjo7x8fHt7e3p6ens7Oz19fX39/f7+/vl5eXi4uLe3t7b29vY2NjV1dXR0dF1c073AAAC50lEQVR4nO2b63KrIBRGFY1CY4x5/1c9RNS0ntZGYQs9s75fM50Z4cNc2Rcwvx4PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8I/yY1NFMAxBVDcLv3Qqn67v8WqOL4dxGN+OWbY9Wvd1/yJ1PaFfUsZV0TbN0qE1K4u4lK/Ea1eMR+bJzRQn+yw+3G9tnE5Ec4hVIz+WQHaMGw9Sj1yZvyuDs6dI+9H8iHF6v1LhLklV+6UB0aiXiTQwVqMZxG4zLWRF0oxmWGhQiQu+WdE0t5UGRSIv+GZFk9xWGjSRvOCbFU1zW2lQCwxmRVPdVhpkEoNZ0VS3lQaVxGBWNNVtpYHIYFb0XbfzBvq/QZpbYhB9aPBuIDF41+1sg7qQGMy7neX2bBAKDObdznJ7NhgFBvNuZ7k9G0TLXECzfBbNcns2aOXv8Ioj2e2zQXLMHHR0JLt9NigFBvNuZ7k9G4gM5t3OcvtsIDGYdzvL7cVAYDDvdpbbiwH/HZ53O8vtxaDhG8y7neX2YsB/yLNuZ7m9GBT8p1zDQG7A76PZXe61wYS9vWC4vTGQGGS4vTHgP0UZbm8MJAZpbm8MJAZpbm8MJH108mKQ5PbGQNJJZy8GSW5vDPhddPpikOL2xkDSyxOsX7i9MZD0E9nrZ67bGwNJT5u9IOK6vTGQ9PXZ60Ou2xsDSW+BvUDmur0x4Pc3yWthptsrg4DdY+evyVlurwz4fV7+spLl9sqA3+vnL+xZbq8M+Ocx/BM1ltsrA/6JIv9Mk+X2yoB/qs0/l2e5vTLgn23wLzc4bq8M+NdL/AsujtsrA/4VH/+Sk+P2yoB/zcu/aGa5vTLgX7Xzr/s5bq8M+D8b8H/4wHF7ZcD/6QbD7ZUB/8cnDLdXBvwfEDHcXhnwf4KV7vbKgP+jsXS3lwb8n72lu70yMPDfQqS6vTQw8N+jpLm9NjDw38Skub02MPDfJaW5vTYw8N+GpbkFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4Hf5C1IBqyFsHYoGAAAAAElFTkSuQmCC'">
                    </div>
                    `;
                } else if (collection.name === 'users') {
                    // Renderiza usuários
                    html += `
                    <div class="user-card">
                        <p><strong>ID:</strong> ${doc._id}</p>
                        <p><strong>Nome:</strong> ${doc.name}</p>
                        <p><strong>Email:</strong> ${doc.email}</p>
                        <p><strong>Firebase UID:</strong> ${doc.firebaseUid}</p>
                    </div>
                    `;
                } else {
                    // Renderiza outros documentos
                    html += `
                    <div class="document">
                        <pre>${JSON.stringify(doc, null, 2)}</pre>
                    </div>
                    `;
                }
            });

            const total = await database.collection(collection.name).countDocuments();
            html += `<p>Total de documentos: ${total}</p></div>`;
        }

        // Adiciona JavaScript para controlar as tabs
        html += `
            <script>
                function showCollection(name) {
                    // Esconde todas as coleções
                    document.querySelectorAll('.collection-content').forEach(el => {
                        el.classList.remove('active');
                    });
                    // Remove active de todas as tabs
                    document.querySelectorAll('.tab').forEach(el => {
                        el.classList.remove('active');
                    });
                    // Mostra a coleção selecionada
                    document.getElementById(name).classList.add('active');
                    // Ativa a tab selecionada
                    document.querySelector('.tab[onclick*="' + name + '"]').classList.add('active');
                }
            </script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).send('Erro ao acessar banco de dados: ' + errorMessage);
    }
});

// Inicia o servidor
const port = 3002;
const host = '0.0.0.0'; // Permite conexões de qualquer IP

app.listen(port, host, () => {
    console.log(`Servidor rodando em:`);
    console.log(`- Local: http://localhost:${port}`);
    console.log(`- Rede: http://${host}:${port}`);
    console.log('Pressione Ctrl+C para parar');
}); 