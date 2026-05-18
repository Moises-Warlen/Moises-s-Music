const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use a variável correta: MONGODB_URI
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error("❌ MONGODB_URI não configurada no arquivo .env");
      console.log("Exemplo: MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/banco");
      process.exit(1);
    }

    console.log("🔄 Conectando ao MongoDB...");
    
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    console.log(`📚 Banco de dados: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ Erro ao conectar MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;