require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const controllerHostUrl = process.env.PINECONE_CONTROLLER_HOST;
  const indexName = process.env.PINECONE_INDEX_NAME || 'formation-rag';

  if (!apiKey) {
    throw new Error('Veuillez définir PINECONE_API_KEY dans le fichier .env.');
  }

  const client = controllerHostUrl
    ? new Pinecone({ apiKey, controllerHostUrl })
    : new Pinecone({ apiKey });

  console.log(`Vérification de l'index Pinecone : ${indexName}`);
  const indexesResponse = await client.listIndexes();
  const indexes = Array.isArray(indexesResponse) ? indexesResponse : indexesResponse.indexes || [];

  if (indexes.some((index) => index.name === indexName || index === indexName)) {
    console.log(`L'index existe déjà : ${indexName}`);
    return;
  }

  console.log(`Création de l'index Pinecone : ${indexName}`);
  await client.createIndex({
    name: indexName,
    dimension,
    metric,
  });

  console.log('Index créé avec succès.');
}

main().catch((error) => {
  console.error('Erreur lors de la création de l\'index Pinecone :', error.message);
  process.exit(1);
});
