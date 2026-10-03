"""Run from the project root:  python test_chat_history.py"""
import base64, json, os, sys, tempfile

DB = os.path.join(tempfile.mkdtemp(), "t.db")
os.environ["DATABASE_URL"] = f"sqlite:///{DB}"
os.environ["LLM_MODE"] = "mock"
KEY1 = base64.b64encode(os.urandom(32)).decode()
KEY2 = base64.b64encode(os.urandom(32)).decode()
os.environ["CHAT_ENCRYPTION_KEY"] = KEY1
sys.path.insert(0, ".")

from fastapi import FastAPI, Header
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.core import crypto
from app.db.database import Base
from app.db.session import engine, SessionLocal
import app.models  # registers all tables incl. chat_messages
from app.models.user import User
from app.models.chat_message import ChatMessage
from app.api.deps import get_current_user
from app.api.routes import farm_advisor

Base.metadata.create_all(bind=engine)
db = SessionLocal()
u1, u2 = User(mobile="111"), User(mobile="222")
db.add_all([u1, u2]); db.commit(); ids = {"1": u1.id, "2": u2.id}; db.close()

app = FastAPI(); app.include_router(farm_advisor.router, prefix="/fa")
def fake_user(x_user: str = Header("1")):
    s = SessionLocal(); u = s.get(User, ids[x_user]); s.expunge(u); s.close(); return u
app.dependency_overrides[get_current_user] = fake_user
c = TestClient(app)
H1, H2 = {"X-User": "1"}, {"X-User": "2"}
ok = lambda name: print(f"PASS  {name}")

# 1 crypto basics --------------------------------------------------------------
a = crypto.encrypt_text(1, "user", "hello kisan"); b = crypto.encrypt_text(1, "user", "hello kisan")
assert a != b and "hello" not in a; ok("same text encrypts differently each time (random nonce)")
assert crypto.decrypt_text(1, "user", a) == "hello kisan"; ok("round-trip decrypts")
for bad, why in [((2, "user", a), "other user"), ((1, "assistant", a), "other role")]:
    try: crypto.decrypt_text(*bad); raise SystemExit(f"FAIL {why}")
    except crypto.ChatCryptoError: pass
ok("cannot decrypt as another user or another role (AAD binding)")
flipped = base64.urlsafe_b64encode(bytearray(base64.urlsafe_b64decode(a))[:-1] + bytes([base64.urlsafe_b64decode(a)[-1] ^ 1])).decode()
try: crypto.decrypt_text(1, "user", flipped); raise SystemExit("FAIL tamper")
except crypto.ChatCryptoError: pass
ok("1 flipped bit is detected (GCM authentication)")
assert crypto._user_key(crypto._master_key(KEY1), 1) != crypto._user_key(crypto._master_key(KEY1), 2); ok("each user gets a different derived key")

# 2 /query saves both bubbles, encrypted ---------------------------------------
r = c.post("/fa/query", json={"query": "Should I irrigate my wheat today?"}, headers=H1); assert r.status_code == 200, r.text
h = c.get("/fa/history", headers=H1).json()
assert [m["role"] for m in h["messages"]] == ["user", "assistant"]
assert h["messages"][0]["text"] == "Should I irrigate my wheat today?"
assert h["messages"][1]["advice"]["recommendation"].startswith("Wait until tomorrow"); ok("/query -> question + answer saved and returned oldest-first")
raw = SessionLocal().execute(text("select content_enc from chat_messages")).scalars().all()
assert raw and all("irrigate" not in x.lower() and "wheat" not in x.lower() for x in raw)
dump = open(DB, "rb").read(); assert b"irrigate my wheat" not in dump and b"Wait until tomorrow" not in dump
ok("database file contains no readable chat text (checked raw rows and the file bytes)")

# 3 /stream -------------------------------------------------------------------
r = c.post("/fa/stream", json={"query": "How to fertilize?"}, headers=H1); assert "event: result" in r.text
h = c.get("/fa/history", headers=H1).json(); assert len(h["messages"]) == 4; ok("/stream -> both bubbles saved too")

# 4 isolation ------------------------------------------------------------------
assert c.get("/fa/history", headers=H2).json()["messages"] == []; ok("user 2 sees none of user 1's chat")
mid = h["messages"][0]["id"]
assert c.delete(f"/fa/history/{mid}", headers=H2).status_code == 404; ok("user 2 cannot delete user 1's message")
s = SessionLocal(); row = s.get(ChatMessage, mid); row.user_id = ids["2"]; s.commit(); s.close()
h2 = c.get("/fa/history", headers=H2).json()["messages"]
assert len(h2) == 1 and h2[0]["unreadable"] and h2[0]["text"] is None; ok("a row moved to another user is unreadable, not leaked")
s = SessionLocal(); s.get(ChatMessage, mid).user_id = ids["1"]; s.commit(); s.close()

# 5 pagination ----------------------------------------------------------------
s = SessionLocal()
for i in range(120): crypto_tok = crypto.encrypt_text(ids["1"], "user", json.dumps({"text": f"m{i}"})); s.add(ChatMessage(user_id=ids["1"], role="user", content_enc=crypto_tok))
s.commit(); s.close()
p1 = c.get("/fa/history?limit=50", headers=H1).json()
assert len(p1["messages"]) == 50 and p1["has_more"] and p1["messages"][-1]["text"] == "m119"
p2 = c.get(f"/fa/history?limit=50&before_id={p1['next_before_id']}", headers=H1).json()
assert p2["messages"][-1]["id"] < p1["messages"][0]["id"]; ok("pagination: newest 50, then scroll-up for older ones, no overlap")

# 6 wrong / missing key ------------------------------------------------------------
settings.CHAT_ENCRYPTION_KEY = KEY2
h = c.get("/fa/history?limit=5", headers=H1); assert h.status_code == 200 and all(m["unreadable"] for m in h.json()["messages"])
ok("wrong key: history endpoint stays up and marks messages unreadable")
settings.CHAT_ENCRYPTION_KEY = ""
assert c.get("/fa/history", headers=H1).status_code == 200  # rows exist but each decrypt fails -> unreadable
r = c.post("/fa/query", json={"query": "irrigate?"}, headers=H1); assert r.status_code == 200 and r.json()["recommendation"]
ok("no key configured: the farmer still gets their answer (saving fails safely, error is logged)")
assert crypto.check_configured() is False; ok("check_configured() reports the problem at startup")
settings.CHAT_ENCRYPTION_KEY = KEY1

# 7 delete --------------------------------------------------------------------
n = c.delete("/fa/history", headers=H1).json()["deleted"]; assert n > 100
assert c.get("/fa/history", headers=H1).json()["messages"] == []; ok(f"clear chat deletes {n} messages")
print("\nALL TESTS PASSED")
