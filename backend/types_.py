from typing import TypedDict, List
from dataclasses import dataclass


class ModelConfig(TypedDict):
    text_input_dim: int
    num_input_dim: int
    attention_dim: int
    l1_dim: int
    l2_dim: int
    output_dim: int
    learning_rate: float
    contrastive_loss_margin: float
    mse_loss_weight: float
    positive_margin_threshold: float
    dropout: float


@dataclass(frozen=True)
class InputData:
    name: str
    occupation: List[str]
    citizenship: List[str]
    net_worth: int
    social_media_followers: int
    associations: List[str]
    age: int

    TEXT_FIELDS = ["name", "occupation", "citizenship", "associations"]
    NUMERIC_FIELDS = ["net_worth", "social_media_followers", "age"]
    LOG_TRANSFORM_FIELDS = ["net_worth", "social_media_followers"]
