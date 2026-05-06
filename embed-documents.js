require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');
const { pipeline } = require('@xenova/transformers');

const DOCUMENTS_DIR = path.join(__dirname, 'documents');
const CHUNK_SIZE = 500;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const controllerHostUrl = process.env.PINECONE_CONTROLLER_HOST;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!apiKey || !indexName) {
    throw new Error('PINECONE_API_KEY et PINECONE_INDEX_NAME doivent être définis dans .env');
  }

  const pinecone = controllerHostUrl
    ? new Pinecone({ apiKey, controllerHostUrl })
    : new Pinecone({ apiKey });
  const index = pinecone.index(indexName);

  console.log('Chargement du modèle Xenova...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const fichiers = fs
    .readdirSync(DOCUMENTS_DIR)
    .filter((fichier) => fichier.endsWith('.txt'));

  if (fichiers.length === 0) {
    throw new Error('Aucun fichier .txt trouvé dans le dossier documents/');
  }

  for (const fichier of fichiers) {
    console.log(`\nLecture du fichier : ${fichier}`);
    const chemin = path.join(DOCUMENTS_DIR, fichier);
    const texte = fs.readFileSync(chemin, 'utf-8').replace(/\0/g, '').trim();

    if (!texte) {
      console.log(`Fichier ignoré car vide : ${fichier}`);
      continue;
    }

    const chunks = [];
    for (let i = 0; i < texte.length; i += CHUNK_SIZE) {
      chunks.push(texte.slice(i, i + CHUNK_SIZE));
    }

    console.log(`${chunks.length} chunks créés`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Vectorisation du chunk ${i + 1}/${chunks.length}`);

      const output = await extractor(chunk, { pooling: 'mean', normalize: true });
      const vecteur = Array.from(output.data);

      await index.upsert([
        {
          id: `${fichier}-chunk-${i}`,
          values: vecteur,
          metadata: {
            texte: chunk,
            fichier,
          },
        },
      ]);

      console.log(`Chunk ${i + 1} envoyé dans Pinecone`);
    }
  }

  console.log('\nIndexation terminée avec succès.');
}

main().catch((error) => {
  console.error('Erreur pendant l\'indexation :', error.message);
  process.exit(1);
});
