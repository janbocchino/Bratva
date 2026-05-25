from typing import Any, Dict, Tuple
import jax.numpy as jnp
from flax import nnx
from sklearn.preprocessing import RobustScaler
from sentence_transformers import SentenceTransformer
import time
import math

from backend.types_ import InputData


def predict_single_sample(
    model: nnx.Module, sample: Dict[str, Any], scaler: RobustScaler, embedding_model: SentenceTransformer
) -> Tuple[float, float]:
    # Encode text fields
    text_values = []
    for f in InputData.text_fields():
        value = sample[f]
        text_values.append(", ".join(value) if isinstance(value, list) else value)

    text_embeds = jnp.array(embedding_model.encode(text_values))
    text_embeddings = text_embeds.flatten()

    # Process numeric fields
    # jnp.where
    numeric_values = []
    for f in InputData.numeric_fields():
        value = jnp.array(sample[f], dtype=jnp.float32)
        if f in InputData.log_transform_fields():
            value = jnp.log1p(value)
        numeric_values.append(value)
    
    numeric = jnp.array(numeric_values, dtype=jnp.float32).reshape(1, -1)
    scaled_numeric = jnp.array(scaler.transform(numeric), dtype=jnp.float32)[0]

    X = jnp.concatenate([text_embeddings, scaled_numeric], axis=0)
    prediction_logit = model(X)
    prediction_prob = nnx.sigmoid(prediction_logit)

    return float(prediction_prob[0]), time.time()


def scale_to_stock_price(prediction: float) -> float:
    """Scale prediction to a stock-like price using log scaling."""
    max_net_worth = 779_700_000_000
    max_price = math.log1p(max_net_worth) * 7.3
    return max_price ** (prediction)


def calculate_model_price(
    model: nnx.Module, sample: Dict[str, Any], scaler: RobustScaler, embedding_model: SentenceTransformer
) -> Tuple[float, float]:
    prediction, timestamp = predict_single_sample(model, sample, scaler, embedding_model)
    return scale_to_stock_price(prediction), timestamp

# beginning of LLM written Code, Model: Composer

# deprecated: synthetic ±0.1% jitter replaced by reading `assets/live/*.json` each tick so
# net_worth / followers / headline-driven features move the ML price.
#
# def sample_price_movement(price: float) -> Tuple[float, float]:
#     """Simulate random price movement (±0.1%)."""
#     movement = random.uniform(-0.001, 0.001) * price
#     return price + movement, time.time()

# end of LLM written Code
