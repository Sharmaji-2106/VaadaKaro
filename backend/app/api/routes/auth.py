from fastapi import APIRouter, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.ids import utcnow
from app.core.rate_limit import limiter, login_allowed, record_failed_login
from app.core.security import create_access_token, hash_password, verify_password
from app.models import ConsentPurpose, User, UserRole
from app.schemas.auth import LoginRequest, MeOut, SignupRequest, TokenResponse, UserOut
from app.services.audit import log_action
from app.services.consent import needs_notice, record_consent

router = APIRouter(prefix="/auth", tags=["auth"])

# Compared against when the email is unknown, so response time doesn't reveal which emails exist.
_DUMMY_HASH = hash_password("not-a-real-password")


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        expires_in=get_settings().access_token_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest) -> User:
    if await User.find_one(User.email == body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "This email is already registered. Please sign in instead.")

    user = User(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        role=UserRole.CITIZEN,
        adult_confirmed_at=utcnow(),
        ai_consent=body.ai_consent,
    )
    try:
        await user.insert()
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already in use.")
    await log_action(user_id=user.id, action="USER_REGISTERED", entity="USER", entity_id=user.id)
    await record_consent(user, ConsentPurpose.ACCOUNT, True)
    await record_consent(user, ConsentPurpose.AI_PROCESSING, body.ai_consent)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest) -> TokenResponse:
    if not login_allowed(body.email):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed sign-in attempts. Try again in 15 minutes."
        )
    user = await User.find_one(User.email == body.email)
    if not verify_password(body.password, user.password if user else _DUMMY_HASH) or user is None:
        record_failed_login(body.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials.")
    return _token_response(user)


@router.get("/me", response_model=MeOut)
async def me(user: CurrentUser) -> MeOut:
    return MeOut.model_validate({**user.model_dump(), "needs_notice": needs_notice(user)})
