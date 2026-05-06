require('dotenv').config();
const { pipeline } = require('@xenova/transformers');
const { Pinecone } = require('@pinecone-database/pinecone');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log('--- Initialisation du Pipeline RAG ---');

  const apiKey = process.env.PINECONE_API_KEY;
  const controllerHostUrl = process.env.PINECONE_CONTROLLER_HOST;
  const indexName = process.env.PINECONE_INDEX_NAME || 'formation-rag';

  if (!apiKey) {
    throw new Error('PINECONE_API_KEY doit être défini dans .env');
  }

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const pinecone = controllerHostUrl
    ? new Pinecone({ apiKey, controllerHostUrl })
    : new Pinecone({ apiKey });
  const index = pinecone.index(indexName);

  async function vectoriserQuestion(question) {
    const output = await extractor(question, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async function appellerLLM(question, contexte) {
    const prompt = `Tu es un assistant de recrutement.\nRéponds uniquement avec les informations présentes dans le contexte.\nSi la réponse n'est pas dans le contexte, dis : "Je ne trouve pas cette information dans les documents fournis".\nIndique toujours la source du document.\n\nContexte :\n${contexte}\n\nQuestion : ${question}`;

    if (process.env.GROQ_API_KEY) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    }

    if (process.env.HUGGINGFACE_API_KEY) {
      const model = 'mistralai/Mistral-7B-Instruct-v0.3';
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        return data[0]?.generated_text || 'Désolé, je n\'ai pas pu générer de réponse.';
      }
      return data.generated_text || 'Désolé, je n\'ai pas pu générer de réponse.';
    }

    throw new Error('Aucune clé LLM définie : GROQ_API_KEY ou HUGGINGFACE_API_KEY requise.');
  }

  function buildContext(matches) {
    return matches
      .map((match) => `Source: ${match.metadata.fichier}\n${match.metadata.texte}`)
      .join('\n\n---\n\n');
  }

  function isResultRelevant(matches) {
    if (!matches || matches.length === 0) return false;
    return matches.some((match) => typeof match.score === 'number' && match.score > 0.12);
  }

  async function poserQuestion() {
    rl.question('\nVous : ', async (question) => {
      if (question.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      try {
        const vecteurQuestion = await vectoriserQuestion(question);

        const resultats = await index.query({
          vector: vecteurQuestion,
          topK: 3,
          includeMetadata: true,
        });

        if (!isResultRelevant(resultats.matches)) {
          console.log('\nAssistant : Je ne trouve pas cette information dans les documents fournis.');
          poserQuestion();
          return;
        }

        const contexte = buildContext(resultats.matches);
        const sources = [...new Set(resultats.matches.map((match) => match.metadata.fichier))].join(', ');
        const reponse = await appellerLLM(question, contexte);

        console.log(`\nAssistant : ${reponse.trim()}\n(Source : ${sources})`);
      } catch (error) {
        console.error('Erreur pendant la génération de la réponse :', error.message);
      }

      poserQuestion();
    });
  }

  poserQuestion();
}

main().catch((error) => {
  console.error('Erreur critique :', error.message);
  process.exit(1);
});
