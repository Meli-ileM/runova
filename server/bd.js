// const mongoose = require('mongoose');
// require('dotenv').config();

// const connectDB = async () => {
//   try {
//     // Configuration pour une BDD locale sans authentification
//     const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://<user>:<password>@<cluster>/';
    
//     await mongoose.connect(mongoURI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     console.log('✅ Connecté à MongoDB local avec succès');

//     mongoose.connection.on('error', err => {
//       console.error('Erreur MongoDB:', err);
//     });

//   } catch (err) {
//     console.error('❌ Échec de connexion:', err.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;