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

    def __call__(
        self,
        x: Float[Array, "input_dim"],
        *,
        deterministic: bool = True,
    ) -> Float[Array, "output_dim"]:
        # beginning of LLM written Code, Model: Composer
        def apply_dropout(t):
            return self.dropout(t, deterministic=deterministic)
        # end of LLM written Code

        text_l1 = pipe(
            x[: self.config["text_input_dim"]],
            self.l1_text,
            nnx.relu,
            apply_dropout,
        )
        num_l1 = pipe(
            x[self.config["text_input_dim"] :],
            self.l1_num,
            nnx.relu,
            apply_dropout,
        )
        l1 = jnp.concatenate([text_l1, num_l1], axis=0)

        return pipe(
            l1,
            self.l2,
            nnx.relu,
            apply_dropout,
            self.out,
        )
