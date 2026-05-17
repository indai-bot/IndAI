from pydantic import BaseModel
from typing import Optional

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    first_name: str
    last_name: str
    gender: str
    birthdate: str
    country_code: str
    mobile: str
    email: str

class AddClientRequest(BaseModel):
    name: str

class AddFolderRequest(BaseModel):
    client_id: int
    parent_folder_id: Optional[int] = None
    name: str

class AddJobRequest(BaseModel):
    folder_id: int
    name: str
    subject: str
    description: str
    frequency: str
    job_date: str
    job_time: str
    timezone: str
    estimated_hours: float

class UpdateJobRequest(BaseModel):
    name: str
    subject: str
    description: str
    frequency: str
    job_date: str
    job_time: str
    timezone: str
    estimated_hours: float

class SendJobRequest(BaseModel):
    email: str

class SelectPlanRequest(BaseModel):
    plan: str

class AddCreditsRequest(BaseModel):
    credits: int

class ContactMessageRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str