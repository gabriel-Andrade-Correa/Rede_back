import * as admin from 'firebase-admin';
import * as serviceAccount from '../config/firebase-service-account.json';

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

async function generateTestToken() {
  try {
    // Usando o UID real do seu usuário
    const uid = 'YRR8lbXYA7hoN1G2SCDf2xyg3Ol2'; // UID completo e correto
    
    // Gerar token customizado
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('\nToken customizado gerado com sucesso!');
    console.log('\nPrimeiro, troque este token por um ID token:');
    console.log('\ncurl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyC4HD1BrrnB04aiKzXbkTcpABLQL2f5i44" \\');
    console.log('-H "Content-Type: application/json" \\');
    console.log(`--data '{"token":"${customToken}","returnSecureToken":true}'`);
    
    console.log('\nDepois, use o "idToken" retornado na resposta para fazer as requisições à API:');
    console.log('\ncurl -X GET http://localhost:3000/api/media/user/123 \\');
    console.log('-H "Authorization: Bearer SEU_ID_TOKEN"\n');
  } catch (error) {
    console.error('Erro ao gerar token:', error);
  } finally {
    process.exit();
  }
}

generateTestToken(); 