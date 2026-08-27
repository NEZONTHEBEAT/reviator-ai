from pydantic import BaseModel, EmailStr


class CustomerCreate(BaseModel):

    customer_id: str
    name: str
    email: EmailStr
    