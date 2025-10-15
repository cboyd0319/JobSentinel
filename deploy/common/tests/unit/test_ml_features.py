"""
Tests for AI/ML features (BERT, Sentence-BERT, spaCy, VADER).
"""

import pytest


# Test semantic matching (BERT/Sentence-BERT)
def test_semantic_matcher_initialization():
    """Test SemanticMatcher initializes correctly."""
    pytest.importorskip("torch")
    from domains.ml.semantic_matcher import SemanticMatcher

    matcher = SemanticMatcher()
    assert matcher.model_name == "all-MiniLM-L6-v2"
    assert matcher._model is None  # Lazy loaded


def test_semantic_matcher_sanitization():
    """Test input sanitization."""
    pytest.importorskip("torch")
    from domains.ml.semantic_matcher import SemanticMatcher

    matcher = SemanticMatcher()

    # Test max length truncation
    long_text = "a" * 15000
    sanitized = matcher._sanitize_text(long_text, max_length=10000)
    assert len(sanitized) <= 10000

    # Test whitespace normalization
    messy_text = "  lots   of    spaces  "
    sanitized = matcher._sanitize_text(messy_text)
    assert sanitized == "lots of spaces"


def test_semantic_matcher_result_structure():
    """Test SemanticMatchResult structure."""
    pytest.importorskip("torch")
    from domains.ml.semantic_matcher import SemanticMatchResult

    result = SemanticMatchResult(
        similarity_score=0.85,
        match_percentage=85,
        confidence=0.9,
        key_alignments=["Python", "Machine Learning"],
        gaps=["DevOps", "Kubernetes"],
        metadata={"model": "bert"},
    )

    assert result.similarity_score == 0.85
    assert result.match_percentage == 85
    assert result.confidence == 0.9
    assert len(result.key_alignments) == 2
    assert len(result.gaps) == 2


# Test sentiment analysis (VADER)
def test_sentiment_analyzer_initialization():
    """Test SentimentAnalyzer initializes correctly."""
    pytest.importorskip("torch")
    from domains.ml.sentiment_analyzer import SentimentAnalyzer

    analyzer = SentimentAnalyzer()
    assert hasattr(analyzer, "SCAM_PHRASES")
    assert hasattr(analyzer, "PRESSURE_PHRASES")
    assert len(analyzer.SCAM_PHRASES) > 0


def test_sentiment_analyzer_scam_detection():
    """Test scam phrase detection."""
    pytest.importorskip("torch")
    from domains.ml.sentiment_analyzer import SentimentAnalyzer

    # Test scam phrases are defined
    assert "guaranteed income" in SentimentAnalyzer.SCAM_PHRASES
    assert "make money fast" in SentimentAnalyzer.SCAM_PHRASES
    assert "work from home no experience" in SentimentAnalyzer.SCAM_PHRASES


def test_sentiment_analyzer_pressure_detection():
    """Test pressure/urgency phrase detection."""
    pytest.importorskip("torch")
    from domains.ml.sentiment_analyzer import SentimentAnalyzer

    # Test pressure phrases are defined
    assert "urgent" in SentimentAnalyzer.PRESSURE_PHRASES
    assert "immediate start" in SentimentAnalyzer.PRESSURE_PHRASES
    assert "act now" in SentimentAnalyzer.PRESSURE_PHRASES


def test_sentiment_result_structure():
    """Test SentimentResult structure."""
    pytest.importorskip("torch")
    from domains.ml.sentiment_analyzer import SentimentResult, SentimentLabel

    result = SentimentResult(
        sentiment=SentimentLabel.POSITIVE,
        confidence=0.9,
        positive_score=0.8,
        negative_score=0.1,
        neutral_score=0.1,
        red_flags=["urgent hiring"],
        tone_indicators=["professional"],
        metadata={"source": "vader"},
    )

    assert result.sentiment == SentimentLabel.POSITIVE
    assert result.confidence == 0.9
    assert result.positive_score == 0.8
    assert len(result.red_flags) == 1


# Test resume parsing (spaCy)
def test_resume_parser_availability():
    """Test resume parser dependencies."""
    from utils.resume_parser import HAS_SPACY, HAS_PDF, HAS_DOCX

    # These should be available since we installed [dev,resume,ml]
    assert HAS_SPACY is True
    assert HAS_PDF is True
    assert HAS_DOCX is True


