import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

async function viewDatabase() {
    try {
        console.log('Conectando ao MongoDB...');
        await client.connect();
        
        const database = client.db();
        
        // Lista todas as coleções
        const collections = await database.listCollections().toArray();
        console.log('\nColeções disponíveis:');
        collections.forEach(collection => console.log(`- ${collection.name}`));

        // Para cada coleção, mostra alguns documentos
        for (const collection of collections) {
            console.log(`\n=== Documentos da coleção ${collection.name} ===`);
            const documents = await database.collection(collection.name)
                .find({})
                .limit(5) // Limita a 5 documentos por coleção
                .toArray();

            documents.forEach(doc => {
                // Remove o buffer de dados das imagens para não poluir o console
                if (doc.data && Buffer.isBuffer(doc.data)) {
                    doc.data = '[Buffer dados binários]';
                }
                console.log(JSON.stringify(doc, null, 2));
            });

            const total = await database.collection(collection.name).countDocuments();
            console.log(`Total de documentos: ${total}`);
        }

    } catch (error) {
        console.error('Erro ao acessar banco de dados:', error);
    } finally {
        await client.close();
        console.log('\nConexão fechada');
    }
}

// Executa o script
console.log('Iniciando visualização do banco de dados...');
viewDatabase().catch(console.error); 