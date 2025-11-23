const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  try {
    // Tentar conectar ao MongoDB local primeiro
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/globo-clone';
    
    try {
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 3000
      });
      console.log('✅ MongoDB local conectado com sucesso!');
      return;
    } catch (localError) {
      console.log('⚠️  MongoDB local não encontrado. Usando MongoDB em memória...');
      
      // Se falhar, usar MongoDB em memória
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log('✅ MongoDB em memória iniciado com sucesso!');
      console.log('💡 Para usar MongoDB permanente, instale: https://www.mongodb.com/try/download/community');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Erro ao desconectar:', error);
  }
};

module.exports = { connectDB, disconnectDB };
