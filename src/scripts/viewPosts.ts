import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

async function viewPosts() {
    try {
        console.log('Conectando ao MongoDB...');
        await client.connect();
        
        const database = client.db();
        const postsCollection = database.collection('posts');
        const usersCollection = database.collection('users');

        // Busca todos os posts com informações do usuário
        const posts = await postsCollection.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 1,
                    description: 1,
                    imageUrl: 1,
                    likes: 1,
                    createdAt: 1,
                    'user.name': 1,
                    'user.email': 1
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]).toArray();

        console.log('\n=== Posts encontrados ===');
        posts.forEach(post => {
            console.log('\n-------------------');
            console.log(`ID: ${post._id}`);
            console.log(`Usuário: ${post.user.name} (${post.user.email})`);
            console.log(`Descrição: ${post.description}`);
            console.log(`Imagem: ${post.imageUrl}`);
            console.log(`Likes: ${post.likes}`);
            console.log(`Criado em: ${post.createdAt}`);
        });

        console.log(`\nTotal de posts: ${posts.length}`);

    } catch (error) {
        console.error('Erro ao acessar posts:', error);
    } finally {
        await client.close();
        console.log('\nConexão fechada');
    }
}

// Executa o script
console.log('Iniciando visualização dos posts...');
viewPosts().catch(console.error); 