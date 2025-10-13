"""
Machine Learning Domain

Provides FREE AI/ML capabilities for JobSentinel:
- Semantic similarity analysis (BERT embeddings)
- Sentiment analysis for job descriptions
- Advanced keyword extraction (TF-IDF + embeddings)
- Resume-job matching with ML scoring
- Zero external API costs

References:
- Hugging Face Transformers | https://huggingface.co/docs/transformers | High | Free ML models
- BERT Paper | https://arxiv.org/abs/1810.04805 | High | Sentence embeddings
- Scikit-learn | https://scikit-learn.org | High | Classical ML algorithms
"""

from .keyword_extractor import AdvancedKeywordExtractor, KeywordExtractionResult
from .semantic_matcher import SemanticMatcher, SemanticMatchResult
from .sentiment_analyzer import SentimentAnalyzer, SentimentResult

__all__ = [
    "SemanticMatcher",
    "SemanticMatchResult",
    "SentimentAnalyzer",
    "SentimentResult",
    "AdvancedKeywordExtractor",
    "KeywordExtractionResult",
]
