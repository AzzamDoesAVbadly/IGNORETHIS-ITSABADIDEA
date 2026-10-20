from pydantic import BaseModel
from typing import List, Optional

class Article(BaseModel):
    id: int
    title: str
    content: str
    topic: str
    created_at: str
    updated_at: str

class Merch(BaseModel):
    id: int
    name: str
    price: float
    description: Optional[str] = None

class FlowResponse(BaseModel):
    topic: str
    article: Article
    video: dict
    merch: Merch
    status: dict

class HomeResponse(BaseModel):
    articles: List[Article]
    merch: List[Merch]
    topics: List[dict]