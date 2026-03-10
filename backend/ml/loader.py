from pathlib import Path
import json
from sklearn.preprocessing import RobustScaler
from flax import nnx
import jax.numpy as jnp
from safetensors import safe_open
from sentence_transformers import SentenceTransformer

from .model import Model
from backend.types_ import ModelConfig
from backend.constants import POWER_MODEL, EMBEDDING_MODEL


def load_power_model():
    checkpoint_path = Path(POWER_MODEL)

    with safe_open(checkpoint_path, framework="numpy") as f:
        saved_config = ModelConfig(**json.loads(f.metadata()["config"]))
        loaded = {k: f.get_tensor(k) for k in f.keys()}

    scaler = RobustScaler()
    scaler.center_ = loaded.pop("scaler_center_")
    scaler.scale_ = loaded.pop("scaler_scale_")

    fresh_model = Model(saved_config, rngs=nnx.Rngs(0))
    graphdef, state = nnx.split(fresh_model)
    flat_state = state.flat_state()

    for k, v in flat_state:
        key = str(k)
        if key in loaded:
            v[...] = jnp.array(loaded[key])

    return nnx.merge(graphdef, state), scaler


def load_embedding_model():
    return SentenceTransformer(EMBEDDING_MODEL)


def load_all_models():
    """Load all models once at startup."""
    power_model, scaler = load_power_model()
    embedding_model = load_embedding_model()
    return power_model, scaler, embedding_model
