from pydantic import BaseModel, Field


class RecoveryActionStatusUpdate(BaseModel):

    status: str = Field(
        ...,
        description="Recovery action status",
    )