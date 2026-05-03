import logging

logger = logging.getLogger(__name__)

class Embedder:
    def __init__(self):
        self._model = None
        self._load_failed = False

    def _get_model(self):
        if self._load_failed:
            return None
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                # Lazy load the model on first use
                logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
                self._model = SentenceTransformer('all-MiniLM-L6-v2')
            except ImportError:
                logger.warning("sentence-transformers not installed. Falling back to default embeddings.")
                self._load_failed = True
            except Exception as e:
                logger.error(f"Error loading sentence-transformers model: {e}")
                self._load_failed = True
        return self._model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        model = self._get_model()
        if model is not None:
            # sentence-transformers encode method usually returns numpy array, we convert to list
            embeddings = model.encode(texts)
            return embeddings.tolist()
        else:
            # Fallback to ChromaDB's default embedding function
            # The async chroma client doesn't directly expose this nicely if not passing to collection
            # So we import Chroma's default embedding function
            from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
            embedding_function = DefaultEmbeddingFunction()
            return embedding_function(texts)

embedder = Embedder()
