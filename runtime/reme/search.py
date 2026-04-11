"""
Hybrid search engine: BM25 (keyword) + cosine similarity (vector).
Operates over in-memory documents or database-backed storage.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Optional

import numpy as np


# --- BM25 Implementation ---


class BM25:
    """Okapi BM25 scoring for keyword search."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus: list[list[str]] = []
        self.doc_lens: list[int] = []
        self.avgdl: float = 0
        self.df: dict[str, int] = {}
        self.n_docs: int = 0

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r'\b\w+\b', text.lower())

    def index(self, documents: list[str]) -> None:
        """Build BM25 index from documents."""
        self.corpus = [self._tokenize(doc) for doc in documents]
        self.n_docs = len(self.corpus)
        self.doc_lens = [len(doc) for doc in self.corpus]
        self.avgdl = sum(self.doc_lens) / max(self.n_docs, 1)

        self.df = {}
        for doc_words in self.corpus:
            unique_words = set(doc_words)
            for w in unique_words:
                self.df[w] = self.df.get(w, 0) + 1

    def _idf(self, word: str) -> float:
        df = self.df.get(word, 0)
        return math.log((self.n_docs - df + 0.5) / (df + 0.5) + 1)

    def score(self, query: str) -> list[float]:
        """Score all documents against query. Returns list of scores."""
        query_words = self._tokenize(query)
        scores = []
        for i, doc_words in enumerate(self.corpus):
            tf = Counter(doc_words)
            doc_len = self.doc_lens[i]
            score = 0.0
            for qw in query_words:
                if qw not in tf:
                    continue
                freq = tf[qw]
                idf = self._idf(qw)
                numerator = freq * (self.k1 + 1)
                denominator = freq + self.k1 * (
                    1 - self.b + self.b * doc_len / self.avgdl
                )
                score += idf * numerator / denominator
            scores.append(score)
        return scores


# --- Vector similarity ---


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _simple_embedding(text: str, dim: int = 128) -> np.ndarray:
    """
    Simple bag-of-characters embedding for when no model is available.
    Deterministic, fast, good enough for basic similarity.
    """
    vec = np.zeros(dim, dtype=np.float32)
    words = re.findall(r'\b\w+\b', text.lower())
    for word in words:
        for i, ch in enumerate(word):
            idx = (ord(ch) * (i + 1)) % dim
            vec[idx] += 1.0
    # Normalize
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def embed_text(text: str, dim: int = 128) -> np.ndarray:
    """
    Generate embedding vector for text.
    Uses simple character-level embedding (no external model dependencies).
    """
    return _simple_embedding(text, dim)


# --- Hybrid search ---


class HybridSearchEngine:
    """Combines BM25 keyword scoring with vector cosine similarity."""

    def __init__(self, bm25_weight: float = 0.4, vector_weight: float = 0.6,
                 embedding_dim: int = 128):
        self.bm25_weight = bm25_weight
        self.vector_weight = vector_weight
        self.embedding_dim = embedding_dim
        self.bm25 = BM25()
        self.documents: list[dict] = []  # {id, content, metadata, embedding}

    def index_documents(self, documents: list[dict]) -> None:
        """
        Index documents for search.
        Each doc: {"id": str, "content": str, "metadata": dict}
        """
        self.documents = []
        texts = []
        for doc in documents:
            embedding = embed_text(doc["content"], self.embedding_dim)
            self.documents.append({
                **doc,
                "embedding": embedding,
            })
            texts.append(doc["content"])
        self.bm25.index(texts)

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Hybrid search: combine BM25 and vector scores.
        Returns top_k results with scores.
        """
        if not self.documents:
            return []

        # BM25 scores
        bm25_scores = self.bm25.score(query)

        # Vector scores
        query_embedding = embed_text(query, self.embedding_dim)
        vector_scores = [
            cosine_similarity(query_embedding, doc["embedding"])
            for doc in self.documents
        ]

        # Normalize scores to [0, 1]
        bm25_max = max(bm25_scores) if bm25_scores and max(bm25_scores) > 0 else 1
        vec_max = max(vector_scores) if vector_scores and max(vector_scores) > 0 else 1

        combined = []
        for i, doc in enumerate(self.documents):
            bm25_norm = bm25_scores[i] / bm25_max if bm25_max > 0 else 0
            vec_norm = vector_scores[i] / vec_max if vec_max > 0 else 0
            hybrid_score = (
                self.bm25_weight * bm25_norm +
                self.vector_weight * vec_norm
            )
            combined.append({
                "id": doc["id"],
                "content": doc["content"],
                "metadata": doc.get("metadata", {}),
                "score": hybrid_score,
                "bm25_score": bm25_scores[i],
                "vector_score": vector_scores[i],
            })

        combined.sort(key=lambda x: x["score"], reverse=True)
        return combined[:top_k]
