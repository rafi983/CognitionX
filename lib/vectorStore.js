import fs from 'fs';
import path from 'path';

// Simple TF-IDF based vector store for local RAG (no external dependencies)
export class LocalVectorStore {
  constructor() {
    this.documents = [];
    this.vocabulary = new Set();
    this.idf = new Map();
    this.dataFile = path.join(process.cwd(), 'data', 'vectorstore.json');

    // Load existing data on initialization
    this.loadData();
  }

  // Load data from file
  loadData() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.documents = (data.documents || []).map(doc => ({
          ...doc,
          tf: new Map(doc.tf || []), // Convert array back to Map
          vector: new Map(doc.vector || []) // Convert array back to Map
        }));
        this.vocabulary = new Set(data.vocabulary || []);
        this.idf = new Map(data.idf || []);

        console.log(`Loaded ${this.documents.length} documents from storage`);

        // Rebuild vectors if needed
        if (this.documents.length > 0) {
          this.updateVectors();
        }
      } else {
        console.log('No existing vector store data found, starting fresh');
      }
    } catch (error) {
      console.error('Error loading vector store data:', error);
      // Start fresh if there's an error
      this.documents = [];
      this.vocabulary = new Set();
      this.idf = new Map();
    }
  }

  // Save data to file
  saveData() {
    try {
      const data = {
        documents: this.documents.map(doc => ({
          ...doc,
          tf: Array.from(doc.tf.entries()), // Convert Map to array for JSON
          vector: Array.from(doc.vector.entries()) // Convert Map to array for JSON
        })),
        vocabulary: Array.from(this.vocabulary),
        idf: Array.from(this.idf.entries())
      };

      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log(`Saved ${this.documents.length} documents to storage`);
    } catch (error) {
      console.error('Error saving vector store data:', error);
    }
  }

  // Simple text preprocessing
  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length >= 2); // Changed from > 2 to >= 2 to include "hi"
  }

  // Calculate term frequency
  calculateTF(words) {
    const tf = new Map();
    const totalWords = words.length;

    for (const word of words) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }

    // Normalize by total word count
    for (const [word, count] of tf) {
      tf.set(word, count / totalWords);
    }

    return tf;
  }

  // Calculate inverse document frequency
  updateIDF() {
    const docCount = this.documents.length;

    for (const word of this.vocabulary) {
      const docsWithWord = this.documents.filter(doc =>
        doc.words.includes(word)
      ).length;

      this.idf.set(word, Math.log(docCount / (docsWithWord + 1)));
    }
  }

  // Add document to the vector store
  addDocument(id, content, metadata = {}) {
    const words = this.preprocessText(content);
    const tf = this.calculateTF(words);

    // Add words to vocabulary
    words.forEach(word => this.vocabulary.add(word));

    const document = {
      id,
      content: content,
      originalContent: content,
      words: words,
      tf: tf,
      metadata: {
        ...metadata,
        addedAt: new Date(),
        wordCount: content.split(' ').length
      },
      vector: null
    };

    this.documents.push(document);
    this.updateIDF();
    this.updateVectors();
    this.saveData(); // Save data to file

    return document;
  }

  // Update TF-IDF vectors for all documents
  updateVectors() {
    for (const doc of this.documents) {
      const vector = new Map();

      for (const [word, tf] of doc.tf) {
        const idf = this.idf.get(word) || 0;
        vector.set(word, tf * idf);
      }

      doc.vector = vector;
    }
  }

  // Calculate cosine similarity between query and document
  calculateSimilarity(queryWords, docVector) {
    const queryTF = this.calculateTF(queryWords);
    let dotProduct = 0;
    let queryMagnitude = 0;
    let docMagnitude = 0;

    // Calculate query vector with IDF
    const queryVector = new Map();
    for (const [word, tf] of queryTF) {
      const idf = this.idf.get(word) || 0;
      queryVector.set(word, tf * idf);
    }

    // Calculate dot product and magnitudes
    const allWords = new Set([...queryVector.keys(), ...docVector.keys()]);

    for (const word of allWords) {
      const queryScore = queryVector.get(word) || 0;
      const docScore = docVector.get(word) || 0;

      dotProduct += queryScore * docScore;
      queryMagnitude += queryScore * queryScore;
      docMagnitude += docScore * docScore;
    }

    if (queryMagnitude === 0 || docMagnitude === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(docMagnitude));
  }

  // Search for similar documents
  search(query, topK = 5, threshold = 0.0) {
    if (this.documents.length === 0) {
      return [];
    }

    const queryWords = this.preprocessText(query);

    // Calculate similarity scores
    const scores = this.documents.map((doc) => {
      const similarity = this.calculateSimilarity(queryWords, doc.vector);
      return {
        document: doc,
        score: similarity
      };
    });

    // Sort by score and return top results
    const results = scores
      .filter(item => item.score > threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => ({
        ...item.document,
        similarity: item.score
      }));

    return results;
  }

  // Get document by ID
  getDocument(id) {
    return this.documents.find(doc => doc.id === id);
  }

  // Remove document
  removeDocument(id) {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      this.rebuildIndex();
      this.saveData(); // Save data to file
      return true;
    }
    return false;
  }

  // Rebuild the entire index
  rebuildIndex() {
    this.vocabulary.clear();
    this.idf.clear();

    // Rebuild vocabulary
    for (const doc of this.documents) {
      doc.words.forEach(word => this.vocabulary.add(word));
    }

    this.updateIDF();
    this.updateVectors();
  }

  // Get all documents with metadata
  getAllDocuments() {
    return this.documents.map(doc => ({
      id: doc.id,
      metadata: doc.metadata,
      preview: doc.originalContent.substring(0, 200) + '...'
    }));
  }

  // Get statistics
  getStats() {
    return {
      totalDocuments: this.documents.length,
      totalWords: this.documents.reduce((sum, doc) => sum + doc.metadata.wordCount, 0),
      averageWordsPerDocument: this.documents.length > 0
        ? Math.round(this.documents.reduce((sum, doc) => sum + doc.metadata.wordCount, 0) / this.documents.length)
        : 0
    };
  }
}

// Global instance
let globalVectorStore = null;

export function getVectorStore() {
  if (!globalVectorStore) {
    globalVectorStore = new LocalVectorStore();
  }
  return globalVectorStore;
}
