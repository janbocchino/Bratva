from flax import nnx
import jax.numpy as jnp
from toolz import pipe
from jaxtyping import Float, Array
from backend.types_ import ModelConfig


class Model(nnx.Module):
    def __init__(self, config: ModelConfig, rngs: nnx.Rngs):
        self.config = config
        self.l1_text = nnx.Linear(
            in_features=self.config["text_input_dim"],
            out_features=self.config["l1_dim"],
            rngs=rngs,
        )
        self.l1_num = nnx.Linear(
            in_features=self.config["num_input_dim"],
            out_features=self.config["l1_dim"],
            rngs=rngs,
        )
        self.l2 = nnx.Linear(
            in_features=self.config["l1_dim"] * 2,
            out_features=self.config["l2_dim"],
            rngs=rngs,
        )
        self.out = nnx.Linear(
            in_features=self.config["l2_dim"],
            out_features=self.config["output_dim"],
            rngs=rngs,
        )
        self.dropout = nnx.Dropout(self.config["dropout"], rngs=rngs)

    def __call__(self, x: Float[Array, "input_dim"]) -> Float[Array, "output_dim"]:
        text_l1 = pipe(
            x[: self.config["text_input_dim"]],
            self.l1_text,
            nnx.relu,
            self.dropout,
        )
        num_l1 = pipe(
            x[self.config["text_input_dim"] :],
            self.l1_num,
            nnx.relu,
            self.dropout,
        )
        l1 = jnp.concatenate([text_l1, num_l1], axis=0)

        return pipe(
            l1,
            self.l2,
            nnx.relu,
            self.dropout,
            self.out,
        )
