"""
Machine Learning Domain

Provides FREE AI/ML capabilities for JobSentinel:
- Semantic similarity analysis (BERT embeddings)
- Sentiment analysis for job descriptions
- Advanced keyword extraction (TF-IDF + embeddings)
- Resume-job matching with ML scoring
- Multi-task learning with shared representations
- Active learning for continuous improvement
- Cross-encoder reranking for better precision
- Custom fine-tuning on domain-specific data
- Zero external API costs

References:
- Hugging Face Transformers | https://huggingface.co/docs/transformers | High | Free ML models
- BERT Paper | https://arxiv.org/abs/1810.04805 | High | Sentence embeddings
- Scikit-learn | https://scikit-learn.org | High | Classical ML algorithms
"""

from .active_learning import ActiveLearningManager, QueryStrategy, Sample
from .cross_encoder_reranking import Candidate, CrossEncoderReranker, HybridRanker
from .custom_fine_tuning import FineTunedBERT, FineTuningConfig, FineTuningTrainer, ModelManager
from .keyword_extractor import AdvancedKeywordExtractor, KeywordExtractionResult
from .multi_task_learning import MultiTaskBERT, MultiTaskPredictor, MultiTaskTrainer, Task
from .semantic_matcher import SemanticMatcher, SemanticMatchResult
from .sentiment_analyzer import SentimentAnalyzer, SentimentResult

__all__ = [
    # Existing exports
    "SemanticMatcher",
    "SemanticMatchResult",
    "SentimentAnalyzer",
    "SentimentResult",
    "AdvancedKeywordExtractor",
    "KeywordExtractionResult",
    # New exports - Multi-Task Learning
    "MultiTaskBERT",
    "MultiTaskPredictor",
    "MultiTaskTrainer",
    "Task",
    # New exports - Active Learning
    "ActiveLearningManager",
    "QueryStrategy",
    "Sample",
    # New exports - Cross-Encoder Reranking
    "CrossEncoderReranker",
    "HybridRanker",
    "Candidate",
    # New exports - Custom Fine-Tuning
    "FineTunedBERT",
    "FineTuningConfig",
    "FineTuningTrainer",
    "ModelManager",
]
