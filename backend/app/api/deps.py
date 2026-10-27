import re
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.models import User, UserRole
from app.services.ai.provider import AIService
from app.services.ai.tasks import get_ai_service
from app.services.consent import AI_CONSENT_REQUIRED

AI = Annotated[AIService, Depends(get_ai_service)]

_bearer = HTTPBearer(auto_error=False)


async def _user_from_token(creds: HTTPAuthorizationCredentials | None) -> User | None:
    if creds is None:
        return None
    try:
        payload = decode_access_token(creds.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    # Load the user on every request so role and department changes apply immediately.
    user = await User.get(payload.get("sub"))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


async def get_current_user(creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]) -> User:
    user = await _user_from_token(creds)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


async def get_optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User | None:
    return await _user_from_token(creds)


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_roles(*roles: UserRole):
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this resource")
        return user

    return checker


Officer = Annotated[User, Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN))]
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
Lawyer = Annotated[User, Depends(require_roles(UserRole.LAWYER))]


async def get_ai_consented_user(user: CurrentUser) -> User:
    """Signed-in user who has consented to their text being sent to the AI provider."""
    if not user.ai_consent:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"{AI_CONSENT_REQUIRED}: turn on AI processing in Settings to use this feature. "
            "Your text is sent to Google Gemini to generate the draft.",
        )
    return user


AIUser = Annotated[User, Depends(get_ai_consented_user)]


def is_official(user: User | None) -> bool:
    return user is not None and user.role in (UserRole.OFFICER, UserRole.ADMIN)


def can_access_department(user: User, department: str) -> bool:
    """Admins see everything; officers only their own department (none if unassigned)."""
    if user.role == UserRole.ADMIN:
        return True
    return user.role == UserRole.OFFICER and bool(user.department) and user.department == department


def contains(text: str) -> dict:
    """Case-insensitive substring match; the user's text is escaped, never treated as a regex."""
    return {"$regex": re.escape(text), "$options": "i"}
