import json
import base64
import hashlib
from datetime import datetime, timezone
import httpx
from typing import AsyncGenerator, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from cryptography.fernet import Fernet
import uuid

from config import settings
from models.models import ApiKey, LlmCallLog

# Ensure SECRET_KEY is 32 url-safe base64 bytes for Fernet
_secret = settings.SECRET_KEY.encode('utf-8')
_fernet_key = base64.urlsafe_b64encode(hashlib.sha256(_secret).digest())
fernet = Fernet(_fernet_key)

class AllKeysExhaustedException(Exception):
    pass

class APIManager:
    def __init__(self):
        # provider -> round-robin index
        self.round_robin_indices: Dict[str, int] = {}

    async def add_key(self, db: AsyncSession, provider: str, api_key: str, alias: str) -> ApiKey:
        encrypted_key = fernet.encrypt(api_key.encode('utf-8')).decode('utf-8')
        new_key = ApiKey(
            id=str(uuid.uuid4()),
            key_value=encrypted_key,
            alias=alias,
            provider=provider,
            is_active=1,
            calls_today=0,
            tokens_today=0,
            created_at=datetime.utcnow()
        )
        db.add(new_key)
        await db.commit()
        await db.refresh(new_key)
        return new_key

    async def remove_key(self, db: AsyncSession, key_id: str) -> bool:
        result = await db.execute(select(ApiKey).filter(ApiKey.id == key_id))
        key = result.scalar_one_or_none()
        if key:
            await db.delete(key)
            await db.commit()
            return True
        return False

    async def get_active_key(self, db: AsyncSession, provider: str) -> Optional[ApiKey]:
        if provider == "ollama":
            return None # Ollama doesn't need a key

        result = await db.execute(
            select(ApiKey).filter(ApiKey.provider == provider, ApiKey.is_active == 1)
        )
        keys = result.scalars().all()

        now = datetime.utcnow()
        # Filter out rate-limited keys
        available_keys = []
        for k in keys:
            if k.rate_limit_reset_at and k.rate_limit_reset_at > now:
                continue
            available_keys.append(k)

        if not available_keys:
            return None

        idx = self.round_robin_indices.get(provider, 0)
        idx = idx % len(available_keys)
        selected_key = available_keys[idx]

        # Advance index
        self.round_robin_indices[provider] = (idx + 1) % len(available_keys)
        return selected_key

    async def mark_key_rate_limited(self, db: AsyncSession, key_id: str, reset_at: datetime):
        result = await db.execute(select(ApiKey).filter(ApiKey.id == key_id))
        key = result.scalar_one_or_none()
        if key:
            key.rate_limit_reset_at = reset_at
            await db.commit()

    async def call_llm(
        self,
        db: AsyncSession,
        provider: str,
        model: str,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = True,
        agent_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        if system_prompt:
            messages = [{"role": "system", "content": system_prompt}] + messages

        consecutive_failures = 0
        max_failures = 3

        while consecutive_failures < max_failures:
            api_key_obj = await self.get_active_key(db, provider)

            if provider != "ollama" and not api_key_obj:
                raise AllKeysExhaustedException(f"No active keys available for {provider}")

            api_key_str = fernet.decrypt(api_key_obj.key_value.encode('utf-8')).decode('utf-8') if api_key_obj else None

            try:
                if provider in ["openai", "openrouter", "moonshot", "nvidia_nim", "minimax"]:
                    # OpenAI compatible
                    base_url = {
                        "openai": "https://api.openai.com/v1",
                        "openrouter": "https://openrouter.ai/api/v1",
                        "moonshot": "https://api.moonshot.cn/v1",
                        "nvidia_nim": "https://integrate.api.nvidia.com/v1",
                        "minimax": "https://api.minimax.chat/v1"
                    }.get(provider)

                    headers = {
                        "Authorization": f"Bearer {api_key_str}",
                        "Content-Type": "application/json"
                    }
                    if provider == "openrouter":
                        headers["HTTP-Referer"] = "http://localhost:8080"
                        headers["X-Title"] = "NeuralForge"

                    payload = {
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "stream": stream
                    }

                    start_time = datetime.now()
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            f"{base_url}/chat/completions",
                            headers=headers,
                            json=payload,
                            timeout=60.0
                        )

                        if response.status_code == 429:
                            consecutive_failures += 1
                            # Set reset time based on headers if possible, default to +1 min
                            reset_time = datetime.utcnow().timestamp() + 60
                            # OpenAI uses x-ratelimit-reset-requests etc but let's do simple +60s
                            await self.mark_key_rate_limited(db, api_key_obj.id, datetime.utcfromtimestamp(reset_time))
                            continue

                        response.raise_for_status()

                        latency = int((datetime.now() - start_time).total_seconds() * 1000)

                        # Logging call
                        log_entry = LlmCallLog(
                            id=str(uuid.uuid4()),
                            provider=provider,
                            model=model,
                            latency_ms=latency,
                            agent_id=agent_id,
                            timestamp=datetime.utcnow()
                        )
                        db.add(log_entry)

                        if api_key_obj:
                            api_key_obj.calls_today += 1

                        await db.commit()

                        if stream:
                            # Simulated stream yielding for simplicity; in real app we iterate lines
                            # Since we must yield strings:
                            async for line in response.aiter_lines():
                                if line.startswith("data: "):
                                    data_str = line[6:]
                                    if data_str == "[DONE]":
                                        break
                                    try:
                                        data = json.loads(data_str)
                                        if "choices" in data and len(data["choices"]) > 0:
                                            delta = data["choices"][0].get("delta", {})
                                            if "content" in delta:
                                                yield delta["content"]
                                    except json.JSONDecodeError:
                                        pass
                            return
                        else:
                            data = response.json()
                            content = data["choices"][0]["message"]["content"]
                            yield content
                            return

                elif provider == "anthropic":
                    headers = {
                        "x-api-key": api_key_str,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }

                    # Convert messages if needed, anthropic doesn't allow system in messages array
                    sys_prompt = ""
                    anthropic_messages = []
                    for m in messages:
                        if m["role"] == "system":
                            sys_prompt += m["content"] + "\n"
                        else:
                            anthropic_messages.append(m)

                    payload = {
                        "model": model,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "messages": anthropic_messages,
                        "stream": stream
                    }
                    if sys_prompt:
                        payload["system"] = sys_prompt.strip()

                    start_time = datetime.now()
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://api.anthropic.com/v1/messages",
                            headers=headers,
                            json=payload,
                            timeout=60.0
                        )

                        if response.status_code == 429:
                            consecutive_failures += 1
                            await self.mark_key_rate_limited(db, api_key_obj.id, datetime.utcfromtimestamp(datetime.utcnow().timestamp() + 60))
                            continue

                        response.raise_for_status()

                        latency = int((datetime.now() - start_time).total_seconds() * 1000)
                        log_entry = LlmCallLog(
                            id=str(uuid.uuid4()),
                            provider=provider,
                            model=model,
                            latency_ms=latency,
                            agent_id=agent_id,
                            timestamp=datetime.utcnow()
                        )
                        db.add(log_entry)

                        if api_key_obj:
                            api_key_obj.calls_today += 1
                        await db.commit()

                        if stream:
                            async for line in response.aiter_lines():
                                if line.startswith("data: "):
                                    try:
                                        data = json.loads(line[6:])
                                        if data.get("type") == "content_block_delta" and "delta" in data:
                                            yield data["delta"].get("text", "")
                                    except:
                                        pass
                            return
                        else:
                            data = response.json()
                            yield data["content"][0]["text"]
                            return

                elif provider == "ollama":
                    payload = {
                        "model": model,
                        "messages": messages,
                        "stream": stream,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    }
                    start_time = datetime.now()
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            f"{settings.OLLAMA_BASE_URL}/api/chat",
                            json=payload,
                            timeout=120.0
                        )
                        response.raise_for_status()

                        latency = int((datetime.now() - start_time).total_seconds() * 1000)
                        log_entry = LlmCallLog(
                            id=str(uuid.uuid4()),
                            provider=provider,
                            model=model,
                            latency_ms=latency,
                            agent_id=agent_id,
                            timestamp=datetime.utcnow()
                        )
                        db.add(log_entry)
                        await db.commit()

                        if stream:
                            async for line in response.aiter_lines():
                                try:
                                    data = json.loads(line)
                                    if "message" in data and "content" in data["message"]:
                                        yield data["message"]["content"]
                                except:
                                    pass
                            return
                        else:
                            data = response.json()
                            yield data["message"]["content"]
                            return

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    consecutive_failures += 1
                    if api_key_obj:
                        await self.mark_key_rate_limited(db, api_key_obj.id, datetime.utcfromtimestamp(datetime.utcnow().timestamp() + 60))
                else:
                    raise e
            except Exception as e:
                consecutive_failures += 1

        raise AllKeysExhaustedException("Exhausted all retries/keys")

    async def list_available_models(self, provider: str) -> list[dict]:
        if provider == "openrouter":
            async with httpx.AsyncClient() as client:
                r = await client.get("https://openrouter.ai/api/v1/models")
                r.raise_for_status()
                return [{"id": m["id"], "name": m.get("name", m["id"])} for m in r.json().get("data", [])]
        elif provider == "openai":
            # Can't list without a key typically, but we will return some hardcoded if not authenticated,
            # or try to fetch if we have an env key just for testing, but let's hardcode a few for now
            return [
                {"id": "gpt-4o", "name": "GPT-4o"},
                {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
                {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"}
            ]
        elif provider == "ollama":
            try:
                async with httpx.AsyncClient() as client:
                    r = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
                    r.raise_for_status()
                    return [{"id": m["name"], "name": m["name"]} for m in r.json().get("models", [])]
            except:
                return []
        elif provider == "anthropic":
            return [
                {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"}
            ]
        elif provider == "moonshot":
            return [
                {"id": "moonshot-v1-8k", "name": "Moonshot 8k"},
                {"id": "moonshot-v1-32k", "name": "Moonshot 32k"}
            ]
        elif provider == "minimax":
            return [
                {"id": "abab6.5s-chat", "name": "MiniMax abab6.5s"},
                {"id": "abab6.5-chat", "name": "MiniMax abab6.5"}
            ]
        elif provider == "nvidia_nim":
            return [
                {"id": "meta/llama3-70b-instruct", "name": "Llama 3 70B Instruct"},
                {"id": "mistralai/mixtral-8x22b-instruct-v0.1", "name": "Mixtral 8x22B"}
            ]
        return []

    async def get_usage_stats(self, db: AsyncSession, provider: Optional[str] = None) -> dict:
        stmt = select(
            LlmCallLog.provider,
            func.count(LlmCallLog.id).label("total_calls"),
            func.sum(LlmCallLog.tokens_in).label("total_tokens_in"),
            func.sum(LlmCallLog.tokens_out).label("total_tokens_out")
        )
        if provider:
            stmt = stmt.filter(LlmCallLog.provider == provider)
        stmt = stmt.group_by(LlmCallLog.provider)

        result = await db.execute(stmt)
        stats = {}
        for row in result:
            stats[row.provider] = {
                "calls": row.total_calls,
                "tokens_in": row.total_tokens_in or 0,
                "tokens_out": row.total_tokens_out or 0,
                "total_tokens": (row.total_tokens_in or 0) + (row.total_tokens_out or 0)
            }
        return stats

    async def test_key(self, provider: str, api_key: str) -> dict:
        try:
            headers = {"Content-Type": "application/json"}
            if provider in ["openai", "openrouter", "moonshot", "nvidia_nim", "minimax"]:
                headers["Authorization"] = f"Bearer {api_key}"
                base_url = {
                    "openai": "https://api.openai.com/v1",
                    "openrouter": "https://openrouter.ai/api/v1",
                    "moonshot": "https://api.moonshot.cn/v1",
                    "nvidia_nim": "https://integrate.api.nvidia.com/v1",
                    "minimax": "https://api.minimax.chat/v1"
                }.get(provider)
                # Just call models list to test auth
                async with httpx.AsyncClient() as client:
                    r = await client.get(f"{base_url}/models", headers=headers, timeout=10)
                    r.raise_for_status()
                    return {"success": True}
            elif provider == "anthropic":
                headers["x-api-key"] = api_key
                headers["anthropic-version"] = "2023-06-01"
                # Anthropic doesn't have a simple models endpoint, we make a cheap call or just test models if it exists
                # Let's just make a cheap invalid request to see if auth succeeds (e.g. 400 instead of 401)
                async with httpx.AsyncClient() as client:
                    r = await client.get("https://api.anthropic.com/v1/messages", headers=headers, timeout=10)
                    if r.status_code in [400, 404, 405]: # Auth succeeded but route/method/body wrong
                        return {"success": True}
                    r.raise_for_status()
            elif provider == "ollama":
                # no key needed, test url
                async with httpx.AsyncClient() as client:
                    r = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
                    r.raise_for_status()
                    return {"success": True}

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

api_manager = APIManager()
