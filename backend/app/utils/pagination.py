import math
from pydantic import BaseModel, field_validator

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


class PaginationParams(BaseModel):
    page: int = 1
    limit: int = DEFAULT_PAGE_SIZE

    @field_validator("limit")
    @classmethod
    def cap_limit(cls, v: int) -> int:
        return min(v, MAX_PAGE_SIZE)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

    def pages(self, total: int) -> int:
        return math.ceil(total / self.limit) if total > 0 else 0