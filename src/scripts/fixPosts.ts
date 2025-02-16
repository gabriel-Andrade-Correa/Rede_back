import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

async function fixPosts() {
    try {
        console.log('Conectando ao MongoDB...');
        await client.connect();
        
        const database = client.db();
        const postsCollection = database.collection('posts');
        const mediaCollection = database.collection('media');

        // Busca todos os posts
        const posts = await postsCollection.find({}).toArray();
        console.log(`\nEncontrados ${posts.length} posts no total.`);

        let postsCorrigidos = 0;
        let postsRemovidos = 0;
        let postsNaoAlterados = 0;

        for (const post of posts) {
            let needsUpdate = false;
            let shouldDelete = false;
            let newImageUrl = post.imageUrl;

            console.log(`\nAnalisando post ${post._id}:`);
            console.log(`URL atual: ${post.imageUrl}`);

            // Caso 1: URL indefinida
            if (!post.imageUrl) {
                console.log(`- URL indefinida, marcando para remoção`);
                shouldDelete = true;
            }
            // Caso 2: URL é apenas um ID
            else if (!post.imageUrl.includes('/') && ObjectId.isValid(post.imageUrl)) {
                console.log(`- URL é apenas um ID, convertendo para formato correto`);
                newImageUrl = `/api/media/${post.imageUrl}`;
                needsUpdate = true;
            }
            // Caso 3: URL duplicada
            else if (post.imageUrl.includes('/api/media/') && post.imageUrl.indexOf('/api/media/') !== post.imageUrl.lastIndexOf('/api/media/')) {
                console.log(`- URL duplicada, corrigindo`);
                const matches = post.imageUrl.match(/\/api\/media\/([a-f\d]{24})/i);
                if (matches && matches[1]) {
                    newImageUrl = `/api/media/${matches[1]}`;
                    needsUpdate = true;
                }
            }
            // Caso 4: URL com domínio
            else if (post.imageUrl.includes('http://') || post.imageUrl.includes('https://')) {
                console.log(`- URL com domínio, removendo`);
                const matches = post.imageUrl.match(/\/api\/media\/([a-f\d]{24})/i);
                if (matches && matches[1]) {
                    newImageUrl = `/api/media/${matches[1]}`;
                    needsUpdate = true;
                }
            }

            // Verifica se a mídia existe
            if (!shouldDelete && newImageUrl) {
                const mediaId = newImageUrl.split('/api/media/')[1];
                if (mediaId) {
                    const mediaExists = await mediaCollection.findOne({ 
                        _id: new ObjectId(mediaId)
                    });
                    
                    if (!mediaExists) {
                        console.log(`- Mídia ${mediaId} não encontrada, marcando post para remoção`);
                        shouldDelete = true;
                    }
                }
            }

            if (shouldDelete) {
                console.log(`Removendo post ${post._id}`);
                await postsCollection.deleteOne({ _id: post._id });
                postsRemovidos++;
            }
            else if (needsUpdate) {
                console.log(`Atualizando post ${post._id} com nova URL: ${newImageUrl}`);
                await postsCollection.updateOne(
                    { _id: post._id },
                    { $set: { imageUrl: newImageUrl } }
                );
                postsCorrigidos++;
            }
            else {
                console.log(`Post ${post._id} não precisa de alterações`);
                postsNaoAlterados++;
            }
        }

        console.log('\n=== Resultado ===');
        console.log(`Posts corrigidos: ${postsCorrigidos}`);
        console.log(`Posts removidos: ${postsRemovidos}`);
        console.log(`Posts não alterados: ${postsNaoAlterados}`);

        console.log('\n=== Instruções para o Frontend ===');
        console.log('1. Certifique-se de que todas as requisições para /api/media incluam o token de autenticação');
        console.log('2. Use URLs relativas (/api/media/...) em vez de URLs absolutas');
        console.log('3. Adicione tratamento para URLs indefinidas');
        console.log('4. Exemplo de código para o frontend:');
        console.log(`
    // Função para formatar URL da mídia
    const formatMediaUrl = (url) => {
        if (!url) return null;

        // Se já é uma URL relativa, retorna como está
        if (url.startsWith('/api/media/')) return url;

        // Se é apenas um ID, converte para URL relativa
        if (!url.includes('/')) return \`/api/media/\${url}\`;

        // Remove o domínio se presente
        return url.replace(/http:\/\/.*?\/api\/media\//g, '/api/media/');
    };

    // Exemplo de uso ao exibir uma imagem:
    <Image
        source={{
            uri: formatMediaUrl(post.imageUrl),
            headers: {
                Authorization: \`Bearer \${token}\`
            }
        }}
        onError={(error) => console.log('Erro ao carregar imagem:', error)}
    />
`);

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await client.close();
        console.log('\nConexão fechada');
    }
}

// Executa o script
console.log('Iniciando correção dos posts...');
fixPosts(); 