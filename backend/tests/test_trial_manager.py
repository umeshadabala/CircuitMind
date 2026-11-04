import asyncio
import pytest
from starlette.requests import Request
from starlette.responses import Response
from backend.app.ai.trial_manager import MetaTrialManager, TrialPolicyError, COOKIE_NAME


def dummy_request(cookie_val: str = None, client_ip: str = "127.0.0.1") -> Request:
    headers = []
    if cookie_val:
        headers.append((b"cookie", f"{COOKIE_NAME}={cookie_val}".encode("utf-8")))

    scope = {
        "type": "http",
        "method": "POST",
        "headers": headers,
        "client": (client_ip, 12345),
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_trial_token_lifecycle():
    """Tests normal trial token issuance, reservation, and consumption."""
    manager = MetaTrialManager(secret_key="test-secret-key-123")

    # 1. New user with no cookie: status is available
    req1 = dummy_request()
    status, tid = manager.get_trial_status(req1)
    assert status == "available"

    # 2. Reserve trial
    token_id = await manager.reserve_trial(req1)
    assert token_id is not None
    assert len(token_id) == 32  # 16 bytes hex

    # 3. Simulate completion and stamp cookie as consumed
    resp = Response()
    await manager.release_and_consume_trial(token_id, resp, state="consumed")

    # Extract set-cookie
    set_cookie_header = resp.headers.get("set-cookie")
    assert COOKIE_NAME in set_cookie_header
    assert "consumed" in set_cookie_header or len(set_cookie_header) > 30

    # Extract raw cookie value from Set-Cookie header
    cookie_part = [p for p in set_cookie_header.split(";") if COOKIE_NAME in p][0]
    consumed_token = cookie_part.split("=")[1].strip()

    # 4. Subsequent request with consumed token must report consumed
    req2 = dummy_request(cookie_val=consumed_token)
    status2, _ = manager.get_trial_status(req2)
    assert status2 == "consumed"

    # 5. Attempting to reserve trial again must raise TrialPolicyError (403)
    with pytest.raises(TrialPolicyError) as exc_info:
        await manager.reserve_trial(req2)
    assert exc_info.value.status_code == 403
    assert exc_info.value.state == "consumed"


@pytest.mark.asyncio
async def test_tampered_trial_cookie_rejected():
    """Tampering with token payload or signature must invalidate the trial."""
    manager = MetaTrialManager(secret_key="test-secret-key-123")

    # Generate a valid token
    valid_token = manager.create_token_payload(state="available")

    # Tamper with the token string
    tampered_token = valid_token[:-4] + "AAAA"

    req = dummy_request(cookie_val=tampered_token)
    status, _ = manager.get_trial_status(req)
    assert status == "unavailable"

    with pytest.raises(TrialPolicyError) as exc_info:
        await manager.reserve_trial(req)
    assert exc_info.value.status_code == 403
    assert exc_info.value.state == "unavailable"


@pytest.mark.asyncio
async def test_concurrent_trial_spending_blocked():
    """Simultaneous concurrent requests using the same trial token must be rejected (409 Conflict)."""
    manager = MetaTrialManager(secret_key="test-secret-key-123")
    valid_token = manager.create_token_payload(state="available", token_id="fixed-token-id-123")
    req = dummy_request(cookie_val=valid_token)

    # First request reserves the trial
    tid = await manager.reserve_trial(req)
    assert tid == "fixed-token-id-123"

    # Second concurrent request with the same token must fail with 409
    with pytest.raises(TrialPolicyError) as exc_info:
        await manager.reserve_trial(req)
    assert exc_info.value.status_code == 409
    assert exc_info.value.state == "processing"

    # Release the trial
    resp = Response()
    await manager.release_and_consume_trial(tid, resp, state="consumed")

    # After consumption, it's consumed, not processing
    req_consumed = dummy_request(cookie_val=manager.create_token_payload(state="consumed", token_id=tid))
    with pytest.raises(TrialPolicyError) as exc_consumed:
        await manager.reserve_trial(req_consumed)
    assert exc_consumed.value.status_code == 403
    assert exc_consumed.value.state == "consumed"

