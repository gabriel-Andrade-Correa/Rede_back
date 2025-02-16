import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

// Interface para interação com o usuário
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function cleanMedia() {
    try {
        console.log('Conectando ao MongoDB...');
        await client.connect();
        
        const database = client.db();
        const mediaCollection = database.collection('media');
        const postsCollection = database.collection('posts');

        // Conta total de mídias
        const totalMedia = await mediaCollection.countDocuments();
        const totalPosts = await postsCollection.countDocuments();
        const totalSize = await mediaCollection.aggregate([
            {
                $group: {
                    _id: null,
                    totalSize: {
                        $sum: {
                            $binarySize: "$data"
                        }
                    }
                }
            }
        ]).toArray();

        const sizeMB = (totalSize[0]?.totalSize || 0) / (1024 * 1024);

        console.log(`\n=== Status Atual ===`);
        console.log(`Total de mídias: ${totalMedia}`);
        console.log(`Total de posts: ${totalPosts}`);
        console.log(`Espaço utilizado: ${sizeMB.toFixed(2)} MB`);

        // Lista tipos de mídia
        const mediaTypes = await mediaCollection.distinct('type');
        console.log('\nTipos de mídia encontrados:');
        mediaTypes.forEach(type => {
            console.log(`- ${type}`);
        });

        // Pergunta ao usuário o que deseja fazer
        console.log('\nOpções:');
        console.log('1. Apagar todas as mídias (mantém posts)');
        console.log('2. Apagar mídias por tipo (mantém posts)');
        console.log('3. Sair sem fazer alterações');

        rl.question('\nEscolha uma opção (1-3): ', async (answer) => {
            switch(answer.trim()) {
                case '1':
                    rl.question('Tem certeza que deseja apagar TODAS as mídias? (sim/não): ', async (confirm) => {
                        if (confirm.toLowerCase() === 'sim') {
                            console.log('Apagando todas as mídias...');
                            
                            // Primeiro, marca os posts que serão afetados
                            const mediaIds = await mediaCollection.distinct('_id');
                            await postsCollection.updateMany(
                                { imageUrl: { $regex: /\/api\/media\// } },
                                { $set: { imageUrl: null, needsNewImage: true } }
                            );
                            
                            // Depois apaga as mídias
                            const result = await mediaCollection.deleteMany({});
                            console.log(`${result.deletedCount} mídias foram apagadas.`);
                            console.log('Posts foram marcados para atualização de imagem.');
                        } else {
                            console.log('Operação cancelada.');
                        }
                        await client.close();
                        rl.close();
                    });
                    break;

                case '2':
                    rl.question(`Digite o tipo de mídia para apagar (${mediaTypes.join(', ')}): `, async (type) => {
                        if (mediaTypes.includes(type)) {
                            rl.question(`Tem certeza que deseja apagar todas as mídias do tipo '${type}'? (sim/não): `, async (confirm) => {
                                if (confirm.toLowerCase() === 'sim') {
                                    console.log(`Apagando mídias do tipo '${type}'...`);
                                    
                                    // Primeiro, marca os posts que serão afetados
                                    const mediaIds = await mediaCollection.distinct('_id', { type });
                                    await postsCollection.updateMany(
                                        { imageUrl: { $regex: /\/api\/media\// } },
                                        { $set: { imageUrl: null, needsNewImage: true } }
                                    );
                                    
                                    // Depois apaga as mídias
                                    const result = await mediaCollection.deleteMany({ type });
                                    console.log(`${result.deletedCount} mídias foram apagadas.`);
                                    console.log('Posts afetados foram marcados para atualização de imagem.');
                                } else {
                                    console.log('Operação cancelada.');
                                }
                                await client.close();
                                rl.close();
                            });
                        } else {
                            console.log('Tipo de mídia inválido.');
                            await client.close();
                            rl.close();
                        }
                    });
                    break;

                case '3':
                default:
                    console.log('Saindo sem fazer alterações.');
                    await client.close();
                    rl.close();
                    break;
            }
        });

    } catch (error) {
        console.error('Erro:', error);
        await client.close();
        rl.close();
    }
}

// Executa o script
console.log('Iniciando limpeza de mídias...');
cleanMedia(); 