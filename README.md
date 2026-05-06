# Projet IA - Chatbot RAG

## Objectif
Ce projet implémente un chatbot RAG (Retrieval-Augmented Generation) capable de répondre uniquement à partir d'un corpus de documents. Si l'information n'est pas dans les documents, le bot indique clairement qu'il ne la trouve pas.

## Installation pour les noobs

1. Installer les dépendances :

```bash
npm install
```

2. Créer un fichier `.env` à partir de `.env.example` et ajouter vos clés API.

## Utilisation

1. Créer l'index Pinecone :

```bash
node create-index.js
```

2. Indexer les documents :

```bash
node embed-documents.js
```

3. Lancer le chatbot RAG :

```bash
node rag-pipeline.js
```

## Structure du projet

- `create-index.js` : création de l'index Pinecone.
- `embed-documents.js` : lecture des fichiers `documents/*.txt`, découpe en chunks, vectorisation et envoi dans Pinecone.
- `rag-pipeline.js` : pipeline de recherche + génération de réponse avec contexte.
- `documents/` : corpus fourni pour le chatbot.
- `.env.example` : variables d'environnement à remplir sans clés réelles.

## Corpus attendu

Le dossier `documents/` doit contenir :

- `fiche_poste.txt`
- `guide_entretien.txt`
- `faq_rh.txt`
- `competences_tech.txt`

## Capture d'écran et preuves de fonctionnement

- Voir "Capture d'écran embed_doc ET rag_pipeline.png"



## DONE WITH LOVE BY AMIR CLEMENT & SAFI ❤️
