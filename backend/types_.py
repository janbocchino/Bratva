from typing import NewType, TypedDict, List
from dataclasses import dataclass, field
import typing


Dimension = NewType("Dimension", int)


class ModelConfig(TypedDict):
    text_input_dim: Dimension
    num_input_dim: Dimension
    attention_dim: Dimension
    l1_dim: Dimension
    l2_dim: Dimension
    output_dim: Dimension
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
    news_headlines: List[str]

    # beginning of LLM written Code, Model: Composer
    @classmethod
    def field_names(cls) -> List[str]:
        return list(cls.__dataclass_fields__.keys())
    # end of LLM written Code

    @classmethod
    def text_fields(cls) -> List[str]:
        result = []
        for k, field in cls.__dataclass_fields__.items():
            field_type = field.type
            origin = getattr(field_type, "__origin__", None)
            args = getattr(field_type, "__args__", ())
            if field_type is str:
                result.append(k)
            elif origin in (list, List) and args and args[0] is str:
                result.append(k)
        return result

    @classmethod
    def numeric_fields(cls) -> List[str]:
        return [
            k for k, v in cls.__dataclass_fields__.items()
            if v.type in (int, float)
        ]

    @classmethod
    def len_text(cls) -> int:
        return len(cls.text_fields())

    @classmethod
    def len_num(cls) -> int:
        return len(cls.numeric_fields())

    @classmethod
    def log_transform_fields(cls) -> List[str]:
        """Fields that span many orders of magnitude and need log transformation."""
        return ["net_worth", "social_media_followers"]
