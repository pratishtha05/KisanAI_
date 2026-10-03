"""AES-256-GCM encryption for stored chat messages.

Design
------
* One master key (CHAT_ENCRYPTION_KEY, 32 bytes, base64) lives in the server's
  environment, never in the database.
* Each user gets their OWN key: HKDF-SHA256(master, info="kisanai-chat-v1:<user_id>").
  Leaking one derived key does not expose other users' chats.
* Every message uses a fresh random 96-bit nonce.
* GCM also authenticates: a tampered, truncated, or moved row fails to decrypt.
  The user id and message role are bound in as "associated data", so a row cannot
  be copied to another user's history or relabelled user<->assistant.
* Stored format: urlsafe-base64( version(1 byte) | nonce(12) | ciphertext+tag ).
  The version byte leaves room for key rotation later.

This is encryption AT REST on the server. It is not end-to-end encryption: the
LLM runs on the server, so the server must see the plaintext to answer.
"""
from __future__ import annotations

import base64
import binascii
import logging
import os
from functools import lru_cache

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.config import settings

log = logging.getLogger("kisanai.crypto")

_VERSION = b"\x01"
_NONCE_LEN = 12


class ChatCryptoError(Exception):
    """Encryption is not configured, or a stored message cannot be decrypted."""


@lru_cache(maxsize=4)
def _master_key(raw: str) -> bytes:
    if not raw:
        raise ChatCryptoError(
            "CHAT_ENCRYPTION_KEY is not set. Generate one with: "
            'python -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"'
        )
    try:
        key = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as e:
        raise ChatCryptoError("CHAT_ENCRYPTION_KEY is not valid base64.") from e
    if len(key) != 32:
        raise ChatCryptoError(f"CHAT_ENCRYPTION_KEY must decode to 32 bytes, got {len(key)}.")
    return key


@lru_cache(maxsize=2048)
def _user_key(master: bytes, user_id: int) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(), length=32, salt=None,
        info=f"kisanai-chat-v1:{user_id}".encode(),
    ).derive(master)


def _aad(user_id: int, role: str) -> bytes:
    return f"user:{user_id}|role:{role}".encode()


def check_configured() -> bool:
    """Call at startup. Logs a clear error instead of failing later in a request."""
    try:
        _master_key(settings.CHAT_ENCRYPTION_KEY)
        return True
    except ChatCryptoError as e:
        log.error("Chat history is DISABLED: %s", e)
        return False


def encrypt_text(user_id: int, role: str, plaintext: str) -> str:
    key = _user_key(_master_key(settings.CHAT_ENCRYPTION_KEY), user_id)
    nonce = os.urandom(_NONCE_LEN)
    ct = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), _aad(user_id, role))
    return base64.urlsafe_b64encode(_VERSION + nonce + ct).decode("ascii")


def decrypt_text(user_id: int, role: str, token: str) -> str:
    key = _user_key(_master_key(settings.CHAT_ENCRYPTION_KEY), user_id)
    try:
        blob = base64.urlsafe_b64decode(token.encode("ascii"))
        if blob[:1] != _VERSION or len(blob) < 1 + _NONCE_LEN + 16:
            raise ChatCryptoError("Unknown or truncated message format.")
        nonce, ct = blob[1:1 + _NONCE_LEN], blob[1 + _NONCE_LEN:]
        return AESGCM(key).decrypt(nonce, ct, _aad(user_id, role)).decode("utf-8")
    except InvalidTag as e:
        raise ChatCryptoError("Message failed authentication (wrong key or tampered data).") from e
    except (binascii.Error, ValueError, UnicodeError) as e:
        raise ChatCryptoError("Stored message is corrupt.") from e
