interface FirebaseAuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered: boolean;
  error?: {
    code: number;
    message: string;
  };
}

// Script para fazer login com email e senha no Firebase
const loginWithPassword = async () => {
  const email = 'gabrielandradecorreabiel@outlook.com';
  const password = 'Gabrielcorrea15';

  try {
    const response = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyC4HD1BrrnB04aiKzXbkTcpABLQL2f5i44',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json() as FirebaseAuthResponse;
    
    if (data.error) {
      console.error('Erro ao fazer login:', data.error);
      return;
    }

    console.log('\nLogin realizado com sucesso!');
    console.log('\nUse este token para fazer as requisições à API:');
    console.log('\ncurl -X GET http://localhost:3000/api/media/user/123 \\');
    console.log(`-H "Authorization: Bearer ${data.idToken}"\n`);

  } catch (error) {
    console.error('Erro ao fazer requisição:', error);
  }
};

loginWithPassword(); 