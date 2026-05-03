from pydantic import BaseModel

class UserSchema(BaseModel):
    id: str
    username: str
    email: str

class ProjectSchema(BaseModel):
    id: str
    name: str

class AgentSchema(BaseModel):
    id: str
    name: str

class TaskSchema(BaseModel):
    id: str
    title: str

class ApiKeySchema(BaseModel):
    id: str
    key: str

class ConversationSchema(BaseModel):
    id: str
    title: str