def test_resume_parser_config_loaded():
    """Test resume parser configuration loaded."""
    from utils.resume_parser import COMMON_SKILLS, TITLE_KEYWORDS

    # Should have loaded skills and keywords
    assert len(COMMON_SKILLS) > 0
    assert len(TITLE_KEYWORDS) > 0

    # Check some expected skills
    assert isinstance(COMMON_SKILLS, set)
    assert isinstance(TITLE_KEYWORDS, set)


def test_spacy_model_lazy_loading():
    """Test spaCy model is lazy loaded."""
    from utils.resume_parser import _NLP

    # Model should not be loaded yet
    assert _NLP is None


def test_resume_parser_seniority_blocklist():
    """Test seniority blocklist is defined."""
    from utils.resume_parser import SENIORITY_BLOCKLIST

    assert "intern" in SENIORITY_BLOCKLIST
    assert "junior" in SENIORITY_BLOCKLIST
    assert "entry level" in SENIORITY_BLOCKLIST


# Integration test (optional - only if models installed)
@pytest.mark.skipif(
    not __import__("importlib.util").util.find_spec("vaderSentiment"),
    reason="vaderSentiment not installed",
)
def test_vader_sentiment_integration():
    """Test VADER sentiment analysis works."""
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

    analyzer = SentimentIntensityAnalyzer()

    # Test positive sentiment
    positive = analyzer.polarity_scores("This is an amazing job opportunity!")
    assert positive["compound"] > 0.5

    # Test negative sentiment
    negative = analyzer.polarity_scores("This is a terrible scam job.")
    assert negative["compound"] < -0.5

    # Test neutral sentiment
    neutral = analyzer.polarity_scores("Software Engineer position in New York.")
    assert -0.5 <= neutral["compound"] <= 0.5


@pytest.mark.skipif(
    not __import__("importlib.util").util.find_spec("sentence_transformers"),
    reason="sentence-transformers not installed",
)
def test_sentence_bert_integration():
    """Test Sentence-BERT model loading and encoding."""
    from sentence_transformers import SentenceTransformer

    # Load model (will download on first run)
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Test encoding
    sentences = ["Python developer needed", "Software engineer position"]
    embeddings = model.encode(sentences)

    # Should return 384-dimensional embeddings
    assert embeddings.shape == (2, 384)

    # Test cosine similarity
    from sentence_transformers.util import cos_sim

    similarity = cos_sim(embeddings[0], embeddings[1])

    # Similar sentences should have moderate similarity (0.0-1.0 range)
    # Note: Different phrasings may not be highly similar
    assert 0.0 <= similarity.item() <= 1.0
    assert similarity.item() > 0.2  # At least somewhat related


# Test encryption utilities
def test_encryption_key_generation():
    """Test encryption key generation."""
    from utils.encryption import generate_key

    key = generate_key()
    assert len(key) == 44  # Fernet keys are 44 bytes base64-encoded


def test_encryption_decrypt_cycle():
    """Test encryption and decryption."""
    from utils.encryption import generate_key, encrypt_data, decrypt_data

    key = generate_key()
    original = b"Sensitive job search data"

    # Encrypt
    encrypted = encrypt_data(original, key)
    assert encrypted != original

    # Decrypt
    decrypted = decrypt_data(encrypted, key)
    assert decrypted == original


def test_string_encryption():
    """Test string encryption helpers."""
    from utils.encryption import generate_key, encrypt_string, decrypt_string

    key = generate_key()
    original = "Secret resume data"

    # Encrypt
    encrypted = encrypt_string(original, key)
    assert encrypted != original
    assert isinstance(encrypted, str)

    # Decrypt
    decrypted = decrypt_string(encrypted, key)
    assert decrypted == original


def test_database_encryption_utilities():
    """Test database encryption utilities."""
    from utils.encryption import DatabaseEncryption

    # Test SQLCipher availability check
    is_available = DatabaseEncryption.is_sqlcipher_available()
    assert isinstance(is_available, bool)

    # Test key generation
    key = DatabaseEncryption.generate_database_key()
    assert len(key) == 64  # 32 bytes hex-encoded


def test_key_rotation():
    """Test encryption key rotation."""
    from utils.encryption import generate_key, encrypt_data, KeyRotation

    old_key = generate_key()
    new_key = generate_key()

    original = b"Data to rotate"
    encrypted_old = encrypt_data(original, old_key)

    # Rotate
    encrypted_new = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted_old)

    # Should decrypt with new key
    from utils.encryption import decrypt_data

    decrypted = decrypt_data(encrypted_new, new_key)
    assert decrypted == original
